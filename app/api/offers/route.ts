import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { createOffer, listOffers } from "@/lib/db-offers"

const offerProductEntrySchema = z.object({
  productId: z.string().trim().min(1),
  variantColors: z.array(z.string()).default([]),
  quantity: z.number().int().positive().max(20).optional(),
})

const createOfferSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional().nullable(),
    offer_type: z.enum(["single", "bundle"]),
    discount_type: z.enum(["percentage", "free_shipping"]),
    discount_value: z.number().finite().min(1).max(99).optional().nullable(),
    cover_image: z.string().trim().max(500).optional().nullable(),
    products: z.array(offerProductEntrySchema).min(1).max(20),
    valid_until: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_type === "percentage" && !data.discount_value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El descuento por porcentaje requiere un valor entre 1 y 99",
        path: ["discount_value"],
      })
    }
    if (data.offer_type === "bundle") {
      if (data.products.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Un combo requiere al menos 2 productos",
          path: ["products"],
        })
      }
      if (!data.cover_image) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Un combo requiere una imagen de portada personalizada",
          path: ["cover_image"],
        })
      }
    }
  })

// GET - Listar ofertas, activas e inactivas (admin)
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const offers = await listOffers()
    return NextResponse.json(offers)
  } catch (error) {
    return NextResponse.json({ error: "Error obteniendo ofertas" }, { status: 500 })
  }
}

// POST - Crear oferta (admin)
export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = createOfferSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de oferta inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const offer = await createOffer(parsed.data)
    return NextResponse.json(offer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Error creando la oferta" }, { status: 500 })
  }
}
