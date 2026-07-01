import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"
import { ensureDbSchema, getDbPool, hasDatabaseUrl } from "@/lib/db"

export function isDbInventoryEnabled() {
  return hasDatabaseUrl()
}

export type InventoryRow = {
  id: number
  sku: string
  product_id: string
  product_name: string | null
  product_slug: string | null
  variant_color: string | null
  variant_color_name: string | null
  variant_size: string | null
  stock_quantity: number
  low_stock_threshold: number
  is_available: boolean
  cost_price: number | null
  notes: string | null
  updated_at: string
}

export type InventoryFilters = {
  product_id?: string
  low_stock?: boolean
  available_only?: boolean
}

const SELECT_COLS = `
  i.id, i.sku, i.product_id,
  JSON_UNQUOTE(JSON_EXTRACT(p.payload, '$.name')) AS product_name,
  p.slug AS product_slug,
  i.variant_color, i.variant_color_name, i.variant_size,
  i.stock_quantity, i.low_stock_threshold,
  CASE WHEN i.is_available = 1 THEN TRUE ELSE FALSE END AS is_available,
  i.cost_price, i.notes,
  DATE_FORMAT(i.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
`

export async function getInventoryFromDb(filters: InventoryFilters = {}): Promise<InventoryRow[]> {
  await ensureDbSchema()
  const pool = getDbPool()

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters.product_id) {
    conditions.push("i.product_id = ?")
    params.push(filters.product_id)
  }
  if (filters.low_stock) {
    conditions.push("i.stock_quantity <= i.low_stock_threshold")
  }
  if (filters.available_only) {
    conditions.push("i.is_available = 1")
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${SELECT_COLS}
     FROM app_inventory i
     LEFT JOIN app_products p ON p.id = i.product_id
     ${where}
     ORDER BY i.product_id + 0, i.product_id, i.variant_color, i.variant_size`,
    params
  )

  return rows as InventoryRow[]
}

export async function getInventoryBySkuFromDb(sku: string): Promise<InventoryRow | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${SELECT_COLS}
     FROM app_inventory i
     LEFT JOIN app_products p ON p.id = i.product_id
     WHERE i.sku = ?
     LIMIT 1`,
    [sku]
  )

  return rows[0] ? (rows[0] as InventoryRow) : null
}

export type CreateInventoryInput = {
  sku: string
  product_id: string
  variant_color?: string | null
  variant_color_name?: string | null
  variant_size?: string | null
  stock_quantity?: number
  low_stock_threshold?: number
  is_available?: boolean
  cost_price?: number | null
  notes?: string | null
}

export async function createInventorySkuFromDb(input: CreateInventoryInput): Promise<InventoryRow> {
  await ensureDbSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO app_inventory
       (sku, product_id, variant_color, variant_color_name, variant_size,
        stock_quantity, low_stock_threshold, is_available, cost_price, notes,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      input.sku,
      input.product_id,
      input.variant_color ?? null,
      input.variant_color_name ?? null,
      input.variant_size ?? null,
      input.stock_quantity ?? 0,
      input.low_stock_threshold ?? 3,
      input.is_available !== false ? 1 : 0,
      input.cost_price ?? null,
      input.notes ?? null,
    ]
  )

  return (await getInventoryBySkuFromDb(input.sku))!
}

export type UpdateInventoryInput = {
  stock_quantity?: number
  adjust?: number
  low_stock_threshold?: number
  is_available?: boolean
  cost_price?: number | null
  notes?: string | null
}

export async function updateInventorySkuFromDb(
  sku: string,
  input: UpdateInventoryInput
): Promise<InventoryRow | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const setClauses: string[] = ["updated_at = NOW()"]
  const params: (string | number | null)[] = []

  if (input.adjust !== undefined) {
    // Ajuste atómico — nunca baja de 0
    setClauses.push("stock_quantity = GREATEST(0, stock_quantity + ?)")
    params.push(input.adjust)
  } else if (input.stock_quantity !== undefined) {
    setClauses.push("stock_quantity = ?")
    params.push(input.stock_quantity)
  }

  if (input.low_stock_threshold !== undefined) {
    setClauses.push("low_stock_threshold = ?")
    params.push(input.low_stock_threshold)
  }

  if (input.is_available !== undefined) {
    setClauses.push("is_available = ?")
    params.push(input.is_available ? 1 : 0)
  }

  if (input.cost_price !== undefined) {
    setClauses.push("cost_price = ?")
    params.push(input.cost_price)
  }

  if (input.notes !== undefined) {
    setClauses.push("notes = ?")
    params.push(input.notes)
  }

  // Si solo queda updated_at no hay nada real que cambiar — retornar fila actual
  if (setClauses.length === 1) {
    return getInventoryBySkuFromDb(sku)
  }

  params.push(sku)

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE app_inventory SET ${setClauses.join(", ")} WHERE sku = ?`,
    params
  )

  if (result.affectedRows === 0) return null

  return getInventoryBySkuFromDb(sku)
}

export async function deleteInventorySkuFromDb(sku: string): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM app_inventory WHERE sku = ?`,
    [sku]
  )

  return result.affectedRows > 0
}
