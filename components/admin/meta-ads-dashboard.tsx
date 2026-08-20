"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, TrendingUp, AlertTriangle } from "lucide-react"
import type { AdAccountOption, AdsReport } from "@/lib/facebook-marketing-api"

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

function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  DELETED: "Eliminada",
  ARCHIVED: "Archivada",
}

export function MetaAdsDashboard() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [accounts, setAccounts] = useState<AdAccountOption[]>([])
  const [accountId, setAccountId] = useState<string>("")
  const [range, setRange] = useState(() => PRESETS[2].range())
  const [activePreset, setActivePreset] = useState("Últimos 7 días")
  const [report, setReport] = useState<AdsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchReport = useCallback(async (account: string, since: string, until: string) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ account, since, until })
      const res = await fetch(`/api/meta-ads?${params.toString()}`, { credentials: "include", cache: "no-store" })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error obteniendo datos de Meta Ads")
      }

      setConfigured(data.configured)
      setAccounts(data.accounts || [])
      if (data.report) setReport(data.report)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error obteniendo datos de Meta Ads"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial: primero pedimos sin cuenta fija para que el servidor nos
  // diga si esta configurado y cual es la cuenta por defecto.
  useEffect(() => {
    async function bootstrap() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ since: range.since, until: range.until })
        const res = await fetch(`/api/meta-ads?${params.toString()}`, { credentials: "include", cache: "no-store" })
        const data = await res.json()
        setConfigured(data.configured)
        setAccounts(data.accounts || [])
        if (data.report) {
          setReport(data.report)
          setAccountId(data.report.accountId)
        }
      } catch {
        setConfigured(false)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const newRange = preset.range()
    setRange(newRange)
    setActivePreset(preset.label)
    if (accountId) fetchReport(accountId, newRange.since, newRange.until)
  }

  function handleAccountChange(id: string) {
    setAccountId(id)
    fetchReport(id, range.since, range.until)
  }

  function handleCustomRangeApply() {
    setActivePreset("")
    if (accountId) fetchReport(accountId, range.since, range.until)
  }

  const summaryCards = useMemo(() => {
    if (!report) return []
    const s = report.summary
    return [
      { label: "Gasto", value: formatCop(s.spend) },
      { label: "Compras", value: formatNumber(s.purchases) },
      { label: "Valor de compras", value: formatCop(s.purchaseValue) },
      { label: "ROAS", value: s.roas !== null ? `${s.roas.toFixed(2)}x` : "—" },
      { label: "Costo por compra", value: s.costPerPurchase !== null ? formatCop(s.costPerPurchase) : "—" },
      { label: "Impresiones", value: formatNumber(s.impressions) },
      { label: "Clics", value: formatNumber(s.clicks) },
      { label: "CTR", value: formatPercent(s.ctr) },
      { label: "CPC", value: formatCop(s.cpc) },
      { label: "Agregados al carrito", value: formatNumber(s.addToCart) },
      { label: "Checkouts iniciados", value: formatNumber(s.initiateCheckout) },
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
        <h1 className="text-xl font-bold text-foreground">Meta Ads</h1>
        <div className="flex items-center gap-3 rounded-sm border border-border bg-card p-6 text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-500" />
          <div>
            <p className="font-medium text-foreground">La integración con Meta Marketing API no está configurada.</p>
            <p className="mt-1">
              Faltan las variables <code className="rounded bg-secondary px-1.5 py-0.5">FACEBOOK_MARKETING_ACCESS_TOKEN</code> y{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5">FACEBOOK_AD_ACCOUNT_ID</code> en el servidor.
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
          <h1 className="text-xl font-bold text-foreground">Meta Ads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Desempeño de campañas en tiempo real, por rango de fechas.</p>
        </div>
        <button
          type="button"
          onClick={() => accountId && fetchReport(accountId, range.since, range.until)}
          disabled={loading}
          className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* Selector de cuenta */}
      {accounts.length > 1 && (
        <div className="flex gap-2">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleAccountChange(acc.id)}
              className={`rounded-sm border px-4 py-2 text-sm font-medium transition-colors ${
                accountId === acc.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {acc.label}
            </button>
          ))}
        </div>
      )}

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

      {/* Tabla de campañas */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Campaña</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Gasto</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Impresiones</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">CTR</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">CPC</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Compras</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Costo/compra</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!report || report.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    {loading ? "Cargando..." : "No hay datos de campañas para este rango de fechas."}
                  </td>
                </tr>
              ) : (
                report.campaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium text-card-foreground">{c.campaignName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.status ? STATUS_LABEL[c.status] ?? c.status : "—"}</td>
                    <td className="px-4 py-3 text-right text-card-foreground">{formatCop(c.spend)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(c.impressions)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatPercent(c.ctr)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCop(c.cpc)}</td>
                    <td className="px-4 py-3 text-right text-card-foreground">{formatNumber(c.purchases)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {c.costPerPurchase !== null ? formatCop(c.costPerPurchase) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {c.roas !== null ? `${c.roas.toFixed(2)}x` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-sm border border-border bg-card p-4 text-xs text-muted-foreground">
        <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          Los datos se piden directamente a la Meta Marketing API en cada carga o clic en &quot;Actualizar&quot; — no es un
          reporte precalculado, así que refleja el estado más reciente disponible en Meta (puede tener unas horas de
          demora propia de Meta para consolidar conversiones atribuidas).
        </p>
      </div>
    </div>
  )
}
