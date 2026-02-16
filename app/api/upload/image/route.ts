import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import fs from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no válido. Use JPG, PNG o WEBP" },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 5MB" },
        { status: 400 }
      )
    }

    // Leer archivo como buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Crear nombre único para evitar conflictos
    const timestamp = Date.now()
    const originalName = file.name.replace(/\s+/g, "-").toLowerCase()
    const fileName = `${timestamp}-${originalName}`

    // Ruta donde se guardará (public/images/products/)
    const uploadDir = path.join(process.cwd(), "public", "images", "products")
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)

    // Guardar archivo
    await writeFile(filePath, buffer)

    // Retornar ruta relativa para usar en la base de datos
    const relativePath = `/images/products/${fileName}`

    return NextResponse.json({
      success: true,
      path: relativePath,
      fileName: fileName,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    )
  }
}
