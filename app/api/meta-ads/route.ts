import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import { getAdsReport, getConfiguredAdAccounts, isMetaAdsConfigured } from "@/lib/facebook-marketing-api"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!isMetaAdsConfigured()) {
    return NextResponse.json({ configured: false, accounts: [] }, { status: 200 })
  }

  const accounts = getConfiguredAdAccounts()
  const { searchParams } = request.nextUrl

  const accountId = searchParams.get("account") || accounts[0].id
  const since = searchParams.get("since") || ""
  const until = searchParams.get("until") || ""
  const campaignId = searchParams.get("campaign") || null

  const account = accounts.find((a) => a.id === accountId)
  if (!account) {
    return NextResponse.json({ error: "Cuenta publicitaria no reconocida" }, { status: 400 })
  }

  if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
    return NextResponse.json({ error: "since/until deben tener formato YYYY-MM-DD" }, { status: 400 })
  }

  try {
    const report = await getAdsReport(account.id, account.label, since, until, campaignId)
    return NextResponse.json({ configured: true, accounts, report })
  } catch (error) {
    console.error("GET /api/meta-ads:", error)
    const message = error instanceof Error ? error.message : "Error obteniendo datos de Meta Ads"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
