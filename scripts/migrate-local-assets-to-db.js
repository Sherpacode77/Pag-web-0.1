/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const mysql = require("mysql2/promise")

const MEDIA_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".m4v",
])

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
    CREATE TABLE IF NOT EXISTS app_media_assets (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      asset_path VARCHAR(500) NOT NULL UNIQUE,
      file_name VARCHAR(255) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      kind VARCHAR(10) NOT NULL,
      size_bytes BIGINT NOT NULL,
      data LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  try {
    await conn.execute("CREATE INDEX idx_app_media_assets_kind ON app_media_assets(kind)")
  } catch (err) {
    if (err.errno !== 1061) throw err
  }
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return []

  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath))
    } else {
      results.push(fullPath)
    }
  }

  return results
}

function mimeFromExt(ext) {
  const normalized = ext.toLowerCase()
  if (normalized === ".png") return "image/png"
  if (normalized === ".jpg" || normalized === ".jpeg") return "image/jpeg"
  if (normalized === ".webp") return "image/webp"
  if (normalized === ".gif") return "image/gif"
  if (normalized === ".svg") return "image/svg+xml"
  if (normalized === ".avif") return "image/avif"
  if (normalized === ".mp4") return "video/mp4"
  if (normalized === ".webm") return "video/webm"
  if (normalized === ".mov") return "video/quicktime"
  if (normalized === ".avi") return "video/x-msvideo"
  if (normalized === ".mkv") return "video/x-matroska"
  if (normalized === ".m4v") return "video/x-m4v"
  return "application/octet-stream"
}

function isVideo(ext) {
  return [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"].includes(ext.toLowerCase())
}

async function migrate() {
  const projectRoot = process.cwd()
  const publicDir = path.join(projectRoot, "public")
  const allFiles = walkFiles(publicDir)

  const mediaFiles = allFiles.filter((filePath) =>
    MEDIA_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  )

  if (mediaFiles.length === 0) {
    console.log("No se encontraron archivos multimedia en public/")
    return
  }

  console.log(`Archivos detectados: ${mediaFiles.length}`)

  const conn = await getConnection()

  try {
    await ensureSchema(conn)

    let migrated = 0
    let totalBytes = 0

    for (const absolutePath of mediaFiles) {
      const fileBuffer = fs.readFileSync(absolutePath)
      const ext = path.extname(absolutePath)
      const relativePublicPath = absolutePath.split(`${path.sep}public${path.sep}`)[1]
      const assetPath = `/${relativePublicPath.replace(/\\/g, "/")}`
      const fileName = path.basename(absolutePath)
      const kind = isVideo(ext) ? "video" : "image"

      await conn.execute(
        `INSERT INTO app_media_assets (asset_path, file_name, content_type, kind, size_bytes, data, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           file_name = VALUES(file_name),
           content_type = VALUES(content_type),
           kind = VALUES(kind),
           size_bytes = VALUES(size_bytes),
           data = VALUES(data),
           updated_at = NOW()`,
        [assetPath, fileName, mimeFromExt(ext), kind, fileBuffer.length, fileBuffer]
      )

      migrated += 1
      totalBytes += fileBuffer.length
    }

    console.log(`Migrados: ${migrated} archivos`)
    console.log(`Total transferido: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`)
    console.log("Listo. Ahora puedes habilitar DB_ASSET_STORAGE_ENABLED=true")
  } finally {
    await conn.end()
  }
}

migrate().catch((error) => {
  console.error("Fallo la migracion:", error)
  process.exit(1)
})
