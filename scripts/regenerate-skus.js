/* eslint-disable no-console */
// Migración one-off: regenera todos los SKU de app_inventory con el formato
// estructurado nuevo (2 letras prefijo de producto + 3 dígitos código de
// variante global + 3 letras del nombre del producto). El SKU viejo de cada
// fila se guarda como alias en app_inventory_sku_aliases para que cualquier
// etiqueta física ya impresa se siga resolviendo.
//
// Uso: node --env-file=.env scripts/regenerate-skus.js   (con el túnel SSH activo)

const mysql = require("mysql2/promise")

const SKU_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function randomLetters(count) {
  let out = ""
  for (let i = 0; i < count; i++) out += SKU_LETTERS[Math.floor(Math.random() * SKU_LETTERS.length)]
  return out
}

function normalizeKeyPart(value) {
  return value.trim().toLowerCase()
}

function computeVariantKey(color, size) {
  const parts = []
  if (color) parts.push(`color:${normalizeKeyPart(color)}`)
  if (size) parts.push(`size:${normalizeKeyPart(size)}`)
  return parts.length > 0 ? parts.join("|") : "base"
}

function computeNameSuffix(productName) {
  const words = productName.trim().split(/\s+/).filter(Boolean)
  const initials = []
  for (const word of words) {
    const match = word.match(/[a-zA-Z]/)
    if (match) initials.push(match[0].toUpperCase())
    if (initials.length === 3) break
  }
  while (initials.length < 3) initials.push(randomLetters(1))
  return initials.join("")
}

async function getConnection() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no esta configurada")
  }
  const sslDisabled = process.env.DB_SSL === "false"
  return mysql.createConnection({
    uri: databaseUrl,
    ...(!sslDisabled && {
      ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
    }),
  })
}

async function ensureSchema(conn) {
  await conn.execute(`
    ALTER TABLE app_products
    ADD COLUMN IF NOT EXISTS sku_prefix CHAR(2) NULL,
    ADD COLUMN IF NOT EXISTS sku_suffix CHAR(3) NULL
  `)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS app_sku_variant_codes (
      id          BIGINT AUTO_INCREMENT PRIMARY KEY,
      variant_key VARCHAR(191) NOT NULL UNIQUE,
      code        CHAR(3)      NOT NULL UNIQUE,
      label       VARCHAR(150) NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  try {
    await conn.execute("CREATE UNIQUE INDEX uq_app_products_sku_prefix ON app_products(sku_prefix)")
  } catch (err) {
    if (err.errno !== 1061) throw err
  }
}

async function assignProductPrefix(conn, productId) {
  const [rows] = await conn.execute(`SELECT sku_prefix FROM app_products WHERE id = ?`, [productId])
  if (rows[0]?.sku_prefix) return rows[0].sku_prefix

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = randomLetters(2)
    const [taken] = await conn.execute(`SELECT 1 FROM app_products WHERE sku_prefix = ?`, [candidate])
    if (taken.length === 0) {
      await conn.execute(`UPDATE app_products SET sku_prefix = ? WHERE id = ?`, [candidate, productId])
      return candidate
    }
  }
  throw new Error(`No se pudo asignar prefijo para producto ${productId}`)
}

async function assignProductSuffix(conn, productId, productName) {
  const [rows] = await conn.execute(`SELECT sku_suffix FROM app_products WHERE id = ?`, [productId])
  if (rows[0]?.sku_suffix) return rows[0].sku_suffix

  const suffix = computeNameSuffix(productName)
  await conn.execute(`UPDATE app_products SET sku_suffix = ? WHERE id = ?`, [suffix, productId])
  return suffix
}

async function assignVariantCode(conn, variantKey, label, usedCodes) {
  const [existing] = await conn.execute(
    `SELECT code FROM app_sku_variant_codes WHERE variant_key = ?`,
    [variantKey]
  )
  if (existing[0]) return existing[0].code

  let code = null
  for (let n = 0; n <= 999; n++) {
    const candidate = String(n).padStart(3, "0")
    if (!usedCodes.has(candidate)) {
      code = candidate
      break
    }
  }
  if (!code) throw new Error("Se agotaron los códigos de variante disponibles (000-999)")

  await conn.execute(
    `INSERT INTO app_sku_variant_codes (variant_key, code, label) VALUES (?, ?, ?)`,
    [variantKey, code, label]
  )
  usedCodes.add(code)
  return code
}

function productName(payload) {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload
  return parsed.name
}

async function migrate() {
  const conn = await getConnection()
  const summary = []

  try {
    await ensureSchema(conn)

    const [usedCodeRows] = await conn.execute(`SELECT code FROM app_sku_variant_codes`)
    const usedCodes = new Set(usedCodeRows.map((r) => r.code))

    const [products] = await conn.execute(`
      SELECT id, payload FROM app_products
      ORDER BY CAST(NULLIF(REGEXP_REPLACE(id, '[^0-9]', ''), '') AS UNSIGNED), id
    `)

    for (const product of products) {
      const name = productName(product.payload)
      const prefix = await assignProductPrefix(conn, product.id)
      const suffix = await assignProductSuffix(conn, product.id, name)

      const [items] = await conn.execute(
        `SELECT id, sku, variant_color, variant_color_name, variant_size
         FROM app_inventory WHERE product_id = ?
         ORDER BY variant_color, variant_size`,
        [product.id]
      )

      for (const item of items) {
        const variantKey = computeVariantKey(item.variant_color, item.variant_size)
        const label = [item.variant_color_name, item.variant_size].filter(Boolean).join(" / ") || "Sin variante"
        const code = await assignVariantCode(conn, variantKey, label, usedCodes)
        const newSku = `${prefix}${code}${suffix}`

        if (newSku !== item.sku) {
          await conn.execute(`UPDATE app_inventory SET sku = ?, updated_at = NOW() WHERE id = ?`, [
            newSku,
            item.id,
          ])
          await conn.execute(
            `INSERT IGNORE INTO app_inventory_sku_aliases (inventory_id, alias_sku, source, notes, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [item.id, item.sku, "migracion-formato-8-2026-07-21", `SKU anterior antes de regenerar (${label})`]
          )
        }

        summary.push({ producto: name, variante: label, skuAnterior: item.sku, skuNuevo: newSku })
      }
    }

    console.log("\nResumen de regeneración de SKU:\n")
    console.table(summary)
    console.log(`\nTotal de filas procesadas: ${summary.length}`)
    console.log(`Cambiaron: ${summary.filter((s) => s.skuAnterior !== s.skuNuevo).length}`)
  } finally {
    await conn.end()
  }
}

migrate().catch((error) => {
  console.error("Fallo la regeneración de SKU:", error)
  process.exit(1)
})
