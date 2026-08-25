import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"
import { ensureDbSchema, getDbPool, hasDatabaseUrl } from "@/lib/db"
import type { Product } from "@/lib/data"

export type OfferType = "single" | "bundle"
export type OfferDiscountType = "percentage" | "free_shipping"

export interface OfferProductEntry {
  productId: string
  variantColors: string[] // [] = aplica a todas las variantes del producto
  quantity?: number // default 1 -- solo relevante para offer_type "bundle"
}

export interface Offer {
  id: number
  name: string
  description: string | null
  offer_type: OfferType
  discount_type: OfferDiscountType
  discount_value: number | null
  cover_image: string | null
  products: OfferProductEntry[]
  is_active: boolean
  valid_from: string
  valid_until: string | null
  created_at: string
  updated_at: string
}

type OfferRow = Omit<Offer, "products" | "is_active"> & {
  is_active: number
  products: string | OfferProductEntry[]
}

function parseRow(row: OfferRow): Offer {
  return {
    ...row,
    is_active: Number(row.is_active) === 1,
    products: typeof row.products === "string" ? JSON.parse(row.products) : row.products,
  }
}

export function isDbOffersEnabled() {
  return hasDatabaseUrl()
}

export async function listOffers(): Promise<Offer[]> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_offers ORDER BY is_active DESC, created_at DESC`
  )
  return (rows as OfferRow[]).map(parseRow)
}

export type CreateOfferInput = {
  name: string
  description?: string | null
  offer_type: OfferType
  discount_type: OfferDiscountType
  discount_value?: number | null
  cover_image?: string | null
  products: OfferProductEntry[]
  valid_until?: string | null
}

export async function createOffer(input: CreateOfferInput): Promise<Offer> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO app_offers
       (name, description, offer_type, discount_type, discount_value, cover_image, products, valid_until, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [
      input.name,
      input.description ?? null,
      input.offer_type,
      input.discount_type,
      input.discount_type === "percentage" ? input.discount_value ?? null : null,
      input.cover_image ?? null,
      JSON.stringify(input.products),
      input.valid_until ?? null,
    ]
  )

  const offer = await getOfferById(result.insertId)
  if (!offer) throw new Error("No se pudo crear la oferta")
  return offer
}

export async function getOfferById(id: number): Promise<Offer | null> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT * FROM app_offers WHERE id = ? LIMIT 1`, [id])
  const row = rows[0] as OfferRow | undefined
  return row ? parseRow(row) : null
}

export type UpdateOfferInput = Partial<Omit<CreateOfferInput, "offer_type">> & { is_active?: boolean }

export async function updateOffer(id: number, input: UpdateOfferInput): Promise<Offer | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const setClauses: string[] = ["updated_at = NOW()"]
  const params: (string | number | null)[] = []

  if (input.name !== undefined) { setClauses.push("name = ?"); params.push(input.name) }
  if (input.description !== undefined) { setClauses.push("description = ?"); params.push(input.description ?? null) }
  if (input.discount_type !== undefined) { setClauses.push("discount_type = ?"); params.push(input.discount_type) }
  if ("discount_value" in input) { setClauses.push("discount_value = ?"); params.push(input.discount_value ?? null) }
  if ("cover_image" in input) { setClauses.push("cover_image = ?"); params.push(input.cover_image ?? null) }
  if (input.products !== undefined) { setClauses.push("products = ?"); params.push(JSON.stringify(input.products)) }
  if ("valid_until" in input) { setClauses.push("valid_until = ?"); params.push(input.valid_until ?? null) }
  if (input.is_active !== undefined) { setClauses.push("is_active = ?"); params.push(input.is_active ? 1 : 0) }

  if (setClauses.length === 1) return getOfferById(id)

  params.push(id)
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE app_offers SET ${setClauses.join(", ")} WHERE id = ?`,
    params
  )
  if (result.affectedRows === 0) return null
  return getOfferById(id)
}

export async function setOfferActive(id: number, isActive: boolean): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE app_offers SET is_active = ?, updated_at = NOW() WHERE id = ?`,
    [isActive ? 1 : 0, id]
  )
  return result.affectedRows > 0
}

export async function deleteOffer(id: number): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM app_offers WHERE id = ?`, [id])
  return result.affectedRows > 0
}

// --- Helpers de lectura publica (overlay de precio/envio, nunca persistido) ---

const ACTIVE_AND_VALID = "is_active = 1 AND valid_from <= NOW() AND (valid_until IS NULL OR valid_until > NOW())"

export async function getActivePricingOffers(): Promise<Offer[]> {
  if (!hasDatabaseUrl()) return []
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_offers WHERE offer_type = 'single' AND discount_type = 'percentage' AND ${ACTIVE_AND_VALID}`
  )
  return (rows as OfferRow[]).map(parseRow)
}

export async function getActiveFreeShippingProductIds(): Promise<Set<string>> {
  if (!hasDatabaseUrl()) return new Set()
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_offers WHERE offer_type = 'single' AND discount_type = 'free_shipping' AND ${ACTIVE_AND_VALID}`
  )
  const ids = new Set<string>()
  for (const row of (rows as OfferRow[]).map(parseRow)) {
    for (const p of row.products) ids.add(p.productId)
  }
  return ids
}

export async function getActiveBundleOffers(): Promise<Offer[]> {
  if (!hasDatabaseUrl()) return []
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_offers WHERE offer_type = 'bundle' AND ${ACTIVE_AND_VALID} ORDER BY created_at DESC`
  )
  return (rows as OfferRow[]).map(parseRow)
}

// Aplica las ofertas activas de referencia unica a una lista de productos ya
// leida, calculando precio/envio con descuento al vuelo -- nunca se
// sobreescribe el precio base guardado en app_products. Se usa en todos los
// puntos de lectura publica de productos (ver applyActiveOffers call sites).
export async function applyActiveOffers(products: Product[]): Promise<Product[]> {
  if (!hasDatabaseUrl() || products.length === 0) return products

  const [pricingOffers, freeShippingIds] = await Promise.all([
    getActivePricingOffers(),
    getActiveFreeShippingProductIds(),
  ])

  if (pricingOffers.length === 0 && freeShippingIds.size === 0) return products

  const pricingByProductId = new Map<string, Offer>()
  for (const offer of pricingOffers) {
    for (const p of offer.products) {
      if (!pricingByProductId.has(p.productId)) pricingByProductId.set(p.productId, offer)
    }
  }

  return products.map((product) => {
    let next = product
    const pricingOffer = pricingByProductId.get(product.id)

    if (pricingOffer && pricingOffer.discount_value) {
      const basePrice = product.price
      const entry = pricingOffer.products.find((p) => p.productId === product.id)!
      next = {
        ...next,
        originalPrice: basePrice,
        price: Math.round(basePrice * (1 - Number(pricingOffer.discount_value) / 100)),
        activeOfferVariantColors: entry.variantColors,
      }
    }

    if (freeShippingIds.has(product.id)) {
      next = { ...next, freeShipping: true }
    }

    return next
  })
}
