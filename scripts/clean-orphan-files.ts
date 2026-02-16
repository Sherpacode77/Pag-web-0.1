/**
 * Script para detectar y eliminar archivos huérfanos
 * (archivos en public/ que no están siendo usados en products.json)
 */

import fs from 'fs'
import path from 'path'

interface Product {
  image?: string
  images?: string[]
  video?: string
  videos?: string[]
}

function getUsedFiles(): Set<string> {
  const usedFiles = new Set<string>()
  
  // Leer products.json
  const productsPath = path.join(process.cwd(), 'lib', 'products.json')
  
  if (!fs.existsSync(productsPath)) {
    console.log('❌ No se encontró lib/products.json')
    return usedFiles
  }
  
  const products: Product[] = JSON.parse(fs.readFileSync(productsPath, 'utf-8'))
  
  // Extraer todas las rutas de archivos usados
  products.forEach(product => {
    // Imagen principal
    if (product.image) {
      usedFiles.add(product.image)
    }
    
    // Galería de imágenes
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => usedFiles.add(img))
    }
    
    // Video principal
    if (product.video) {
      usedFiles.add(product.video)
    }
    
    // Galería de videos
    if (product.videos && Array.isArray(product.videos)) {
      product.videos.forEach(vid => usedFiles.add(vid))
    }
  })
  
  return usedFiles
}

function getServerFiles(): { images: string[], videos: string[] } {
  const result = { images: [] as string[], videos: [] as string[] }
  
  // Imágenes
  const imagesDir = path.join(process.cwd(), 'public', 'images', 'products')
  if (fs.existsSync(imagesDir)) {
    const files = fs.readdirSync(imagesDir)
    result.images = files.map(f => `/images/products/${f}`)
  }
  
  // Videos
  const videosDir = path.join(process.cwd(), 'public', 'videos', 'products')
  if (fs.existsSync(videosDir)) {
    const files = fs.readdirSync(videosDir)
    result.videos = files.map(f => `/videos/products/${f}`)
  }
  
  return result
}

function findOrphanFiles() {
  console.log('🔍 Buscando archivos huérfanos...\n')
  
  const usedFiles = getUsedFiles()
  const serverFiles = getServerFiles()
  
  console.log('📊 Resumen:')
  console.log(`   - Archivos usados en productos: ${usedFiles.size}`)
  console.log(`   - Imágenes en servidor: ${serverFiles.images.length}`)
  console.log(`   - Videos en servidor: ${serverFiles.videos.length}`)
  console.log()
  
  // Encontrar huérfanos
  const orphanImages = serverFiles.images.filter(img => !usedFiles.has(img))
  const orphanVideos = serverFiles.videos.filter(vid => !usedFiles.has(vid))
  
  console.log('🗑️  Archivos huérfanos encontrados:\n')
  
  if (orphanImages.length === 0 && orphanVideos.length === 0) {
    console.log('✅ ¡No hay archivos huérfanos! Todo está limpio.')
    return { images: [], videos: [] }
  }
  
  if (orphanImages.length > 0) {
    console.log(`📸 Imágenes huérfanas (${orphanImages.length}):`)
    orphanImages.forEach(img => {
      const filename = img.split('/').pop()
      const filepath = path.join(process.cwd(), 'public', 'images', 'products', filename!)
      const stats = fs.statSync(filepath)
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.log(`   - ${filename} (${sizeMB} MB)`)
    })
    console.log()
  }
  
  if (orphanVideos.length > 0) {
    console.log(`🎬 Videos huérfanos (${orphanVideos.length}):`)
    orphanVideos.forEach(vid => {
      const filename = vid.split('/').pop()
      const filepath = path.join(process.cwd(), 'public', 'videos', 'products', filename!)
      const stats = fs.statSync(filepath)
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.log(`   - ${filename} (${sizeMB} MB)`)
    })
    console.log()
  }
  
  // Calcular espacio total
  let totalSize = 0
  orphanImages.forEach(img => {
    const filename = img.split('/').pop()
    const filepath = path.join(process.cwd(), 'public', 'images', 'products', filename!)
    totalSize += fs.statSync(filepath).size
  })
  orphanVideos.forEach(vid => {
    const filename = vid.split('/').pop()
    const filepath = path.join(process.cwd(), 'public', 'videos', 'products', filename!)
    totalSize += fs.statSync(filepath).size
  })
  
  const totalMB = (totalSize / (1024 * 1024)).toFixed(2)
  console.log(`💾 Espacio total ocupado por huérfanos: ${totalMB} MB\n`)
  
  return { images: orphanImages, videos: orphanVideos }
}

function deleteOrphanFiles(orphans: { images: string[], videos: string[] }) {
  console.log('🗑️  Eliminando archivos huérfanos...\n')
  
  let deleted = 0
  let errors = 0
  
  // Eliminar imágenes
  orphans.images.forEach(img => {
    const filename = img.split('/').pop()
    const filepath = path.join(process.cwd(), 'public', 'images', 'products', filename!)
    try {
      fs.unlinkSync(filepath)
      console.log(`✅ Eliminado: ${filename}`)
      deleted++
    } catch (error) {
      console.log(`❌ Error al eliminar ${filename}:`, error)
      errors++
    }
  })
  
  // Eliminar videos
  orphans.videos.forEach(vid => {
    const filename = vid.split('/').pop()
    const filepath = path.join(process.cwd(), 'public', 'videos', 'products', filename!)
    try {
      fs.unlinkSync(filepath)
      console.log(`✅ Eliminado: ${filename}`)
      deleted++
    } catch (error) {
      console.log(`❌ Error al eliminar ${filename}:`, error)
      errors++
    }
  })
  
  console.log()
  console.log(`✅ Archivos eliminados: ${deleted}`)
  if (errors > 0) {
    console.log(`❌ Errores: ${errors}`)
  }
}

// Ejecutar
const args = process.argv.slice(2)
const shouldDelete = args.includes('--delete')

console.log('🧹 Limpiador de Archivos Huérfanos\n')
console.log('═'.repeat(50))
console.log()

const orphans = findOrphanFiles()

if (shouldDelete && (orphans.images.length > 0 || orphans.videos.length > 0)) {
  console.log('⚠️  ADVERTENCIA: Estás a punto de eliminar estos archivos permanentemente.')
  console.log('   Asegúrate de que realmente no los necesitas.\n')
  deleteOrphanFiles(orphans)
} else if (orphans.images.length > 0 || orphans.videos.length > 0) {
  console.log('💡 Para eliminar estos archivos, ejecuta:')
  console.log('   npx tsx scripts/clean-orphan-files.ts --delete')
}

console.log()
console.log('═'.repeat(50))
console.log('✅ Proceso completado')
