"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, AlertTriangle } from "lucide-react"

type ServiceStatusValue = "ok" | "degraded" | "failing" | "unknown"

type ServiceStatusRow = {
  service_id: string
  service_name: string
  status: ServiceStatusValue
  last_checked_at: string | null
  last_ok_at: string | null
  last_failure_at: string | null
  error_type: string | null
  error_message: string | null
  response_time_ms: number | null
  consecutive_failures: number
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "Nunca"
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Hace un momento"
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `Hace ${diffD} día${diffD !== 1 ? "s" : ""}`
}

// "Tiempo sin caidas": tiempo desde la ultima vez que fallo. Si nunca ha
// fallado, se muestra desde la ultima vez que se confirmo funcionando.
function formatUptime(row: ServiceStatusRow): string {
  if (row.status === "failing" || row.status === "degraded") return "Con problemas ahora"
  const since = row.last_failure_at ?? row.last_ok_at
  if (!since) return "Sin datos"
  const diffMs = Date.now() - new Date(since).getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return "Menos de 1 h"
  if (diffH < 24) return `${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `${diffD} día${diffD !== 1 ? "s" : ""}${row.last_failure_at ? "" : " (nunca ha fallado)"}`
}

const STATUS_BADGE: Record<ServiceStatusValue, string> = {
  ok: "bg-green-500/10 text-green-600",
  degraded: "bg-orange-500/10 text-orange-600",
  failing: "bg-red-500/10 text-red-600 animate-pulse",
  unknown: "bg-secondary text-muted-foreground",
}

const STATUS_LABEL: Record<ServiceStatusValue, string> = {
  ok: "OPERATIVO",
  degraded: "DEGRADADO",
  failing: "CON PROBLEMAS",
  unknown: "SIN VERIFICAR",
}

export function ServiceStatusManager() {
  const [rows, setRows] = useState<ServiceStatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/service-status", { credentials: "include", cache: "no-store" })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as ServiceStatusRow[]
      setRows(data)
    } catch {
      toast.error("No se pudo cargar el estado de los servicios")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function handleRunNow() {
    setRunning(true)
    try {
      const res = await fetch("/api/service-status/run", { method: "POST", credentials: "include" })
      if (!res.ok) throw new Error()
      await fetchStatus()
      toast.success("Verificación completada")
    } catch {
      toast.error("No se pudo ejecutar la verificación")
    } finally {
      setRunning(false)
    }
  }

  const failingCount = rows.filter((r) => r.status === "failing").length
  const degradedCount = rows.filter((r) => r.status === "degraded").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Estado de los Servicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verificaciones automáticas de las integraciones críticas del sitio.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunNow}
          disabled={running}
          className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Verificando..." : "Verificar ahora"}
        </button>
      </div>

      {failingCount > 0 && (
        <div className="flex items-center gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {failingCount} servicio{failingCount !== 1 ? "s" : ""} con problemas en este momento.
        </div>
      )}

      {degradedCount > 0 && (
        <div className="flex items-center gap-2 rounded-sm border border-orange-500/40 bg-orange-500/5 px-4 py-3 text-sm text-orange-600">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {degradedCount} servicio{degradedCount !== 1 ? "s" : ""} degradado{degradedCount !== 1 ? "s" : ""} (fallas parciales) en este momento.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Servicio</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Última verificación</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Tiempo sin caídas</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Tipo de error</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Detalle</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Respuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Todavía no hay verificaciones registradas. Haz clic en &quot;Verificar ahora&quot;.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.service_id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium text-card-foreground">{row.service_name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[row.status]}`}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatRelative(row.last_checked_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatUptime(row)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.error_type ?? "—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground" title={row.error_message ?? ""}>
                      {row.error_message ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.response_time_ms !== null ? `${row.response_time_ms} ms` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Verificación automática</p>
        <p className="mt-1">
          Estas verificaciones no corren solas todavía — hay que programar un Cron Job en hPanel
          (Hostinger → Avanzado → Cron Jobs) que llame esta URL cada 6 horas:
        </p>
        <code className="mt-2 block overflow-x-auto rounded-sm bg-secondary px-3 py-2 text-foreground">
          curl -u $ADMIN_USERNAME:$ADMIN_PASSWORD https://cerounobikes.com/api/service-status/run
        </code>
        <p className="mt-1">
          Mientras tanto, puedes usar el botón &quot;Verificar ahora&quot; para revisar manualmente.
        </p>
      </div>
    </div>
  )
}
