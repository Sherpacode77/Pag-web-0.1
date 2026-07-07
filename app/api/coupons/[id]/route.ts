import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { setCouponActive, deleteCoupon } from "@/lib/db-coupons"

const patchSchema = z.object({
  is_active: z.boolean(),
})

// PATCH - Activar/desactivar cupón (admin)
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

    const updated = await setCouponActive(couponId, parsed.data.is_active)
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
