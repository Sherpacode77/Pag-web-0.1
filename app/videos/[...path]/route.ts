import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const requestedPath = `/videos/${params.path.join("/")}`
  const filePath = path.join(process.cwd(), "public", requestedPath)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)

  const ext = path.extname(requestedPath).toLowerCase()
  const mimeMap: Record<string, string> = {
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
    ".avi": "video/x-msvideo", ".mkv": "video/x-matroska",
  }
  const contentType = mimeMap[ext] ?? "video/mp4"

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileBuffer.byteLength),
      "Cache-Control": "public, max-age=604800",
    },
  })
}
