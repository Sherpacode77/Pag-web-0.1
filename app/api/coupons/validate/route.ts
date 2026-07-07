import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hasDatabaseUrl } from "@/lib/db"
import { validateCoupon } from "@/lib/db-coupons"

const validateSchema = z.object({
  code: z.string().trim().min(1).max(30),
  subtotal: z.number().finite().nonnegative(),
})

// POST - Validar un código de descuento contra el subtotal actual del carrito.
// Solo para previsualización — el descuento real se recalcula en el servidor
// al crear el pedido (POST /api/orders), nunca se confía en el monto del cliente.
export async function POST(request: NextRequest) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ valid: false, reason: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = validateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ valid: false, reason: "Datos inválidos" }, { status: 400 })
    }

    const result = await validateCoupon(parsed.data.code, parsed.data.subtotal)
    if (!result.valid) {
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json({
      valid: true,
      discountAmount: result.discountAmount,
      code: result.coupon.code,
    })
  } catch (error) {
    return NextResponse.json({ valid: false, reason: "Error validando el cupón" }, { status: 500 })
  }
}
