import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import {
  getInventoryBySkuFromDb,
  updateInventorySkuFromDb,
  deleteInventorySkuFromDb,
  isDbInventoryEnabled,
  type InventoryRow,
} from "@/lib/db-inventory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeSku(raw: string) {
  return raw.toUpperCase()
}

function stripCostPrice(row: InventoryRow) {
  const { cost_price: _c, ...rest } = row
  return rest
}

// GET /api/inventory/[sku]
// cost_price solo se incluye si la petición tiene sesión de admin válida.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  if (!isDbInventoryEnabled()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const { sku: rawSku } = await params
    const sku = normalizeSku(rawSku)
    const row = await getInventoryBySkuFromDb(sku)

    if (!row) {
      return NextResponse.json({ error: "SKU no encontrado" }, { status: 404 })
    }

    const isAdmin = ensureAdminSession(request) === null
    return NextResponse.json(isAdmin ? row : stripCostPrice(row))
  } catch (error) {
    console.error("GET /api/inventory/[sku]:", error)
    return NextResponse.json({ error: "Error al consultar inventario" }, { status: 500 })
  }
}

// PATCH /api/inventory/[sku]  [admin]
// Actualiza stock y/o configuración de una variante.
// Campos aceptados:
//   stock_quantity  — fija el stock en un valor absoluto (no negativo)
//   adjust          — suma/resta al stock actual (atómico, mín. 0)
//   low_stock_threshold — umbral de alerta de stock bajo
//   is_available    — activa o desactiva la variante
//   cost_price      — precio de costo para cálculo de margen
//   notes           — notas internas
//
// NOTA: stock_quantity y adjust son mutuamente excluyentes.
const patchSchema = z
  .object({
    stock_quantity: z.number().int().nonnegative().optional(),
    adjust: z.number().int().optional(),
    low_stock_threshold: z.number().int().nonnegative().optional(),
    is_available: z.boolean().optional(),
    cost_price: z.number().finite().nonnegative().nullable().optional(),
    notes: z.string().trim().max(300).nullable().optional(),
  })
  .refine(
    (d) => !(d.stock_quantity !== undefined && d.adjust !== undefined),
    { message: "Usa 'stock_quantity' o 'adjust', no ambos simultáneamente" }
  )

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  if (!isDbInventoryEnabled()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  try {
    const { sku: rawSku } = await params
    const sku = normalizeSku(rawSku)
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await updateInventorySkuFromDb(sku, parsed.data)

    if (!updated) {
      return NextResponse.json({ error: "SKU no encontrado" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/inventory/[sku]:", error)
    return NextResponse.json({ error: "Error al actualizar inventario" }, { status: 500 })
  }
}

// DELETE /api/inventory/[sku]  [admin]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  if (!isDbInventoryEnabled()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  try {
    const { sku: rawSku } = await params
    const sku = normalizeSku(rawSku)
    const deleted = await deleteInventorySkuFromDb(sku)

    if (!deleted) {
      return NextResponse.json({ error: "SKU no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, sku })
  } catch (error) {
    console.error("DELETE /api/inventory/[sku]:", error)
    return NextResponse.json({ error: "Error al eliminar SKU" }, { status: 500 })
  }
}
