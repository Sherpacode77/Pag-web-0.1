import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import { getTrafficReport, isGoogleAnalyticsConfigured } from "@/lib/google-analytics-api"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!isGoogleAnalyticsConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 })
  }

  const { searchParams } = request.nextUrl
  const since = searchParams.get("since") || ""
  const until = searchParams.get("until") || ""

  if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
    return NextResponse.json({ error: "since/until deben tener formato YYYY-MM-DD" }, { status: 400 })
  }

  try {
    const report = await getTrafficReport(since, until)
    return NextResponse.json({ configured: true, report })
  } catch (error) {
    console.error("GET /api/site-traffic:", error)
    const message = error instanceof Error ? error.message : "Error obteniendo datos de Google Analytics"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
