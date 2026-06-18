import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import { writeFile, mkdir, readdir, unlink } from "fs/promises"
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

    if (file.type !== "video/mp4") {
      return NextResponse.json(
        { error: "Solo se permiten archivos MP4" },
        { status: 400 }
      )
    }

    // 500MB max — filesystem can handle it, MariaDB cannot
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El video debe ser menor a 500MB" },
        { status: 400 }
      )
    }

    const uploadDir = path.join(process.cwd(), "public", "videos", "products")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const timestamp = Date.now()
    const originalName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_")
    const fileName = `${timestamp}-${originalName}`
    const relativePath = `/videos/products/${fileName}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, buffer)

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

    const uploadDir = path.join(process.cwd(), "public", "videos", "products")

    if (!existsSync(uploadDir)) {
      return NextResponse.json({ videos: [] })
    }

    const files = await readdir(uploadDir)
    const videoFiles = files
      .filter((file) => file.endsWith(".mp4") || file.endsWith(".webm") || file.endsWith(".mov"))
      .map((file) => ({
        name: file,
        path: `/videos/products/${file}`,
      }))

    return NextResponse.json({ videos: videoFiles })
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

    const filePath = path.join(process.cwd(), "public", "videos", "products", filename)

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
