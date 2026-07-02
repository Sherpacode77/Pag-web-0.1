import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { addAliasToSku, isDbInventoryEnabled } from "@/lib/db-inventory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeSku(raw: string) {
  return raw.toUpperCase()
}

const createAliasSchema = z.object({
  alias_sku: z.string().trim().min(1).max(100),
  source: z.string().trim().min(1).max(100).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
})

// POST /api/inventory/[sku]/aliases  [admin]
// Vincula un SKU externo (proveedor/marketplace) a la fila de inventario del sku dado.
export async function POST(
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
    const parsed = createAliasSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await addAliasToSku(sku, parsed.data)

    if (result === "not_found") {
      return NextResponse.json({ error: "SKU no encontrado" }, { status: 404 })
    }
    if (result === "duplicate") {
      return NextResponse.json({ error: "Ese alias ya está registrado" }, { status: 409 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/inventory/[sku]/aliases:", error)
    return NextResponse.json({ error: "Error al agregar alias" }, { status: 500 })
  }
}
