import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { ALERT_RULES, IVA, getLastRun, getRoasReport, listRecentAlerts, markAlertsSeen } from "@/lib/meta-roas"

export const runtime = "nodejs"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized
  if (!hasDatabaseUrl()) return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })

  const { searchParams } = request.nextUrl
  const since = searchParams.get("since") || ""
  const until = searchParams.get("until") || ""
  if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
    return NextResponse.json({ error: "since/until deben tener formato YYYY-MM-DD" }, { status: 400 })
  }

  try {
    const [report, alerts, lastRun] = await Promise.all([getRoasReport(since, until), listRecentAlerts(14), getLastRun()])
    return NextResponse.json({ report, alerts, lastRun, rules: ALERT_RULES, iva: IVA })
  } catch (error) {
    console.error("GET /api/meta-roas:", error)
    return NextResponse.json({ error: "Error obteniendo el ROAS" }, { status: 500 })
  }
}

const seenSchema = z.object({ seenIds: z.array(z.number().int().positive()).max(500) })

export async function PATCH(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  const parsed = seenSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido" }, { status: 400 })

  try {
    await markAlertsSeen(parsed.data.seenIds)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PATCH /api/meta-roas:", error)
    return NextResponse.json({ error: "Error actualizando las alertas" }, { status: 500 })
  }
}
