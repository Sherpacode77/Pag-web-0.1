import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise"
import { ensureDbSchema, getDbPool, withTransaction } from "@/lib/db"

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

export type OrderItemInput = {
  product_id: string
  product_name: string
  product_slug?: string | null
  variant_color?: string | null
  variant_color_name?: string | null
  variant_size?: string | null
  variant_size_name?: string | null
  unit_price: number
  quantity: number
}

export type ShippingAddress = {
  delivery_method: "envio" | "retiro"
  address_line?: string | null
  apartment?: string | null
  city?: string | null
  department?: string | null
  postal_code?: string | null
  country?: string | null
}

export type CreateOrderInput = {
  items: OrderItemInput[]
  subtotal: number
  shipping_cost?: number
  discount?: number
  total: number
  customer_email: string
  customer_name: string
  customer_phone: string
  customer_document?: string | null
  shipping_address?: ShippingAddress | null
  notes?: string | null
}

export type OrderItemRow = OrderItemInput & {
  id: number
  order_id: number
  subtotal: number
  created_at: string
}

export type OrderRow = {
  id: number
  order_number: string
  customer_id: number | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_document: string | null
  shipping_address: ShippingAddress | null
  status: OrderStatus
  payment_method: string | null
  payment_reference: string | null
  mercadopago_id: string | null
  mercadopago_status: string | null
  subtotal: number
  shipping_cost: number
  discount: number
  total: number
  currency: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type OrderWithItems = OrderRow & { items: OrderItemRow[] }

// SKU-style: código corto aleatorio, con reintento en colisión — mismo patrón
// que generateUniqueSku en lib/db-inventory.ts (no hay contador secuencial
// seguro bajo concurrencia sin una tabla de locks dedicada).
function randomOrderNumber(): string {
  const year = new Date().getFullYear()
  const digits = String(Math.floor(100000 + Math.random() * 900000))
  return `CO-${year}-${digits}`
}

async function isOrderNumberTaken(conn: PoolConnection, orderNumber: string): Promise<boolean> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT 1 FROM app_orders WHERE order_number = ? LIMIT 1`,
    [orderNumber]
  )
  return rows.length > 0
}

export async function createOrder(input: CreateOrderInput): Promise<{ id: number; order_number: string }> {
  await ensureDbSchema()

  return withTransaction(async (conn) => {
    let orderNumber = randomOrderNumber()
    let attempts = 0
    while (await isOrderNumberTaken(conn, orderNumber)) {
      if (++attempts > 20) throw new Error("No se pudo generar un número de pedido único")
      orderNumber = randomOrderNumber()
    }

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO app_orders
         (order_number, customer_email, customer_name, customer_phone, customer_document,
          shipping_address, status, subtotal, shipping_cost, discount, total, currency, notes,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 'COP', ?, NOW(), NOW())`,
      [
        orderNumber,
        input.customer_email,
        input.customer_name,
        input.customer_phone,
        input.customer_document ?? null,
        input.shipping_address ? JSON.stringify(input.shipping_address) : null,
        input.subtotal,
        input.shipping_cost ?? 0,
        input.discount ?? 0,
        input.total,
        input.notes ?? null,
      ]
    )

    const orderId = result.insertId

    for (const item of input.items) {
      const subtotal = item.unit_price * item.quantity
      await conn.execute(
        `INSERT INTO app_order_items
           (order_id, product_id, product_name, product_slug, variant_color, variant_color_name,
            variant_size, variant_size_name, unit_price, quantity, subtotal, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          item.product_id,
          item.product_name,
          item.product_slug ?? null,
          item.variant_color ?? null,
          item.variant_color_name ?? null,
          item.variant_size ?? null,
          item.variant_size_name ?? null,
          item.unit_price,
          item.quantity,
          subtotal,
        ]
      )
    }

    await conn.execute(
      `INSERT INTO app_order_status_history (order_id, order_number, from_status, to_status, changed_by, created_at)
       VALUES (?, ?, NULL, 'pending', 'system', NOW())`,
      [orderId, orderNumber]
    )

    return { id: orderId, order_number: orderNumber }
  })
}

function parseOrderRow(row: RowDataPacket): OrderRow {
  const shippingAddress = row.shipping_address
  return {
    ...(row as OrderRow),
    shipping_address:
      typeof shippingAddress === "string" ? JSON.parse(shippingAddress) : shippingAddress,
  }
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_orders WHERE order_number = ? LIMIT 1`,
    [orderNumber]
  )

  return rows[0] ? parseOrderRow(rows[0]) : null
}

export type UpdateOrderPaymentInput = {
  status: OrderStatus
  mercadopago_id?: string | null
  mercadopago_status?: string | null
  payment_method?: string | null
  customer_email?: string | null
  customer_name?: string | null
  customer_phone?: string | null
}

export async function updateOrderPaymentStatus(
  orderNumber: string,
  data: UpdateOrderPaymentInput
): Promise<OrderRow | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const order = await getOrderByNumber(orderNumber)
  if (!order) return null

  const setClauses: string[] = ["status = ?", "updated_at = NOW()"]
  const params: (string | null)[] = [data.status]

  if (data.mercadopago_id !== undefined) {
    setClauses.push("mercadopago_id = ?")
    params.push(data.mercadopago_id)
  }
  if (data.mercadopago_status !== undefined) {
    setClauses.push("mercadopago_status = ?")
    params.push(data.mercadopago_status)
  }
  if (data.payment_method !== undefined) {
    setClauses.push("payment_method = ?")
    params.push(data.payment_method)
  }
  // Solo completa datos de contacto si aún no los teníamos — no pisar info real
  // con lo que reporte MercadoPago si ya se conocía de antes.
  if (data.customer_email && !order.customer_email) {
    setClauses.push("customer_email = ?")
    params.push(data.customer_email)
  }
  if (data.customer_name && !order.customer_name) {
    setClauses.push("customer_name = ?")
    params.push(data.customer_name)
  }
  if (data.customer_phone && !order.customer_phone) {
    setClauses.push("customer_phone = ?")
    params.push(data.customer_phone)
  }

  params.push(orderNumber)

  await pool.execute(`UPDATE app_orders SET ${setClauses.join(", ")} WHERE order_number = ?`, params)

  if (order.status !== data.status) {
    await pool.execute(
      `INSERT INTO app_order_status_history (order_id, order_number, from_status, to_status, changed_by, created_at)
       VALUES (?, ?, ?, ?, 'mercadopago_webhook', NOW())`,
      [order.id, orderNumber, order.status, data.status]
    )
  }

  return getOrderByNumber(orderNumber)
}

export async function listOrdersWithItems(limit = 200): Promise<OrderWithItems[]> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [orders] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_orders ORDER BY created_at DESC LIMIT ?`,
    [limit]
  )

  if (orders.length === 0) return []

  const orderIds = orders.map((o) => o.id)
  const placeholders = orderIds.map(() => "?").join(",")

  const [items] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
    orderIds
  )

  const itemsByOrder = new Map<number, OrderItemRow[]>()
  for (const item of items as OrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? []
    list.push(item)
    itemsByOrder.set(item.order_id, list)
  }

  return orders.map((order) => ({
    ...parseOrderRow(order),
    items: itemsByOrder.get(order.id) ?? [],
  }))
}
