import { getDbPool } from "@/lib/db"
import type { OrderWithItems } from "@/lib/db-orders"
import { getCustomerHistory } from "@/lib/db-orders"
import { getSkuForProductVariant } from "@/lib/db-inventory"
import { appendRowsToLeadsSheet, type SheetRow } from "@/lib/google-sheets"

function formatBogota(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {})

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`
}

async function getNextSaleNumber(): Promise<number> {
  const pool = getDbPool()
  const [rows] = await pool.execute<import("mysql2/promise").RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM app_orders WHERE status = 'paid'`
  )
  return Number(rows[0]?.total ?? 1)
}

// Se llama una sola vez por pedido, justo cuando el webhook de MercadoPago
// confirma el pago (ver app/api/payments/mercadopago/webhook/route.ts) --
// crea una fila por cada producto del pedido en la hoja "Lista de clientes"
// para que el equipo de alistamiento arranque la gestion manual del envio.
export async function syncOrderToLeadsSheet(order: OrderWithItems): Promise<void> {
  const [history, saleNumber] = await Promise.all([
    order.customer_email ? getCustomerHistory(order.customer_email, order.id) : null,
    getNextSaleNumber(),
  ])

  const now = new Date()
  const contactDate = history?.firstContactAt ? formatBogota(history.firstContactAt) : formatBogota(now)
  const purchaseDate = formatBogota(now)
  const isReturning = history?.isReturning ?? false

  const addr = order.shipping_address
  const isPickup = addr?.delivery_method === "retiro"
  const city = isPickup ? "" : addr?.city ?? ""
  const department = isPickup ? "" : addr?.department ?? ""
  const direction = isPickup ? "Retiro en tienda" : addr?.address_line ?? ""
  const note = [addr?.apartment, addr?.neighborhood].filter(Boolean).join(", ")

  const rows: SheetRow[] = []

  for (const item of order.items) {
    const sku = await getSkuForProductVariant(
      item.product_id,
      item.variant_color ?? null,
      item.variant_size ?? null
    )

    rows.push([
      "WEB",
      saleNumber,
      order.customer_name ?? "",
      contactDate,
      purchaseDate,
      order.customer_phone ?? "",
      city,
      department,
      direction,
      note,
      order.customer_email ?? "",
      item.quantity,
      sku ?? item.product_name,
      item.variant_color_name ?? "",
      order.shipping_cost,
      order.total,
      order.ad_campaign ?? "ORGANICO",
      "Mercado Pago",
      isReturning ? "Cliente Antiguo" : "",
    ])
  }

  await appendRowsToLeadsSheet(rows)
}
