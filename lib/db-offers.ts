import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"
import { ensureDbSchema, getDbPool, hasDatabaseUrl } from "@/lib/db"

export function isDbOffersEnabled() {
  return hasDatabaseUrl()
}

export interface OfferProduct {
  productId: string
  variantColors: string[]
}

export interface OfferMedia {
  type: "image" | "video"
  url: string
}

export interface Offer {
  id: string
  name: string
  description: string
  discount_pct: number | null
  is_active: boolean
  valid_until: string | null
  products: OfferProduct[]
  media: OfferMedia[]
  created_at: string
  updated_at: string
}

type OfferRow = Omit<Offer, "products" | "media" | "is_active"> & {
  is_active: number
  products: string | OfferProduct[]
  media: string | OfferMedia[]
}

function parseRow(row: OfferRow): Offer {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    discount_pct: row.discount_pct,
    is_active: Number(row.is_active) === 1,
    valid_until: row.valid_until,
    products: typeof row.products === "string" ? JSON.parse(row.products) : row.products,
    media: typeof row.media === "string" ? JSON.parse(row.media) : row.media,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getOffersFromDb(activeOnly = false): Promise<Offer[]> {
  await ensureDbSchema()
  const pool = getDbPool()

  const where = activeOnly
    ? "WHERE is_active = 1 AND (valid_until IS NULL OR valid_until > NOW())"
    : ""

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, description, discount_pct, is_active,
     DATE_FORMAT(valid_until, '%Y-%m-%dT%H:%i:%sZ') AS valid_until,
     products, media,
     DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
     DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
     FROM app_offers ${where}
     ORDER BY created_at DESC`
  )

  return (rows as OfferRow[]).map(parseRow)
}

export type CreateOfferInput = {
  id: string
  name: string
  description?: string
  discount_pct?: number | null
  is_active?: boolean
  valid_until?: string | null
  products: OfferProduct[]
  media: OfferMedia[]
}

export async function createOfferInDb(input: CreateOfferInput): Promise<Offer> {
  await ensureDbSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO app_offers (id, name, description, discount_pct, is_active, valid_until, products, media, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      input.id,
      input.name,
      input.description ?? null,
      input.discount_pct ?? null,
      input.is_active !== false ? 1 : 0,
      input.valid_until ?? null,
      JSON.stringify(input.products),
      JSON.stringify(input.media),
    ]
  )

  const all = await getOffersFromDb()
  return all.find((o) => o.id === input.id)!
}

export type UpdateOfferInput = Partial<Omit<CreateOfferInput, "id">>

export async function updateOfferInDb(id: string, input: UpdateOfferInput): Promise<Offer | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const setClauses: string[] = ["updated_at = NOW()"]
  const params: (string | number | null)[] = []

  if (input.name !== undefined) { setClauses.push("name = ?"); params.push(input.name) }
  if (input.description !== undefined) { setClauses.push("description = ?"); params.push(input.description ?? null) }
  if ("discount_pct" in input) { setClauses.push("discount_pct = ?"); params.push(input.discount_pct ?? null) }
  if (input.is_active !== undefined) { setClauses.push("is_active = ?"); params.push(input.is_active ? 1 : 0) }
  if ("valid_until" in input) { setClauses.push("valid_until = ?"); params.push(input.valid_until ?? null) }
  if (input.products !== undefined) { setClauses.push("products = ?"); params.push(JSON.stringify(input.products)) }
  if (input.media !== undefined) { setClauses.push("media = ?"); params.push(JSON.stringify(input.media)) }

  if (setClauses.length === 1) {
    const all = await getOffersFromDb()
    return all.find((o) => o.id === id) ?? null
  }

  params.push(id)

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE app_offers SET ${setClauses.join(", ")} WHERE id = ?`,
    params
  )

  if (result.affectedRows === 0) return null

  const all = await getOffersFromDb()
  return all.find((o) => o.id === id) ?? null
}

export async function deleteOfferFromDb(id: string): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM app_offers WHERE id = ?",
    [id]
  )

  return result.affectedRows > 0
}
