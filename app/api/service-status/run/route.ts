import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession, safeEqual } from "@/lib/auth"
import { runAllServiceChecks } from "@/lib/service-checks"

export const runtime = "nodejs"

// Autoriza con sesion de admin (uso desde el panel) O con un token dedicado
// via query param (uso desde el cron externo que llama esta ruta cada 6h).
// A proposito NO reutiliza ADMIN_USERNAME/ADMIN_PASSWORD -- esas credenciales
// dan acceso total al panel, y este token queda guardado en texto plano en
// la configuracion del cron job (visible para quien administre esa cuenta
// externa). Si SERVICE_STATUS_CRON_TOKEN se filtra, lo unico que se puede
// hacer con el es disparar esta verificacion, nada mas.
function isAuthorized(request: NextRequest): boolean {
  if (!ensureAdminSession(request)) return true

  const expectedToken = process.env.SERVICE_STATUS_CRON_TOKEN
  const providedToken = request.nextUrl.searchParams.get("token")
  if (!expectedToken || !providedToken) return false

  return safeEqual(providedToken, expectedToken)
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
