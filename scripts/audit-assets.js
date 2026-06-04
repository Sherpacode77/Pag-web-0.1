/*
 * Auditoria de assets para rendimiento y limpieza.
 *
 * Uso:
 *   node scripts/audit-assets.js
 *   node scripts/audit-assets.js --delete-unused
 */

const fs = require("node:fs")
const path = require("node:path")

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, "public")
const PRODUCTS_PATH = path.join(ROOT, "lib", "products.json")
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".mjs"])
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"])
const ASSET_REF_REGEX = /(["'`])\/(images|videos)\/[A-Za-z0-9_./\-()%]+\1/g

function toPosix(value) {
  return value.replace(/\\/g, "/")
}

function fileSizeMB(filePath) {
  const size = fs.statSync(filePath).size
  return size / (1024 * 1024)
}

function walkFiles(dirPath, collector) {
  if (!fs.existsSync(dirPath)) {
    return
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkFiles(absolute, collector)
      }
      continue
    }

    collector(absolute)
  }
}

function collectReferencedAssetsFromText(filePath, referenced) {
  const content = fs.readFileSync(filePath, "utf-8")
  let match = ASSET_REF_REGEX.exec(content)

  while (match) {
    referenced.add(match[0].slice(1, -1))
    match = ASSET_REF_REGEX.exec(content)
  }

  ASSET_REF_REGEX.lastIndex = 0
}

function collectReferencedAssets() {
  const referenced = new Set()

  walkFiles(ROOT, (filePath) => {
    const ext = path.extname(filePath).toLowerCase()
    if (!SCAN_EXTENSIONS.has(ext)) {
      return
    }

    collectReferencedAssetsFromText(filePath, referenced)
  })

  if (fs.existsSync(PRODUCTS_PATH)) {
    try {
      const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"))
      for (const product of products) {
        if (typeof product.image === "string") referenced.add(product.image)
        if (Array.isArray(product.images)) {
          for (const image of product.images) {
            if (typeof image === "string") referenced.add(image)
          }
        }
        if (typeof product.video === "string") referenced.add(product.video)
        if (Array.isArray(product.videos)) {
          for (const video of product.videos) {
            if (typeof video === "string") referenced.add(video)
          }
        }
        if (Array.isArray(product.variants)) {
          for (const variant of product.variants) {
            if (typeof variant.image === "string") referenced.add(variant.image)
          }
        }
      }
    } catch (error) {
      console.error("No se pudo parsear lib/products.json:", error.message)
    }
  }

  return referenced
}

function collectLocalAssets() {
  const localAssets = new Map()

  walkFiles(PUBLIC_DIR, (filePath) => {
    const relativeFromPublic = toPosix(path.relative(PUBLIC_DIR, filePath))
    const routePath = `/${relativeFromPublic}`

    if (routePath.startsWith("/images/") || routePath.startsWith("/videos/")) {
      localAssets.set(routePath, filePath)
    }
  })

  return localAssets
}

function formatList(title, rows, limit = 20) {
  console.log(`\n${title}: ${rows.length}`)
  rows.slice(0, limit).forEach((row) => console.log(`  - ${row}`))
  if (rows.length > limit) {
    console.log(`  ... y ${rows.length - limit} mas`)
  }
}

function main() {
  const shouldDeleteUnused = process.argv.includes("--delete-unused")
  const referenced = collectReferencedAssets()
  const localAssets = collectLocalAssets()

  const missingLocalReferences = []
  const localReferenced = []

  for (const ref of referenced) {
    if (ref.startsWith("/images/") || ref.startsWith("/videos/")) {
      if (localAssets.has(ref)) {
        localReferenced.push(ref)
      } else {
        missingLocalReferences.push(ref)
      }
    }
  }

  const unusedLocal = []
  for (const [routePath, absolutePath] of localAssets.entries()) {
    if (!referenced.has(routePath)) {
      const size = fileSizeMB(absolutePath)
      unusedLocal.push({ routePath, absolutePath, size })
    }
  }

  const totalUnusedSize = unusedLocal.reduce((sum, item) => sum + item.size, 0)

  console.log("\nAuditoria de assets (images/videos)")
  console.log("=".repeat(42))
  console.log(`Referencias detectadas: ${referenced.size}`)
  console.log(`Assets locales en public/: ${localAssets.size}`)
  console.log(`Assets locales referenciados: ${localReferenced.length}`)
  console.log(`Assets locales sin uso: ${unusedLocal.length}`)
  console.log(`Espacio recuperable estimado: ${totalUnusedSize.toFixed(2)} MB`)

  formatList("Referencias que no existen localmente", missingLocalReferences)

  const sortedUnused = [...unusedLocal].sort((a, b) => b.size - a.size)
  formatList(
    "Assets locales sin uso (top por peso)",
    sortedUnused.map((item) => `${item.routePath} (${item.size.toFixed(2)} MB)`)
  )

  if (shouldDeleteUnused && sortedUnused.length > 0) {
    let deleted = 0
    let failed = 0

    for (const item of sortedUnused) {
      try {
        fs.unlinkSync(item.absolutePath)
        deleted += 1
      } catch {
        failed += 1
      }
    }

    console.log("\nEliminacion de assets no usados")
    console.log("=".repeat(32))
    console.log(`Eliminados: ${deleted}`)
    console.log(`Fallidos: ${failed}`)
  } else if (sortedUnused.length > 0) {
    console.log("\nTip: usa --delete-unused para eliminar los assets no usados detectados.")
  }
}

main()