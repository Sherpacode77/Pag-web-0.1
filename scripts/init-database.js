/* eslint-disable no-console */
/**
 * CERO.UNO — Script de inicialización de base de datos (MariaDB)
 *
 * Qué hace este script:
 *   1. Crea todas las tablas si no existen (schema completo)
 *   2. Migra el catálogo de productos desde lib/products.json
 *   3. Migra todos los activos multimedia desde public/ a la BD
 *
 * Uso:
 *   node scripts/init-database.js
 *   node scripts/init-database.js --skip-assets    (solo schema + productos)
 *   node scripts/init-database.js --skip-products   (solo schema + assets)
 *   node scripts/init-database.js --schema-only     (solo crea las tablas)
 *   node scripts/init-database.js --max-video-mb=100 (límite de tamaño para videos)
 *
 * Variables de entorno requeridas:
 *   DATABASE_URL=mysql://usuario:contraseña@localhost:3306/nombre_db
 *   DB_SSL=false   (para conexiones locales en Hostinger)
 */

const fs   = require("fs")
const path = require("path")

// ─── Argumentos de línea de comandos ──────────────────────────────────────────
const args          = process.argv.slice(2)
const skipAssets    = args.includes("--skip-assets")
const skipProducts  = args.includes("--skip-products")
const schemaOnly    = args.includes("--schema-only")

// ─── Tipos MIME ────────────────────────────────────────────────────────────────
const MEDIA_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif",
  ".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v",
])

function mimeFromExt(ext) {
  const n = ext.toLowerCase()
  const map = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
    ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm",
    ".mov": "video/quicktime", ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska", ".m4v": "video/x-m4v",
  }
  return map[n] || "application/octet-stream"
}

function isVideo(ext) {
  return [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"].includes(ext.toLowerCase())
}

function kindFromPath(assetPath, ext) {
  if (isVideo(ext)) return "video"
  const p = assetPath.toLowerCase()
  if (p.includes("/logo") || p.includes("marca") || p.includes("logo")) return "logo"
  if (p.includes("infografia") || p.includes("infographic")) return "infographic"
  if (p.includes("esquema") || p.includes("schema") || p.includes("dimensiones")) return "schema"
  return "image"
}

// ─── Recorrido recursivo de directorio ────────────────────────────────────────
function walkFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walkFiles(full))
    else results.push(full)
  }
  return results
}

// ─── Conexión ─────────────────────────────────────────────────────────────────
async function getConnection() {
  let mysql
  try {
    mysql = require("mysql2/promise")
  } catch {
    console.error("❌  mysql2 no está instalado. Ejecuta: pnpm install")
    process.exit(1)
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌  DATABASE_URL no está configurada.")
    console.error("    Crea un archivo .env.local con:")
    console.error("    DATABASE_URL=mysql://usuario:contraseña@localhost:3306/nombre_db")
    process.exit(1)
  }

  const sslDisabled = process.env.DB_SSL === "false"
  return mysql.createConnection({
    uri: databaseUrl,
    multipleStatements: true,
    ...(!sslDisabled && {
      ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
    }),
  })
}

// ─── Paso 1: Crear tablas ──────────────────────────────────────────────────────
async function runSchema(conn) {
  console.log("\n📋  Creando/verificando tablas...")

  const schemaFile = path.join(__dirname, "sql", "init-schema.sql")
  if (!fs.existsSync(schemaFile)) {
    throw new Error(`No se encontró ${schemaFile}`)
  }

  // Filtramos los comentarios de bloque y ejecutamos sentencia por sentencia
  const raw = fs.readFileSync(schemaFile, "utf-8")
  const statements = raw
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"))

  for (const sql of statements) {
    if (!sql.trim()) continue
    try {
      await conn.execute(sql)
    } catch (err) {
      // Ignorar errores de índice ya existente (1061) y similares
      if (err.errno === 1061 || err.errno === 1050) continue
      throw err
    }
  }

  console.log("✅  Tablas listas:")
  console.log("    • app_media_assets")
  console.log("    • app_products")
  console.log("    • app_customers")
  console.log("    • app_addresses")
  console.log("    • app_orders")
  console.log("    • app_order_items")
  console.log("    • app_newsletter_subscribers")
  console.log("    • app_contact_messages")
}

// ─── Paso 2: Migrar productos ──────────────────────────────────────────────────
async function migrateProducts(conn) {
  console.log("\n📦  Migrando productos...")

  const filePath = path.join(process.cwd(), "lib", "products.json")
  if (!fs.existsSync(filePath)) {
    console.log("⚠️   lib/products.json no encontrado — omitiendo productos.")
    return
  }

  const products = JSON.parse(fs.readFileSync(filePath, "utf-8"))
  if (!Array.isArray(products) || products.length === 0) {
    console.log("⚠️   products.json vacío — omitiendo.")
    return
  }

  let upserted = 0
  for (const product of products) {
    await conn.execute(
      `INSERT INTO app_products (id, slug, payload, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         slug       = VALUES(slug),
         payload    = VALUES(payload),
         updated_at = NOW()`,
      [String(product.id), String(product.slug), JSON.stringify(product)]
    )
    upserted++
  }

  console.log(`✅  ${upserted} productos migrados a app_products.`)
}

// ─── Paso 3: Registrar metadatos de activos multimedia ────────────────────────
// Los binarios viven en public/ (filesystem). Solo guardamos la ruta y el tamaño.
async function migrateAssets(conn) {
  console.log("\n🖼️   Registrando metadatos de activos multimedia desde public/...")

  const publicDir  = path.join(process.cwd(), "public")
  const allFiles   = walkFiles(publicDir)
  const mediaFiles = allFiles.filter((f) =>
    MEDIA_EXTENSIONS.has(path.extname(f).toLowerCase())
  )

  if (mediaFiles.length === 0) {
    console.log("⚠️   No se encontraron archivos multimedia en public/.")
    return
  }

  let migrated   = 0
  let skipped    = 0
  let totalBytes = 0
  const warnings = []

  for (const absolutePath of mediaFiles) {
    const ext         = path.extname(absolutePath)
    const fileName    = path.basename(absolutePath)
    const sizeBytes   = fs.statSync(absolutePath).size
    const relPath     = absolutePath.split(`${path.sep}public${path.sep}`)[1]
    const assetPath   = `/${relPath.replace(/\\/g, "/")}`
    const contentType = mimeFromExt(ext)
    const kind        = kindFromPath(assetPath, ext)

    try {
      await conn.execute(
        `INSERT INTO app_media_assets
           (asset_path, file_name, content_type, kind, size_bytes, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           file_name    = VALUES(file_name),
           content_type = VALUES(content_type),
           kind         = VALUES(kind),
           size_bytes   = VALUES(size_bytes),
           updated_at   = NOW()`,
        [assetPath, fileName, contentType, kind, sizeBytes]
      )
      migrated++
      totalBytes += sizeBytes
    } catch (err) {
      warnings.push(`❌  Error en ${assetPath}: ${err.message}`)
      skipped++
    }
  }

  console.log(`✅  ${migrated} metadatos registrados (${(totalBytes / 1024 / 1024).toFixed(1)} MB en disco)`)
  if (skipped > 0) console.log(`    ${skipped} archivos omitidos`)

  if (warnings.length > 0) {
    console.log("\n⚠️   Advertencias:")
    for (const w of warnings) console.log(`    ${w}`)
  }
}

// ─── Resumen final ─────────────────────────────────────────────────────────────
function printInstructions() {
  console.log("\n🎯  Próximos pasos:")
  console.log("    1. Agrega en tu .env.local (o en Hostinger):")
  console.log("       DB_PRODUCTS_ENABLED=true")
  console.log("       DB_ASSET_STORAGE_ENABLED=true   # solo guarda metadatos, no binarios")
  console.log("    2. Sube la carpeta public/ al servidor (imágenes y videos viajan como archivos).")
  console.log("    3. Reinicia el servidor: pnpm dev")
  console.log("    4. Los videos y fotos se sirven desde el filesystem — sin límite de 16 MB.\n")
}

// ─── Punto de entrada ──────────────────────────────────────────────────────────
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("  CERO.UNO — Inicialización de base de datos")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  const conn = await getConnection()

  try {
    await runSchema(conn)

    if (!schemaOnly) {
      if (!skipProducts) await migrateProducts(conn)
      if (!skipAssets)   await migrateAssets(conn)
    }

    printInstructions()
    console.log("✅  Inicialización completada.\n")
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error("\n❌  Error durante la inicialización:", err.message)
  if (err.code === "ECONNREFUSED") {
    console.error("    No se pudo conectar a la base de datos.")
    console.error("    Verifica que DATABASE_URL sea correcta y que MariaDB esté corriendo.")
  }
  process.exit(1)
})
