import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import {
  getInventoryFromDb,
  createInventorySkuFromDb,
  isDbInventoryEnabled,
  type InventoryRow,
} from "@/lib/db-inventory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function stripCostPrice(row: InventoryRow) {
  const { cost_price: _c, ...rest } = row
  return rest
}

// GET /api/inventory
// Query params:
//   product_id      — filtrar por producto
//   low_stock=true  — solo variantes con stock ≤ umbral
//   available_only=true — solo variantes activas
// cost_price solo se incluye si la petición tiene sesión de admin válida.
export async function GET(request: NextRequest) {
  if (!isDbInventoryEnabled()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get("product_id") ?? undefined
    const low_stock = searchParams.get("low_stock") === "true"
    const available_only = searchParams.get("available_only") === "true"

    const rows = await getInventoryFromDb({ product_id, low_stock, available_only })

    const isAdmin = ensureAdminSession(request) === null
    const data = isAdmin ? rows : rows.map(stripCostPrice)

    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/inventory:", error)
    return NextResponse.json({ error: "Error al consultar inventario" }, { status: 500 })
  }
}

// POST /api/inventory  [admin]
// Crea un nuevo SKU de inventario.
const createSchema = z.object({
  sku: z
    .string()
    .trim()
    .length(7, "El SKU debe tener exactamente 7 caracteres")
    .regex(/^[A-Z0-9]{7}$/, "El SKU solo puede contener letras mayúsculas y dígitos"),
  product_id: z.string().trim().min(1),
  variant_color: z.string().trim().min(1).max(50).nullable().optional(),
  variant_color_name: z.string().trim().min(1).max(100).nullable().optional(),
  variant_size: z.enum(["S", "M", "L", "XL", "XXL"]).nullable().optional(),
  stock_quantity: z.number().int().nonnegative().default(0),
  low_stock_threshold: z.number().int().nonnegative().default(3),
  is_available: z.boolean().default(true),
  cost_price: z.number().finite().nonnegative().nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
})

export async function POST(request: NextRequest) {
  if (!isDbInventoryEnabled()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const created = await createInventorySkuFromDb(parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException & { code?: string }
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "El SKU ya existe o la combinación producto+color+talla ya está registrada" },
        { status: 409 }
      )
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { error: "El product_id no existe en la base de datos" },
        { status: 422 }
      )
    }
    console.error("POST /api/inventory:", error)
    return NextResponse.json({ error: "Error al crear SKU de inventario" }, { status: 500 })
  }
}
