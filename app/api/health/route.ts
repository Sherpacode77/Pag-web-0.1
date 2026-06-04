import { NextResponse } from "next/server"
import { hasDatabaseUrl, getDbPool } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const status = {
    ok: false,
    timestamp: new Date().toISOString(),
    database: "not_configured" as "not_configured" | "ok" | "error",
    db_error: undefined as string | undefined,
  }

  if (hasDatabaseUrl()) {
    try {
      const pool = getDbPool()
      await pool.execute("SELECT 1")
      status.database = "ok"
      status.ok = true
    } catch (err) {
      status.database = "error"
      status.db_error = err instanceof Error ? err.message : String(err)
    }
  } else {
    // Sin BD configurada, el sitio sigue funcionando con JSON fallback
    status.ok = true
  }

  return NextResponse.json(status, { status: status.ok ? 200 : 503 })
}
