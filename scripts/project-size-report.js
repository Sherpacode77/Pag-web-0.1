/*
 * Reporte de peso del proyecto para despliegue.
 *
 * Uso:
 *   node scripts/project-size-report.js
 */

const fs = require("node:fs")
const path = require("node:path")

const ROOT = process.cwd()
const EXCLUDED = new Set([".git", "node_modules", ".next", "dist", "build", "coverage"])

function toMB(bytes) {
  return bytes / (1024 * 1024)
}

function walk(dirPath, callback) {
  if (!fs.existsSync(dirPath)) return
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const absolute = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (!EXCLUDED.has(entry.name)) {
        walk(absolute, callback)
      }
    } else {
      callback(absolute)
    }
  }
}

function folderSize(dirPath) {
  let total = 0
  walk(dirPath, (filePath) => {
    total += fs.statSync(filePath).size
  })
  return total
}

function main() {
  const files = []
  walk(ROOT, (filePath) => {
    const size = fs.statSync(filePath).size
    files.push({ filePath, size })
  })

  const topFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 25)
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  const keyFolders = ["public", "lib", "app", "components", "scripts"]
    .map((folder) => {
      const absolute = path.join(ROOT, folder)
      return {
        folder,
        size: fs.existsSync(absolute) ? folderSize(absolute) : 0,
      }
    })
    .sort((a, b) => b.size - a.size)

  console.log("\nReporte de peso del proyecto")
  console.log("=".repeat(32))
  console.log(`Peso total (sin node_modules/.next): ${toMB(totalSize).toFixed(2)} MB`)

  console.log("\nTop carpetas:")
  keyFolders.forEach((item) => {
    console.log(`  - ${item.folder}: ${toMB(item.size).toFixed(2)} MB`)
  })

  console.log("\nTop archivos pesados:")
  topFiles.forEach((item) => {
    const relative = path.relative(ROOT, item.filePath).replace(/\\/g, "/")
    console.log(`  - ${relative}: ${toMB(item.size).toFixed(2)} MB`)
  })
}

main()