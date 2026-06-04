import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"
import type { Product } from "@/lib/data"
import { ensureDbSchema, getDbPool, hasDatabaseUrl } from "@/lib/db"

export function isDbProductsEnabled() {
  return hasDatabaseUrl() && process.env.DB_PRODUCTS_ENABLED === "true"
}

function parsePayload(raw: unknown): Product {
  if (typeof raw === "string") return JSON.parse(raw) as Product
  return raw as Product
}

export async function readProductsFromDb(): Promise<Product[]> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT payload
     FROM app_products
     ORDER BY
       (REGEXP_REPLACE(id, '[^0-9]', '') = '') ASC,
       CAST(NULLIF(REGEXP_REPLACE(id, '[^0-9]', ''), '') AS UNSIGNED) ASC,
       id ASC`
  )

  return rows.map((row) => parsePayload(row.payload))
}

export async function getProductBySlugFromDb(slug: string): Promise<Product | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT payload FROM app_products WHERE slug = ? LIMIT 1`,
    [slug]
  )

  return rows[0] ? parsePayload(rows[0].payload) : null
}

export async function getProductByIdFromDb(id: string): Promise<Product | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT payload FROM app_products WHERE id = ? LIMIT 1`,
    [id]
  )

  return rows[0] ? parsePayload(rows[0].payload) : null
}

export async function createProductInDb(product: Product) {
  await ensureDbSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO app_products (id, slug, payload, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [product.id, product.slug, JSON.stringify(product)]
  )

  return product
}

export async function updateProductInDb(id: string, partialProduct: Partial<Product>) {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT payload FROM app_products WHERE id = ?`,
    [id]
  )

  if (!rows[0]) return null

  const merged = {
    ...parsePayload(rows[0].payload),
    ...partialProduct,
    id,
  }

  await pool.execute(
    `UPDATE app_products
     SET slug = ?, payload = ?, updated_at = NOW()
     WHERE id = ?`,
    [merged.slug, JSON.stringify(merged), id]
  )

  return merged as Product
}

export async function deleteProductInDb(id: string) {
  await ensureDbSchema()
  const pool = getDbPool()

  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM app_products WHERE id = ?`,
    [id]
  )

  return result.affectedRows > 0
}

export async function getNextProductIdFromDb() {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(id, '[^0-9]', ''), '') AS UNSIGNED)), 0) AS max_id
     FROM app_products`
  )

  const maxId = Number(rows[0]?.max_id ?? 0)
  return String(maxId + 1)
}
