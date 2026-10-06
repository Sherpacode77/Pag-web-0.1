import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession, safeEqual } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { getSalesLogStats, listSalesLog, replaceSalesLogForSheet } from "@/lib/db-sales-log"

export const runtime = "nodejs"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const rowSchema = z.object({
  rowKey: z.string().min(1).max(40),
  saleDate: z.string().regex(DATE_RE),
  channel: z.string().trim().min(1).max(40),
  channelRaw: z.string().max(80).nullish(),
  customerName: z.string().max(200).nullish(),
  productCode: z.string().max(40).nullish(),
  quantity: z.number().int().min(1).max(10000),
  grossAmount: z.number().finite(),
  shipping: z.number().finite(),
  netAmount: z.number().finite(),
  isReturn: z.boolean(),
})

const syncSchema = z.object({
  sheet: z.string().trim().min(1).max(60),
  rows: z.array(rowSchema).max(5000),
})

// Token dedicado para la automatizacion que sincroniza el Excel: solo permite
// reemplazar las ventas de una hoja, no da acceso al resto del panel (misma
// idea que SERVICE_STATUS_CRON_TOKEN en /api/service-status/run).
function hasValidSyncToken(request: NextRequest): boolean {
  const expected = process.env.SALES_SYNC_TOKEN
  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  if (!expected || expected.length < 24 || !provided) return false
  return safeEqual(provided, expected)
}

export async function POST(request: NextRequest) {
  if (!hasValidSyncToken(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const parsed = syncSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload invalido", details: parsed.error.flatten() }, { status: 400 })
    }

    const { sheet, rows } = parsed.data
    const seen = new Set<string>()
    for (const r of rows) {
      if (seen.has(r.rowKey)) {
        return NextResponse.json({ error: `rowKey duplicado: ${r.rowKey}` }, { status: 400 })
      }
      seen.add(r.rowKey)
    }

    const count = await replaceSalesLogForSheet(sheet, rows)
    return NextResponse.json({ sheet, synced: count })
  } catch (error) {
    console.error("POST /api/sales-log:", error)
    return NextResponse.json({ error: "Error sincronizando las ventas" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  const empty = {
    stats: { total: { count: 0, units: 0, grossAmount: 0, netAmount: 0 }, byChannel: [], returnsExcluded: 0, lastSyncAt: null },
    sales: [],
  }
  if (!hasDatabaseUrl()) return NextResponse.json(empty)

  const { searchParams } = request.nextUrl
  const since = searchParams.get("since") || ""
  const until = searchParams.get("until") || ""
  const channel = searchParams.get("channel")

  if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
    return NextResponse.json({ error: "since/until deben tener formato YYYY-MM-DD" }, { status: 400 })
  }

  try {
    const [stats, sales] = await Promise.all([
      getSalesLogStats(since, until),
      listSalesLog(channel && channel !== "all" ? channel : null, since, until),
    ])
    return NextResponse.json({ stats, sales })
  } catch (error) {
    console.error("GET /api/sales-log:", error)
    return NextResponse.json({ error: "Error obteniendo el informe de ventas" }, { status: 500 })
  }
}
