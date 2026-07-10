import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { Readable } from "stream"

export const runtime = "nodejs"

const mimeMap: Record<string, string> = {
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".avi": "video/x-msvideo", ".mkv": "video/x-matroska",
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const requestedPath = `/videos/${params.path.join("/")}`
  const filePath = path.join(process.cwd(), "public", requestedPath)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 })
  }

  const fileSize = fs.statSync(filePath).size
  const ext = path.extname(requestedPath).toLowerCase()
  const contentType = mimeMap[ext] ?? "video/mp4"

  // El navegador pide rangos de bytes para hacer streaming/seek del video
  // en vez de esperar la descarga completa; sin esto, un video grande
  // tarda mucho en empezar a reproducirse.
  const range = request.headers.get("range")

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range)
    const start = match?.[1] ? parseInt(match[1], 10) : 0
    const end = match?.[2] ? parseInt(match[2], 10) : fileSize - 1

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      })
    }

    const clampedEnd = Math.min(end, fileSize - 1)
    const stream = fs.createReadStream(filePath, { start, end: clampedEnd })

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(clampedEnd - start + 1),
        "Content-Range": `bytes ${start}-${clampedEnd}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=604800",
      },
    })
  }

  const stream = fs.createReadStream(filePath)

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=604800",
    },
  })
}
