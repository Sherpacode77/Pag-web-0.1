import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { setOfferActive, updateOffer, deleteOffer } from "@/lib/db-offers"

const offerProductEntrySchema = z.object({
  productId: z.string().trim().min(1),
  variantColors: z.array(z.string()).default([]),
  quantity: z.number().int().positive().max(20).optional(),
})

const patchSchema = z.object({
  is_active: z.boolean().optional(),
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  discount_type: z.enum(["percentage", "free_shipping"]).optional(),
  discount_value: z.number().finite().min(1).max(99).optional().nullable(),
  cover_image: z.string().trim().max(500).optional().nullable(),
  products: z.array(offerProductEntrySchema).min(1).max(20).optional(),
  valid_until: z.string().trim().optional().nullable(),
})

function parseId(id: string): number | null {
  const offerId = Number(id)
  return Number.isInteger(offerId) ? offerId : null
}

// PATCH - Editar oferta o activar/desactivar (admin)
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
  const offerId = parseId(id)
  if (offerId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    // Caso simple: solo activar/desactivar
    if (Object.keys(parsed.data).length === 1 && parsed.data.is_active !== undefined) {
      const updated = await setOfferActive(offerId, parsed.data.is_active)
      if (!updated) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    const offer = await updateOffer(offerId, parsed.data)
    if (!offer) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 })
    return NextResponse.json(offer)
  } catch (error) {
    return NextResponse.json({ error: "Error actualizando la oferta" }, { status: 500 })
  }
}

// DELETE - Eliminar oferta (admin)
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
  const offerId = parseId(id)
  if (offerId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 })
  }

  try {
    const deleted = await deleteOffer(offerId)
    if (!deleted) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Error eliminando la oferta" }, { status: 500 })
  }
}
