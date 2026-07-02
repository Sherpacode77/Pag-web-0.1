import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import { deleteAliasById, isDbInventoryEnabled } from "@/lib/db-inventory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// DELETE /api/inventory/[sku]/aliases/[aliasId]  [admin]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string; aliasId: string }> }
) {
  if (!isDbInventoryEnabled()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  try {
    const { aliasId } = await params
    const id = Number(aliasId)
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "aliasId inválido" }, { status: 400 })
    }

    const deleted = await deleteAliasById(id)
    if (!deleted) {
      return NextResponse.json({ error: "Alias no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("DELETE /api/inventory/[sku]/aliases/[aliasId]:", error)
    return NextResponse.json({ error: "Error al eliminar alias" }, { status: 500 })
  }
}
