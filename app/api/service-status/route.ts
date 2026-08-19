import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { listServiceStatus } from "@/lib/db-service-status"

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const status = await listServiceStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error("GET /api/service-status:", error)
    return NextResponse.json({ error: "Error obteniendo el estado de los servicios" }, { status: 500 })
  }
}
