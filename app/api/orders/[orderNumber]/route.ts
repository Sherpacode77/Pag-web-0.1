import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession, getAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { deleteOrder, setOrderStatus, type OrderStatus } from "@/lib/db-orders"

const ESTADOS: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]

const patchSchema = z.object({
  status: z.enum(ESTADOS as [OrderStatus, ...OrderStatus[]]),
})

// Número de pedido con el formato que genera randomOrderNumber: CO-2026-123456.
// Se valida antes de tocar la base para no pasar texto arbitrario a la consulta.
const ORDER_NUMBER_RE = /^CO-\d{4}-[A-Za-z0-9]{1,12}$/

// PATCH - Cambiar el estado de un pedido a mano desde el panel (solo admin).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const { orderNumber } = await params
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json({ error: "Número de pedido inválido" }, { status: 400 })
  }

  try {
    const parsed = patchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Estado inválido. Valores permitidos: ${ESTADOS.join(", ")}` },
        { status: 400 }
      )
    }

    const session = getAdminSession(request)
    const order = await setOrderStatus(
      orderNumber,
      parsed.data.status,
      session?.username ?? "admin"
    )

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error(`PATCH /api/orders/${orderNumber}:`, error)
    return NextResponse.json({ error: "Error actualizando el pedido" }, { status: 500 })
  }
}

// DELETE - Borrado definitivo. Pensado para limpiar pedidos de prueba; los
// pedidos reales conviene marcarlos "cancelled" con PATCH para no perder el
// historial.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const { orderNumber } = await params
  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json({ error: "Número de pedido inválido" }, { status: 400 })
  }

  try {
    const deleted = await deleteOrder(orderNumber)
    if (!deleted) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }
    return NextResponse.json({ deleted: true, order_number: orderNumber })
  } catch (error) {
    console.error(`DELETE /api/orders/${orderNumber}:`, error)
    return NextResponse.json({ error: "Error eliminando el pedido" }, { status: 500 })
  }
}
