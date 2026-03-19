import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"

// GET - Listar todas las imágenes disponibles
export async function GET(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const imagesDir = path.join(process.cwd(), "public", "images", "products")
    
    // Verificar si el directorio existe
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json({ images: [] })
    }

    // Leer archivos del directorio
    const files = fs.readdirSync(imagesDir)
    
    // Filtrar solo imágenes y obtener información
    const images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase()
        return [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
      })
      .map((file) => {
        const filePath = path.join(imagesDir, file)
        const stats = fs.statSync(filePath)
        return {
          name: file,
          path: `/images/products/${file}`,
          size: stats.size,
          uploadedAt: stats.mtime,
        }
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

    return NextResponse.json({ images })
  } catch (error) {
    console.error("Error listing images:", error)
    return NextResponse.json(
      { error: "Error al listar imágenes" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar una imagen
export async function DELETE(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const { searchParams } = new URL(request.url)
    const imagePath = searchParams.get("path")
    
    if (!imagePath) {
      return NextResponse.json(
        { error: "Ruta de imagen requerida" },
        { status: 400 }
      )
    }

    if (!imagePath.startsWith("/images/products/")) {
      return NextResponse.json(
        { error: "Ruta inválida" },
        { status: 400 }
      )
    }

    // Construir ruta física del archivo
    const fileName = path.basename(imagePath)
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      return NextResponse.json(
        { error: "Nombre de archivo inválido" },
        { status: 400 }
      )
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "images",
      "products",
      fileName
    )

    // Verificar si existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Imagen no encontrada" },
        { status: 404 }
      )
    }

    // Eliminar archivo
    fs.unlinkSync(filePath)

    return NextResponse.json({ success: true, deleted: imagePath })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json(
      { error: "Error al eliminar imagen" },
      { status: 500 }
    )
  }
}
