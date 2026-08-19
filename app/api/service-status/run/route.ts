import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession, validateAdminCredentials } from "@/lib/auth"
import { runAllServiceChecks } from "@/lib/service-checks"

export const runtime = "nodejs"

// Autoriza con sesion de admin (uso desde el panel) O con HTTP Basic Auth
// usando las mismas credenciales de admin (uso desde un cron externo, p.ej.
// un Cron Job de hPanel: curl -u $ADMIN_USERNAME:$ADMIN_PASSWORD .../run).
// Evita crear una variable de entorno nueva solo para esto.
function isAuthorized(request: NextRequest): boolean {
  if (!ensureAdminSession(request)) return true

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Basic ")) return false

  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8")
    const separatorIndex = decoded.indexOf(":")
    if (separatorIndex === -1) return false
    const username = decoded.slice(0, separatorIndex)
    const password = decoded.slice(separatorIndex + 1)
    return validateAdminCredentials(username, password)
  } catch {
    return false
  }
}

async function handleRun(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const results = await runAllServiceChecks()
    return NextResponse.json({ ranAt: new Date().toISOString(), results })
  } catch (error) {
    console.error("POST /api/service-status/run:", error)
    return NextResponse.json({ error: "Error ejecutando la verificacion de servicios" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}
