import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { createCoupon, listCoupons } from "@/lib/db-coupons"

const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, "Solo letras, números, guiones"),
  description: z.string().trim().max(200).optional().nullable(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().finite().positive(),
  min_order_amount: z.number().finite().nonnegative().optional().default(0),
  max_discount_amount: z.number().finite().positive().optional().nullable(),
  max_uses: z.number().int().positive().optional().nullable(),
  valid_until: z.string().trim().optional().nullable(),
})

// GET - Listar cupones (admin)
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const coupons = await listCoupons()
    return NextResponse.json(coupons)
  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo cupones" }, { status: 500 })
  }
}

// POST - Crear cupón (admin)
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = createCouponSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de cupón inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (parsed.data.discount_type === "percentage" && parsed.data.discount_value > 100) {
      return NextResponse.json({ error: "El porcentaje no puede superar 100" }, { status: 400 })
    }

    const coupon = await createCoupon(parsed.data)
    return NextResponse.json(coupon, { status: 201 })
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException & { code?: string }
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Ya existe un cupón con ese código" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error creando el cupón" }, { status: 500 })
  }
}
