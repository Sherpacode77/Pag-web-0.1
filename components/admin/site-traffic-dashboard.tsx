"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, AlertTriangle } from "lucide-react"
import type { TrafficReport } from "@/lib/google-analytics-api"

function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const PRESETS: { label: string; range: () => { since: string; until: string } }[] = [
  { label: "Hoy", range: () => ({ since: toISODate(new Date()), until: toISODate(new Date()) }) },
  { label: "Ayer", range: () => ({ since: toISODate(daysAgo(1)), until: toISODate(daysAgo(1)) }) },
  { label: "Últimos 7 días", range: () => ({ since: toISODate(daysAgo(6)), until: toISODate(new Date()) }) },
  { label: "Últimos 14 días", range: () => ({ since: toISODate(daysAgo(13)), until: toISODate(new Date()) }) },
  { label: "Últimos 30 días", range: () => ({ since: toISODate(daysAgo(29)), until: toISODate(new Date()) }) },
  {
    label: "Este mes",
    range: () => {
      const now = new Date()
      return { since: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), until: toISODate(now) }
    },
  },
  {
    label: "Mes pasado",
    range: () => {
      const now = new Date()
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 86400000)
      const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1)
      return { since: toISODate(firstOfPrevMonth), until: toISODate(lastOfPrevMonth) }
    },
  },
]

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
}

const CHANNEL_LABEL: Record<string, string> = {
  "Organic Search": "Búsqueda orgánica",
  "Paid Search": "Búsqueda pagada",
  "Paid Social": "Redes sociales (pago)",
  "Organic Social": "Redes sociales (orgánico)",
  Direct: "Directo",
  Referral: "Referidos",
  Email: "Correo",
  Display: "Display",
  Unassigned: "Sin asignar",
}

export function SiteTrafficDashboard() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [range, setRange] = useState(() => PRESETS[2].range())
  const [activePreset, setActivePreset] = useState("Últimos 7 días")
  const [report, setReport] = useState<TrafficReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchReport = useCallback(async (since: string, until: string) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ since, until })
      const res = await fetch(`/api/site-traffic?${params.toString()}`, { credentials: "include", cache: "no-store" })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error obteniendo datos de Google Analytics")
      }

      setConfigured(data.configured)
      if (data.report) setReport(data.report)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error obteniendo datos de Google Analytics"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport(range.since, range.until)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const newRange = preset.range()
    setRange(newRange)
    setActivePreset(preset.label)
    fetchReport(newRange.since, newRange.until)
  }

  function handleCustomRangeApply() {
    setActivePreset("")
    fetchReport(range.since, range.until)
  }

  const summaryCards = useMemo(() => {
    if (!report) return []
    const s = report.summary
    return [
      { label: "Usuarios activos", value: formatNumber(s.activeUsers) },
      { label: "Usuarios nuevos", value: formatNumber(s.newUsers) },
      { label: "Sesiones", value: formatNumber(s.sessions) },
      { label: "Vistas de página", value: formatNumber(s.screenPageViews) },
      { label: "Duración media de sesión", value: formatDuration(s.averageSessionDuration) },
      { label: "Tasa de rebote", value: formatPercent(s.bounceRate) },
      { label: "Tasa de interacción", value: formatPercent(s.engagementRate) },
      { label: "Eventos totales", value: formatNumber(s.eventCount) },
      { label: "Carritos iniciados", value: formatNumber(s.cartsStarted) },
      { label: "Ventas generadas", value: formatNumber(report.sales.salesCount) },
      { label: "Productos vendidos", value: formatNumber(report.sales.unitsSold) },
      { label: "Ingresos por ventas", value: formatCop(report.sales.revenue) },
    ]
  }, [report])

  if (loading && configured === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (configured === false) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Tráfico del sitio</h1>
        <div className="flex items-center gap-3 rounded-sm border border-border bg-card p-6 text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-500" />
          <div>
            <p className="font-medium text-foreground">La integración con Google Analytics Data API no está configurada.</p>
            <p className="mt-1">
              Faltan <code className="rounded bg-secondary px-1.5 py-0.5">GOOGLE_ANALYTICS_CLIENT_EMAIL</code>,{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5">GOOGLE_ANALYTICS_PRIVATE_KEY</code> o{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5">GOOGLE_ANALYTICS_PROPERTY_ID</code> en el servidor.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tráfico del sitio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visitas, retención y desempeño del sitio, por rango de fechas.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchReport(range.since, range.until)}
          disabled={loading}
          className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* Rango de fechas */}
      <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activePreset === preset.label
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Desde</label>
            <input
              type="date"
              value={range.since}
              onChange={(e) => {
                setActivePreset("")
                setRange((r) => ({ ...r, since: e.target.value }))
              }}
              className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hasta</label>
            <input
              type="date"
              value={range.until}
              onChange={(e) => {
                setActivePreset("")
                setRange((r) => ({ ...r, until: e.target.value }))
              }}
              className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleCustomRangeApply}
            className="rounded-sm border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Aplicar rango
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tarjetas resumen */}
      {report && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-sm border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-lg font-bold text-card-foreground">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Canales de adquisición */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-secondary/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider">Canales de adquisición</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Canal</th>
                  <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider">Sesiones</th>
                  <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider">Usuarios</th>
                  <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider">Rebote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!report || report.channels.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      {loading ? "Cargando..." : "Sin datos para este rango."}
                    </td>
                  </tr>
                ) : (
                  report.channels.map((c) => (
                    <tr key={c.channel} className="hover:bg-secondary/20">
                      <td className="px-4 py-2 font-medium text-card-foreground">{CHANNEL_LABEL[c.channel] ?? c.channel}</td>
                      <td className="px-4 py-2 text-right text-card-foreground">{formatNumber(c.sessions)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(c.activeUsers)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatPercent(c.bounceRate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Páginas más visitadas */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-secondary/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider">Páginas más visitadas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Página</th>
                  <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider">Vistas</th>
                  <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!report || report.topPages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      {loading ? "Cargando..." : "Sin datos para este rango."}
                    </td>
                  </tr>
                ) : (
                  report.topPages.map((p) => (
                    <tr key={p.path} className="hover:bg-secondary/20">
                      <td className="px-4 py-2 font-medium text-card-foreground truncate max-w-[220px]" title={p.title}>
                        {p.path}
                      </td>
                      <td className="px-4 py-2 text-right text-card-foreground">{formatNumber(p.views)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatDuration(p.averageSessionDuration)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Estos datos excluyen las visitas al panel de administración (/admin) — solo reflejan el comportamiento de clientes
        en la tienda. Ventas, productos vendidos e ingresos vienen de los pedidos reales del sitio, no de Google Analytics.
      </p>
    </div>
  )
}
