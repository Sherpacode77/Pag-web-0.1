"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, TrendingUp, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react"
import type { AdAccountOption, AdsReport } from "@/lib/facebook-marketing-api"

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

function ComparisonBadge({ change }: { change: number | null | undefined }) {
  if (change === null || change === undefined) return null
  const isUp = change > 0
  const isFlat = Math.abs(change) < 0.05
  if (isFlat) return <span className="text-xs font-medium text-muted-foreground">sin cambio</span>

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-green-600" : "text-red-600"}`}
    >
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  )
}

type Props = {
  since: string
  until: string
}

export function MetaAdsPanel({ since, until }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [accounts, setAccounts] = useState<AdAccountOption[]>([])
  const [accountId, setAccountId] = useState<string>("")
  const [campaignId, setCampaignId] = useState<string>("")
  const [report, setReport] = useState<AdsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchReport = useCallback(async (account: string, s: string, u: string, campaign: string) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ account, since: s, until: u })
      if (campaign) params.set("campaign", campaign)
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
        const params = new URLSearchParams({ since, until })
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

  // Re-consulta cuando cambia el rango de fechas que llega del padre.
  useEffect(() => {
    if (accountId) fetchReport(accountId, since, until, campaignId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since, until])

  function handleAccountChange(id: string) {
    setAccountId(id)
    setCampaignId("")
    fetchReport(id, since, until, "")
  }

  function handleCampaignChange(id: string) {
    setCampaignId(id)
    fetchReport(accountId, since, until, id)
  }

  const summaryCards = useMemo(() => {
    if (!report) return []
    const s = report.summary
    const c = report.comparison
    return [
      { label: "Gasto", value: formatCop(s.spend), change: c?.spend },
      { label: "Compras", value: formatNumber(s.purchases), change: c?.purchases },
      { label: "Valor de compras", value: formatCop(s.purchaseValue), change: c?.purchaseValue },
      { label: "ROAS", value: s.roas !== null ? `${s.roas.toFixed(2)}x` : "—", change: c?.roas },
      { label: "Costo por compra", value: s.costPerPurchase !== null ? formatCop(s.costPerPurchase) : "—", change: c?.costPerPurchase },
      { label: "Impresiones", value: formatNumber(s.impressions), change: c?.impressions },
      { label: "Clics", value: formatNumber(s.clicks), change: c?.clicks },
      { label: "CTR", value: formatPercent(s.ctr), change: c?.ctr },
      { label: "CPC", value: formatCop(s.cpc), change: c?.cpc },
      { label: "Agregados al carrito", value: formatNumber(s.addToCart), change: c?.addToCart },
      { label: "Checkouts iniciados", value: formatNumber(s.initiateCheckout), change: c?.initiateCheckout },
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
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
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

          {report && report.activeCampaigns.length > 0 && (
            <select
              value={campaignId}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas las campañas</option>
              {report.activeCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={() => accountId && fetchReport(accountId, since, until, campaignId)}
          disabled={loading}
          className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tarjetas resumen con comparacion vs periodo anterior */}
      {report && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-sm border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-lg font-bold text-card-foreground">{card.value}</p>
                <ComparisonBadge change={card.change} />
              </div>
            </div>
          ))}
        </div>
      )}

      {report && !report.previousSummary && (
        <p className="text-xs text-muted-foreground">
          No hay datos del periodo anterior ({report.previousSince} a {report.previousUntil}) para comparar.
        </p>
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
                report.campaigns
                  .filter((c) => !campaignId || c.campaignId === campaignId)
                  .map((c) => (
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
