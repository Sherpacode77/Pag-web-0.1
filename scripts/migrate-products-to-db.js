/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const mysql = require("mysql2/promise")

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
    CREATE TABLE IF NOT EXISTS app_products (
      id VARCHAR(255) PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      payload JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  try {
    await conn.execute("CREATE INDEX idx_app_products_slug ON app_products(slug)")
  } catch (err) {
    if (err.errno !== 1061) throw err
  }
}

async function migrate() {
  const filePath = path.join(process.cwd(), "lib", "products.json")
  if (!fs.existsSync(filePath)) {
    throw new Error("No existe lib/products.json. Ejecuta primero: npx tsx scripts/init-products.ts")
  }

  const products = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  if (!Array.isArray(products)) {
    throw new Error("El formato de lib/products.json no es valido")
  }

  const conn = await getConnection()

  try {
    await ensureSchema(conn)

    for (const product of products) {
      await conn.execute(
        `INSERT INTO app_products (id, slug, payload, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           slug = VALUES(slug),
           payload = VALUES(payload),
           updated_at = NOW()`,
        [String(product.id), String(product.slug), JSON.stringify(product)]
      )
    }

    console.log(`Productos migrados: ${products.length}`)
    console.log("Listo. Ahora puedes habilitar DB_PRODUCTS_ENABLED=true")
  } finally {
    await conn.end()
  }
}

migrate().catch((error) => {
  console.error("Fallo la migracion de productos:", error)
  process.exit(1)
})
