import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { setCouponActive, updateCoupon, deleteCoupon } from "@/lib/db-coupons"

// Acepta tanto el toggle suelto de activar/desactivar como una edicion completa.
// Todo es opcional: solo se escriben las columnas que vengan en el cuerpo.
const patchSchema = z
  .object({
    description: z.string().trim().max(200).nullable().optional(),
    discount_type: z.enum(["percentage", "fixed"]).optional(),
    discount_value: z.number().finite().positive().optional(),
    min_order_amount: z.number().finite().nonnegative().optional(),
    max_discount_amount: z.number().finite().positive().nullable().optional(),
    max_uses: z.number().int().positive().nullable().optional(),
    valid_until: z.string().trim().nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No se envió ningún campo para actualizar",
  })

// PATCH - Editar cupón o activar/desactivarlo (admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const { id } = await params
  const couponId = Number(id)
  if (!Number.isInteger(couponId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    const fields = parsed.data

    if (fields.discount_type === "percentage" && (fields.discount_value ?? 0) > 100) {
      return NextResponse.json({ error: "El porcentaje no puede superar 100" }, { status: 400 })
    }

    // El caso de solo activar/desactivar conserva su ruta dedicada.
    const soloActivo = Object.keys(fields).length === 1 && fields.is_active !== undefined
    const updated = soloActivo
      ? await setCouponActive(couponId, fields.is_active as boolean)
      : await updateCoupon(couponId, fields)

    if (!updated) {
      return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error actualizando el cupón" }, { status: 500 })
  }
}

// DELETE - Eliminar cupón (admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const { id } = await params
  const couponId = Number(id)
  if (!Number.isInteger(couponId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const deleted = await deleteCoupon(couponId)
    if (!deleted) {
      return NextResponse.json({ error: "Cupón no encontrado" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error eliminando el cupón" }, { status: 500 })
  }
}
