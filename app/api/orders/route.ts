import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { createOrder, listOrdersWithItems } from "@/lib/db-orders"
import { subscribeToNewsletter } from "@/lib/db-newsletter"
import { validateCoupon, incrementCouponUsage } from "@/lib/db-coupons"
import { getActiveFreeShippingProductIds } from "@/lib/db-offers"
import { getWhatsAppReferralByCode } from "@/lib/db-whatsapp"
import { calculateShippingCost } from "@/lib/shipping"

const orderItemSchema = z.object({
  product_id: z.string().trim().min(1),
  product_name: z.string().trim().min(1).max(200),
  product_slug: z.string().trim().max(255).optional().nullable(),
  variant_color: z.string().trim().max(50).optional().nullable(),
  variant_color_name: z.string().trim().max(100).optional().nullable(),
  variant_size: z.string().trim().max(10).optional().nullable(),
  variant_size_name: z.string().trim().max(20).optional().nullable(),
  variant_design_name: z.string().trim().max(100).optional().nullable(),
  unit_price: z.number().finite().nonnegative(),
  original_unit_price: z.number().finite().nonnegative().optional(),
  quantity: z.number().int().positive().max(100),
})

const shippingAddressSchema = z.object({
  delivery_method: z.enum(["envio", "retiro"]),
  address_line: z.string().trim().max(400).optional().nullable(),
  apartment: z.string().trim().max(100).optional().nullable(),
  neighborhood: z.string().trim().max(150).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  department: z.string().trim().max(100).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(50).optional().default("Colombia"),
})

const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1).max(50),
    customer_email: z.string().trim().email().max(255),
    customer_name: z.string().trim().min(1).max(200),
    customer_phone: z.string().trim().min(1).max(30),
    customer_document: z.string().trim().min(1).max(50),
    shipping_address: shippingAddressSchema,
    newsletter_opt_in: z.boolean().optional().default(false),
    coupon_code: z.string().trim().max(30).optional().nullable(),
    referral_code: z.string().trim().max(10).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.shipping_address.delivery_method === "envio") {
      if (!data.shipping_address.address_line) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La dirección es obligatoria para envío a domicilio",
          path: ["shipping_address", "address_line"],
        })
      }
      if (!data.shipping_address.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La ciudad es obligatoria para envío a domicilio",
          path: ["shipping_address", "city"],
        })
      }
    }
  })

// POST - Crear pedido pendiente (lo llama el carrito antes de ir a MercadoPago).
// Subtotal, costo de envío y descuento se calculan SIEMPRE en el servidor —
// nunca se confía en montos que pudiera enviar el cliente.
export async function POST(request: NextRequest) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de pedido inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { newsletter_opt_in, coupon_code, referral_code, ...orderInput } = parsed.data

    let ad_campaign: string | null = null
    if (referral_code) {
      const referral = await getWhatsAppReferralByCode(referral_code)
      ad_campaign = referral?.utm_campaign ?? referral?.utm_source ?? null
    }

    const subtotal = orderInput.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    )
    // Subtotal "de lista" antes de cualquier oferta activa de producto —
    // se usa solo para topar el descuento combinado (oferta + cupón), nunca
    // para el subtotal real del pedido.
    const originalSubtotal = orderInput.items.reduce(
      (sum, item) => sum + (item.original_unit_price ?? item.unit_price) * item.quantity,
      0
    )
    const offerDiscountAmount = Math.max(0, originalSubtotal - subtotal)

    const freeShippingProductIds = await getActiveFreeShippingProductIds()
    const freeShippingOverride = orderInput.items.some((item) => freeShippingProductIds.has(item.product_id))
    const shipping_cost = calculateShippingCost(
      subtotal,
      orderInput.shipping_address.delivery_method,
      freeShippingOverride
    )

    let discount = 0
    let appliedCouponId: number | null = null

    if (coupon_code) {
      const result = await validateCoupon(coupon_code, subtotal)
      if (!result.valid) {
        return NextResponse.json({ error: result.reason }, { status: 400 })
      }
      discount = result.discountAmount
      appliedCouponId = result.coupon.id
    }

    // Tope de protección de margen: ningún cupón, combinado con una oferta de
    // producto ya aplicada, puede superar el 30% de descuento total sobre el
    // precio de lista. Solo entra en juego cuando SÍ hay oferta de por medio
    // (offerDiscountAmount > 0) -- un cupón usado solo, sin ninguna oferta
    // activa, respeta su valor tal cual (ej. un cupón manual de 40% sin
    // ofertas no se topa). Se reduce el cupón (nunca la oferta) para que el
    // combinado quede exactamente en el tope, sin bloquear la compra.
    const MAX_COMBINED_DISCOUNT_PCT = 0.3
    const maxCombinedDiscount = originalSubtotal * MAX_COMBINED_DISCOUNT_PCT
    if (offerDiscountAmount > 0 && offerDiscountAmount + discount > maxCombinedDiscount) {
      discount = Math.max(0, Math.round(maxCombinedDiscount - offerDiscountAmount))
    }

    const total = subtotal - discount + shipping_cost

    const order = await createOrder({ ...orderInput, subtotal, shipping_cost, discount, total, ad_campaign })

    if (appliedCouponId !== null) {
      try {
        await incrementCouponUsage(appliedCouponId)
      } catch (err) {
        console.error("POST /api/orders: fallo incrementando uso de cupón", err)
      }
    }

    if (newsletter_opt_in) {
      try {
        await subscribeToNewsletter(parsed.data.customer_email, parsed.data.customer_name)
      } catch (err) {
        console.error("POST /api/orders: fallo suscribiendo al newsletter", err)
      }
    }

    return NextResponse.json({ ...order, subtotal, shipping_cost, discount, total }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Error creando el pedido" }, { status: 500 })
  }
}

// GET - Listar pedidos (solo admin)
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const orders = await listOrdersWithItems()
    return NextResponse.json(orders)
  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo pedidos" }, { status: 500 })
  }
}
