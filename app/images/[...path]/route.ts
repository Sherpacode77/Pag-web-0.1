import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getAssetMetadataByPath, isDbAssetStorageEnabled } from "@/lib/db-assets"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const requestedPath = `/images/${params.path.join("/")}`
  const filePath = path.join(process.cwd(), "public", requestedPath)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)

  let contentType = "application/octet-stream"
  if (isDbAssetStorageEnabled()) {
    const meta = await getAssetMetadataByPath(requestedPath)
    if (meta?.content_type) contentType = meta.content_type
  }

  if (contentType === "application/octet-stream") {
    const ext = path.extname(requestedPath).toLowerCase()
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
      ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
      ".avif": "image/avif",
    }
    contentType = mimeMap[ext] ?? "image/jpeg"
  }

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileBuffer.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
