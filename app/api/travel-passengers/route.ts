import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import {
  buildTravelStats,
  createTravelPassenger,
  deleteTravelPassenger,
  getTravelStats,
  listTravelPassengers,
} from "@/lib/db-travel"
import { TRAVEL_LISTS, type TravelListKey } from "@/lib/travel-services"

export const runtime = "nodejs"

const LIST_KEYS = TRAVEL_LISTS.map((l) => l.key) as [TravelListKey, ...TravelListKey[]]

const passengerSchema = z.object({
  listKeys: z.array(z.enum(LIST_KEYS)).min(1).max(4),
  serviceSku: z.string().trim().max(40).optional().nullable(),
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  pickupPoint: z.string().trim().max(200).optional().nullable(),
  deposit: z.number().finite().nonnegative().optional(),
  balance: z.number().finite().nonnegative().optional(),
  paymentChannel: z.string().trim().max(40).optional().nullable(),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  withBike: z.boolean().optional(),
  groupNumber: z.number().int().positive().max(9999).optional().nullable(),
  isGroupLeader: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    // Sin base de datos el catalogo igual se muestra, con los contadores en cero.
    return NextResponse.json({ passengers: [], stats: buildTravelStats(new Map(), new Map()) })
  }

  try {
    const [passengers, stats] = await Promise.all([listTravelPassengers(), getTravelStats()])
    return NextResponse.json({ passengers, stats })
  } catch (error) {
    console.error("GET /api/travel-passengers:", error)
    return NextResponse.json({ error: "Error obteniendo las listas de pasajeros" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const parsed = passengerSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
    }
    const { listKeys, ...data } = parsed.data

    // Un cupo de ida y regreso ocupa un puesto en cada lista, igual que los
    // pedidos de la web.
    const ids: number[] = []
    for (const listKey of listKeys) {
      ids.push(await createTravelPassenger({ ...data, listKey, source: "manual" }))
    }
    return NextResponse.json({ ids }, { status: 201 })
  } catch (error) {
    console.error("POST /api/travel-passengers:", error)
    return NextResponse.json({ error: "Error registrando el pasajero" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  const id = Number(request.nextUrl.searchParams.get("id"))
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 })
  }

  try {
    return NextResponse.json({ deleted: await deleteTravelPassenger(id) })
  } catch (error) {
    console.error("DELETE /api/travel-passengers:", error)
    return NextResponse.json({ error: "Error eliminando el pasajero" }, { status: 500 })
  }
}
