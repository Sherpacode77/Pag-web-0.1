import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validar que sea un video MP4
    if (file.type !== "video/mp4") {
      return NextResponse.json(
        { error: "Solo se permiten archivos MP4" },
        { status: 400 }
      )
    }

    // Validar tamaño (50MB máximo)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El video debe ser menor a 50MB" },
        { status: 400 }
      )
    }

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), "public", "videos", "products")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generar nombre único
    const timestamp = Date.now()
    const originalName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_")
    const fileName = `${timestamp}-${originalName}`
    const filePath = path.join(uploadDir, fileName)

    // Convertir File a Buffer y guardar
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Retornar ruta relativa para usar en el frontend
    const relativePath = `/videos/products/${fileName}`

    return NextResponse.json({
      success: true,
      path: relativePath,
      filename: fileName,
    })
  } catch (error) {
    console.error("Error uploading video:", error)
    return NextResponse.json(
      { error: "Error al subir el video" },
      { status: 500 }
    )
  }
}

// GET - Listar videos disponibles
export async function GET(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const { readdir } = await import("fs/promises")
    const uploadDir = path.join(process.cwd(), "public", "videos", "products")

    if (!existsSync(uploadDir)) {
      return NextResponse.json([])
    }

    const files = await readdir(uploadDir)
    const videoFiles = files
      .filter((file) => file.endsWith(".mp4"))
      .map((file) => ({
        name: file,
        path: `/videos/products/${file}`,
      }))

    return NextResponse.json(videoFiles)
  } catch (error) {
    console.error("Error listing videos:", error)
    return NextResponse.json(
      { error: "Error al listar videos" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar video
export async function DELETE(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const { searchParams } = new URL(request.url)
    const filenameParam = searchParams.get("filename")

    if (!filenameParam) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      )
    }

    const filename = path.basename(filenameParam)
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return NextResponse.json({ error: "Filename inválido" }, { status: 400 })
    }

    const { unlink } = await import("fs/promises")
    const filePath = path.join(
      process.cwd(),
      "public",
      "videos",
      "products",
      filename
    )

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }

    await unlink(filePath)

    return NextResponse.json({
      success: true,
      message: "Video eliminado correctamente",
    })
  } catch (error) {
    console.error("Error deleting video:", error)
    return NextResponse.json(
      { error: "Error al eliminar video" },
      { status: 500 }
    )
  }
}
