import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, safeEqual } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { sendAdsAlertsEmail } from "@/lib/email"
import {
  addDays,
  bogotaToday,
  computeAlerts,
  hasAnyAdDays,
  markAlertsEmailed,
  recordRun,
  saveAlerts,
  syncMetaAdDays,
} from "@/lib/meta-roas"

export const runtime = "nodejs"
export const maxDuration = 120

// La dispara la tarea de Windows de las 6 PM despues de sincronizar el Excel
// (sync_ventas.py), con el mismo SALES_SYNC_TOKEN. Tambien se puede lanzar
// desde el panel con la sesion de administrador.
function isAuthorized(request: NextRequest): boolean {
  if (getAdminSession(request)) return true
  const expected = process.env.SALES_SYNC_TOKEN
  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!expected || expected.length < 24 || !provided) return false
  return safeEqual(provided, expected)
}

// Meta sigue ajustando las conversiones de los ultimos dias: cada corrida
// reescribe 14 dias. La primera vez trae 90 para tener historia.
const RESYNC_DAYS = 14
const BACKFILL_DAYS = 90

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  const today = bogotaToday()
  let adsSynced = 0
  try {
    const since = addDays(today, -((await hasAnyAdDays()) ? RESYNC_DAYS : BACKFILL_DAYS))
    const { rows, accounts } = await syncMetaAdDays(since, today)
    adsSynced = rows

    const alerts = await computeAlerts(today, accounts)
    const fresh = await saveAlerts(today, alerts)
    const emailed = await sendAdsAlertsEmail(fresh, today)
    if (emailed) await markAlertsEmailed(today)

    await recordRun(true, adsSynced, alerts.length, null)
    return NextResponse.json({
      ok: true,
      since,
      until: today,
      adDaysSynced: adsSynced,
      alerts: alerts.length,
      newAlerts: fresh.length,
      emailed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("POST /api/meta-roas/run:", error)
    await recordRun(false, adsSynced, 0, message.slice(0, 1000)).catch(() => {})
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
