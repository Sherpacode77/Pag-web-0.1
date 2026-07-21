import type { RowDataPacket, ResultSetHeader, Pool, PoolConnection } from "mysql2/promise"
import type { Product } from "@/lib/data"
import { ensureDbSchema, getDbPool, hasDatabaseUrl, withTransaction } from "@/lib/db"

export function isDbInventoryEnabled() {
  return hasDatabaseUrl()
}

export type SkuAlias = {
  id: number
  inventory_id: number
  alias_sku: string
  source: string | null
  notes: string | null
  created_at: string
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
  ideal_quantity: number
  low_stock_threshold: number
  is_available: boolean
  cost_price: number | null
  notes: string | null
  updated_at: string
  aliases: SkuAlias[]
}

export type StockStatus = "urgent" | "warning" | "good"

export function getStockStatus(row: Pick<InventoryRow, "stock_quantity" | "ideal_quantity" | "low_stock_threshold">): StockStatus {
  const { stock_quantity, ideal_quantity, low_stock_threshold } = row
  if (ideal_quantity > 0) {
    const ratio = stock_quantity / ideal_quantity
    if (ratio < 0.25) return "urgent"
    if (ratio < 0.60) return "warning"
    return "good"
  }
  // Sin inventario ideal definido, usa el umbral de alerta
  if (stock_quantity <= low_stock_threshold) return "urgent"
  return "good"
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
  i.stock_quantity, i.ideal_quantity, i.low_stock_threshold,
  CASE WHEN i.is_available = 1 THEN TRUE ELSE FALSE END AS is_available,
  i.cost_price, i.notes,
  DATE_FORMAT(i.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
`

async function attachAliases(rows: Omit<InventoryRow, "aliases">[]): Promise<InventoryRow[]> {
  if (rows.length === 0) return []

  const pool = getDbPool()
  const ids = rows.map((r) => r.id)
  const placeholders = ids.map(() => "?").join(",")

  const [aliasRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, inventory_id, alias_sku, source, notes,
            DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
     FROM app_inventory_sku_aliases
     WHERE inventory_id IN (${placeholders})
     ORDER BY created_at ASC`,
    ids
  )

  const aliasesByInventoryId = new Map<number, SkuAlias[]>()
  for (const a of aliasRows as SkuAlias[]) {
    const list = aliasesByInventoryId.get(a.inventory_id) ?? []
    list.push(a)
    aliasesByInventoryId.set(a.inventory_id, list)
  }

  return rows.map((r) => ({ ...r, aliases: aliasesByInventoryId.get(r.id) ?? [] }))
}

// Un producto se considera visible si tiene al menos un SKU con is_available=1,
// o si aún no tiene filas de inventario (nunca reconciliado — no ocultar por defecto).
export async function filterProductsByAvailability<T extends { id: string }>(
  productsData: T[]
): Promise<T[]> {
  if (!isDbInventoryEnabled()) return productsData

  try {
    const rows = await getInventoryFromDb()
    const availableByProduct = new Map<string, boolean>()
    for (const row of rows) {
      availableByProduct.set(
        row.product_id,
        (availableByProduct.get(row.product_id) ?? false) || row.is_available
      )
    }
    return productsData.filter((p) => availableByProduct.get(p.id) ?? true)
  } catch {
    return productsData
  }
}

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

  return attachAliases(rows as Omit<InventoryRow, "aliases">[])
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

  if (!rows[0]) return null
  const [withAliases] = await attachAliases([rows[0] as Omit<InventoryRow, "aliases">])
  return withAliases
}

export type CreateInventoryInput = {
  sku: string
  product_id: string
  variant_color?: string | null
  variant_color_name?: string | null
  variant_size?: string | null
  stock_quantity?: number
  ideal_quantity?: number
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
        stock_quantity, ideal_quantity, low_stock_threshold, is_available, cost_price, notes,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      input.sku,
      input.product_id,
      input.variant_color ?? null,
      input.variant_color_name ?? null,
      input.variant_size ?? null,
      input.stock_quantity ?? 0,
      input.ideal_quantity ?? 0,
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
  ideal_quantity?: number
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

  if (input.ideal_quantity !== undefined) {
    setClauses.push("ideal_quantity = ?")
    params.push(input.ideal_quantity)
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

  const [existingRows] = await pool.execute<RowDataPacket[]>(
    `SELECT variant_color, variant_size FROM app_inventory WHERE sku = ? LIMIT 1`,
    [sku]
  )
  const existing = existingRows[0] as
    | { variant_color: string | null; variant_size: string | null }
    | undefined

  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM app_inventory WHERE sku = ?`,
    [sku]
  )

  if (result.affectedRows > 0 && existing) {
    await releaseVariantCodeIfUnused(pool, computeVariantKey(existing.variant_color, existing.variant_size))
  }

  return result.affectedRows > 0
}

// ─── Generación estructurada de SKU ────────────────────────────────────────
// Formato: 8 caracteres — 2 letras de prefijo (exclusivo por producto) +
// 3 dígitos de código de variante (exclusivo y GLOBAL en todo el catálogo:
// la misma identidad de variante, p.ej. "negro sin talla", reutiliza el mismo
// código en cualquier producto que la tenga) + 3 letras derivadas del nombre
// del producto. Ejemplo: AB001NGL.

const SKU_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
export const SKU_FORMAT_REGEX = /^[A-Z]{2}[0-9]{3}[A-Z]{3}$/

function randomLetters(count: number): string {
  let out = ""
  for (let i = 0; i < count; i++) out += SKU_LETTERS[Math.floor(Math.random() * SKU_LETTERS.length)]
  return out
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase()
}

// Identidad normalizada de una variante — la unidad de exclusividad global
// del código de 3 dígitos. Un producto sin ninguna variante usa "base".
export function computeVariantKey(color: string | null, size: string | null): string {
  const parts: string[] = []
  if (color) parts.push(`color:${normalizeKeyPart(color)}`)
  if (size) parts.push(`size:${normalizeKeyPart(size)}`)
  return parts.length > 0 ? parts.join("|") : "base"
}

async function isSkuTaken(conn: Pool | PoolConnection, sku: string): Promise<boolean> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT 1 FROM app_inventory WHERE sku = ?
     UNION ALL
     SELECT 1 FROM app_inventory_sku_aliases WHERE alias_sku = ?
     LIMIT 1`,
    [sku, sku]
  )
  return rows.length > 0
}

// Asigna (o reutiliza) el prefijo de 2 letras exclusivo del producto.
async function getOrAssignProductPrefix(
  conn: Pool | PoolConnection,
  productId: string
): Promise<string> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT sku_prefix FROM app_products WHERE id = ? LIMIT 1`,
    [productId]
  )
  const existing = rows[0]?.sku_prefix as string | null | undefined
  if (existing) return existing

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = randomLetters(2)
    const [taken] = await conn.execute<RowDataPacket[]>(
      `SELECT 1 FROM app_products WHERE sku_prefix = ? LIMIT 1`,
      [candidate]
    )
    if (taken.length === 0) {
      await conn.execute(`UPDATE app_products SET sku_prefix = ? WHERE id = ?`, [candidate, productId])
      return candidate
    }
  }
  throw new Error("No se pudo asignar un prefijo de SKU único tras varios intentos")
}

// Calcula el sufijo de 3 letras a partir del nombre del producto: la inicial
// alfabética de cada palabra (saltando palabras sin ninguna letra) hasta
// reunir 3; si el nombre no alcanza, se completa con letras aleatorias.
function computeNameSuffix(productName: string): string {
  const words = productName.trim().split(/\s+/).filter(Boolean)
  const initials: string[] = []
  for (const word of words) {
    const match = word.match(/[a-zA-Z]/)
    if (match) initials.push(match[0].toUpperCase())
    if (initials.length === 3) break
  }
  while (initials.length < 3) initials.push(randomLetters(1))
  return initials.join("")
}

// Asigna (o reutiliza) el sufijo de 3 letras del producto, cacheado en DB
// para que no cambie entre regeneraciones (relevante para nombres de 1-2
// palabras, cuyo sufijo incluye letras aleatorias).
async function getOrAssignProductSuffix(
  conn: Pool | PoolConnection,
  productId: string,
  productName: string
): Promise<string> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT sku_suffix FROM app_products WHERE id = ? LIMIT 1`,
    [productId]
  )
  const existing = rows[0]?.sku_suffix as string | null | undefined
  if (existing) return existing

  const suffix = computeNameSuffix(productName)
  await conn.execute(`UPDATE app_products SET sku_suffix = ? WHERE id = ?`, [suffix, productId])
  return suffix
}

// Asigna (o reutiliza) el código de 3 dígitos global de una identidad de
// variante — el menor código libre entre 000 y 999.
async function getOrAssignVariantCode(
  conn: Pool | PoolConnection,
  variantKey: string,
  label: string
): Promise<string> {
  const [existing] = await conn.execute<RowDataPacket[]>(
    `SELECT code FROM app_sku_variant_codes WHERE variant_key = ? LIMIT 1`,
    [variantKey]
  )
  if (existing[0]) return existing[0].code as string

  const [usedRows] = await conn.execute<RowDataPacket[]>(`SELECT code FROM app_sku_variant_codes`)
  const used = new Set((usedRows as { code: string }[]).map((r) => r.code))
  let code: string | null = null
  for (let n = 0; n <= 999; n++) {
    const candidate = String(n).padStart(3, "0")
    if (!used.has(candidate)) {
      code = candidate
      break
    }
  }
  if (!code) throw new Error("Se agotaron los códigos de variante disponibles (000-999)")

  try {
    await conn.execute(
      `INSERT INTO app_sku_variant_codes (variant_key, code, label) VALUES (?, ?, ?)`,
      [variantKey, code, label]
    )
  } catch (err: unknown) {
    // Otra transacción concurrente ya reservó esta identidad — reusar su código
    const e = err as NodeJS.ErrnoException & { code?: string }
    if (e.code === "ER_DUP_ENTRY") {
      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT code FROM app_sku_variant_codes WHERE variant_key = ? LIMIT 1`,
        [variantKey]
      )
      if (rows[0]) return rows[0].code as string
    }
    throw err
  }
  return code
}

// Libera el código de una identidad de variante si ya ningún SKU del
// catálogo la usa (se llama tras borrar un SKU individual o un producto).
export async function releaseVariantCodeIfUnused(
  conn: Pool | PoolConnection,
  variantKey: string
): Promise<void> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT DISTINCT variant_color, variant_size FROM app_inventory`
  )
  const stillUsed = (rows as { variant_color: string | null; variant_size: string | null }[]).some(
    (r) => computeVariantKey(r.variant_color, r.variant_size) === variantKey
  )
  if (!stillUsed) {
    await conn.execute(`DELETE FROM app_sku_variant_codes WHERE variant_key = ?`, [variantKey])
  }
}

// Identidades de variante distintas que tiene hoy un producto — capturar
// antes de borrarlo, para poder liberar sus códigos después del borrado.
export async function getVariantKeysForProduct(productId: string): Promise<string[]> {
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT variant_color, variant_size FROM app_inventory WHERE product_id = ?`,
    [productId]
  )
  return (rows as { variant_color: string | null; variant_size: string | null }[]).map((r) =>
    computeVariantKey(r.variant_color, r.variant_size)
  )
}

export async function releaseVariantCodes(variantKeys: string[]): Promise<void> {
  const pool = getDbPool()
  for (const key of variantKeys) {
    await releaseVariantCodeIfUnused(pool, key)
  }
}

export async function generateStructuredSku(
  conn: Pool | PoolConnection,
  product: { id: string; name: string },
  color: string | null,
  colorLabel: string | null,
  size: string | null
): Promise<string> {
  const prefix = await getOrAssignProductPrefix(conn, product.id)
  const suffix = await getOrAssignProductSuffix(conn, product.id, product.name)
  const variantKey = computeVariantKey(color, size)
  const label = [colorLabel, size].filter(Boolean).join(" / ") || "Sin variante"
  const code = await getOrAssignVariantCode(conn, variantKey, label)

  const sku = `${prefix}${code}${suffix}`
  if (await isSkuTaken(conn, sku)) {
    throw new Error(
      `SKU generado ${sku} ya existe — revisar integridad de app_products/app_sku_variant_codes`
    )
  }
  return sku
}

// ─── Reconciliación de inventario para un producto ─────────────────────────
// Crea las filas de app_inventory que falten para las variantes de un
// producto: el producto cartesiano de sus colores (o una única entrada
// variant_color=NULL si no tiene variantes de color) por sus tallas (o una
// única entrada variant_size=NULL si no tiene tallas). Idempotente: llamarla
// repetidamente sobre el mismo producto nunca duplica ni pisa filas existentes.

export type ReconcileResult = {
  created: InventoryRow[]
  skipped: number
  errors: string[]
}

export async function reconcileInventoryForProduct(product: Product): Promise<ReconcileResult> {
  await ensureDbSchema()

  const colorsToEnsure: { variant_color: string | null; variant_color_name: string | null }[] =
    product.hasVariants && product.variants && product.variants.length > 0
      ? product.variants.map((v) => ({ variant_color: v.color, variant_color_name: v.colorName }))
      : [{ variant_color: null, variant_color_name: null }]

  const sizesToEnsure: { variant_size: string | null }[] =
    product.sizes && product.sizes.length > 0
      ? product.sizes.map((s) => ({ variant_size: s.size }))
      : [{ variant_size: null }]

  const variantsToEnsure = colorsToEnsure.flatMap((c) =>
    sizesToEnsure.map((s) => ({ ...c, ...s }))
  )

  const result: ReconcileResult = { created: [], skipped: 0, errors: [] }

  for (const v of variantsToEnsure) {
    try {
      const sku = await withTransaction(async (conn) => {
        // NULL-safe: MySQL trata cada NULL como distinto en un UNIQUE KEY, así
        // que el constraint de la tabla NO evita duplicados cuando
        // variant_color/variant_size son NULL. Este SELECT explícito con <=>
        // es lo que realmente previene duplicados.
        const [existing] = await conn.execute<RowDataPacket[]>(
          `SELECT id FROM app_inventory
           WHERE product_id = ? AND variant_color <=> ? AND variant_size <=> ?
           LIMIT 1`,
          [product.id, v.variant_color, v.variant_size]
        )
        if (existing.length > 0) return null

        const generatedSku = await generateStructuredSku(
          conn,
          { id: product.id, name: product.name },
          v.variant_color,
          v.variant_color_name,
          v.variant_size
        )

        await conn.execute(
          `INSERT INTO app_inventory
             (sku, product_id, variant_color, variant_color_name, variant_size,
              stock_quantity, ideal_quantity, low_stock_threshold, is_available,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, 0, 3, 1, NOW(), NOW())`,
          [generatedSku, product.id, v.variant_color, v.variant_color_name, v.variant_size]
        )
        return generatedSku
      })

      if (sku === null) {
        result.skipped++
      } else {
        const created = await getInventoryBySkuFromDb(sku)
        if (created) result.created.push(created)
      }
    } catch (err) {
      console.error("reconcileInventoryForProduct: fallo en variante", v, err)
      const label = [v.variant_color_name ?? v.variant_color, v.variant_size].filter(Boolean).join(" ") || "única"
      result.errors.push(
        `Variante ${label}: ` + (err instanceof Error ? err.message : "error desconocido")
      )
    }
  }

  return result
}

// ─── Renombrar SKU principal ────────────────────────────────────────────────

export async function renameInventorySkuFromDb(
  oldSku: string,
  newSku: string
): Promise<InventoryRow | null | "invalid_format" | "duplicate"> {
  await ensureDbSchema()

  if (!SKU_FORMAT_REGEX.test(newSku)) return "invalid_format"
  if (oldSku === newSku) return getInventoryBySkuFromDb(oldSku)

  const pool = getDbPool()

  // ER_DUP_ENTRY del UPDATE solo cubriría colisión contra app_inventory.sku,
  // no contra un alias existente en la otra tabla — chequeo explícito primero.
  const [aliasHit] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM app_inventory_sku_aliases WHERE alias_sku = ? LIMIT 1`,
    [newSku]
  )
  if (aliasHit.length > 0) return "duplicate"

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE app_inventory SET sku = ?, updated_at = NOW() WHERE sku = ?`,
      [newSku, oldSku]
    )
    if (result.affectedRows === 0) return null
    return getInventoryBySkuFromDb(newSku)
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { code?: string }
    if (e.code === "ER_DUP_ENTRY") return "duplicate"
    throw err
  }
}

// ─── CRUD de alias de SKU ───────────────────────────────────────────────────

export async function addAliasToSku(
  sku: string,
  alias: { alias_sku: string; source?: string | null; notes?: string | null }
): Promise<SkuAlias | "not_found" | "duplicate"> {
  await ensureDbSchema()
  const pool = getDbPool()

  const inv = await getInventoryBySkuFromDb(sku)
  if (!inv) return "not_found"

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO app_inventory_sku_aliases (inventory_id, alias_sku, source, notes, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [inv.id, alias.alias_sku, alias.source ?? null, alias.notes ?? null]
    )
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, inventory_id, alias_sku, source, notes,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at
       FROM app_inventory_sku_aliases WHERE id = ?`,
      [result.insertId]
    )
    return rows[0] as SkuAlias
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { code?: string }
    if (e.code === "ER_DUP_ENTRY") return "duplicate"
    throw err
  }
}

export async function deleteAliasById(aliasId: number): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM app_inventory_sku_aliases WHERE id = ?`,
    [aliasId]
  )

  return result.affectedRows > 0
}
