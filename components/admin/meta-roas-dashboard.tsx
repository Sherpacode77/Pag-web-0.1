"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ArrowUpRight, Ban, Check, ChevronDown, Coins, Pause, RefreshCw, Tag, TrendingDown, Wallet } from "lucide-react"
import type { BusinessProfit, KnownAd, ProductCost, RoasReport, RoasRow, StoredAlert } from "@/lib/meta-roas"
import { RESULT_LABELS } from "@/lib/meta-roas-labels"

function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const PRESETS: { label: string; range: () => { since: string; until: string } }[] = [
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
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { since: toISODate(new Date(last.getFullYear(), last.getMonth(), 1)), until: toISODate(last) }
    },
  },
]

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
const roasText = (n: number) => `${n.toFixed(2).replace(".", ",")}x`
const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))

// Semaforo del ROAS: cuantos pesos vuelven por cada peso invertido (con IVA).
function roasVerdict(row: { roas: number | null; hasSalesTracking: boolean; spend: number }) {
  if (!row.hasSalesTracking) return { text: "Sin ventas medibles", cls: "bg-secondary text-muted-foreground" }
  if (row.roas === null || row.roas === 0) return { text: "Sin ventas", cls: "bg-red-500/15 text-red-500" }
  if (row.roas >= 3) return { text: "Muy rentable", cls: "bg-green-500/15 text-green-500" }
  if (row.roas >= 2) return { text: "Rentable", cls: "bg-green-500/10 text-green-400" }
  if (row.roas >= 1) return { text: "Ajustado", cls: "bg-amber-500/15 text-amber-500" }
  return { text: "Pierde plata", cls: "bg-red-500/15 text-red-500" }
}

const ALERT_STYLE: Record<StoredAlert["kind"], { label: string; cls: string; icon: typeof Pause }> = {
  account: { label: "Cuenta", cls: "border-red-500/60 bg-red-500/10", icon: Ban },
  pause: { label: "Pausar", cls: "border-red-500/60 bg-red-500/10", icon: Pause },
  limit: { label: "Limitar gasto", cls: "border-amber-500/60 bg-amber-500/10", icon: TrendingDown },
  scale: { label: "Escalar", cls: "border-green-500/60 bg-green-500/10", icon: ArrowUpRight },
}

type ApiData = {
  report: RoasReport
  business: BusinessProfit
  alerts: StoredAlert[]
  lastRun: { ranAt: string; ok: boolean; message: string | null } | null
}

export function MetaRoasDashboard() {
  const [range, setRange] = useState(() => PRESETS[2].range())
  const [activePreset, setActivePreset] = useState("Últimos 30 días")
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams(range)
      const res = await fetch(`/api/meta-roas?${params}`, { credentials: "include", cache: "no-store" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "No se pudo cargar el ROAS")
        return
      }
      setData(json)
    } catch {
      setError("No se pudo cargar el ROAS")
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function runNow() {
    setRunning(true)
    setNotice(null)
    setError(null)
    try {
      const res = await fetch("/api/meta-roas/run", { method: "POST", credentials: "include" })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error || "La actualización falló")
      } else {
        setNotice(
          `Datos de Meta actualizados. ${json.newAlerts ? `${json.newAlerts} alerta(s) nueva(s)${json.emailed ? ", enviadas por correo" : ""}.` : "Sin alertas nuevas."}`
        )
        await fetchData()
      }
    } catch {
      setError("La actualización falló")
    } finally {
      setRunning(false)
    }
  }

  async function markSeen(ids: number[]) {
    await fetch("/api/meta-roas", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seenIds: ids }),
    })
    fetchData()
  }

  const report = data?.report
  const unseen = data?.alerts.filter((a) => !a.seenAt) ?? []
  const seen = data?.alerts.filter((a) => a.seenAt) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">ROAS de Meta Ads</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Cuántos pesos de venta regresan por cada peso invertido en Meta. El gasto incluye el IVA del 19% que Meta
            no muestra, y las ventas son las de Mensajería 2026 marcadas con la letra del creativo (columna
            &quot;Campaña&quot;). Se actualiza solo todos los días a las 6:00 p. m.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={runNow}
            disabled={running}
            className="flex items-center gap-2 rounded-sm border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Actualizando…" : "Actualizar ahora"}
          </button>
          <p className="text-xs text-muted-foreground">
            {data?.lastRun
              ? `${data.lastRun.ok ? "Última actualización" : "Última actualización FALLÓ"}: ${formatDateTime(data.lastRun.ranAt)}`
              : "Aún no se ha actualizado"}
          </p>
        </div>
      </div>

      {error && <p className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p className="rounded-sm border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-500">{notice}</p>}
      {data?.lastRun && !data.lastRun.ok && data.lastRun.message && (
        <p className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Error de la última actualización: {data.lastRun.message}
        </p>
      )}

      {/* Alertas */}
      <section className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Alertas {unseen.length > 0 && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unseen.length}</span>}
            </h2>
          </div>
          {unseen.length > 0 && (
            <button
              type="button"
              onClick={() => markSeen(unseen.map((a) => a.id))}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3.5 w-3.5" /> Marcar todas como vistas
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Se calculan cada día: los últimos 7 días completos contra los 7 anteriores, y el ROAS de los últimos 30 días
          (pausar si queda por debajo de 1,5x). Son recomendaciones: nada se pausa ni cambia de presupuesto solo.
        </p>
        {unseen.length === 0 && (
          <p className="rounded-sm bg-secondary/60 p-3 text-sm text-muted-foreground">No hay alertas pendientes.</p>
        )}
        {unseen.map((a) => (
          <AlertCard key={a.id} alert={a} onSeen={() => markSeen([a.id])} />
        ))}
        {seen.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">Alertas vistas de los últimos 14 días ({seen.length})</summary>
            <div className="mt-2 flex flex-col gap-2 opacity-70">
              {seen.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          </details>
        )}
      </section>

      {/* Rango */}
      <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setRange(p.range())
                setActivePreset(p.label)
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activePreset === p.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {(["since", "until"] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{field === "since" ? "Desde" : "Hasta"}</label>
              <input
                type="date"
                value={range[field]}
                onChange={(e) => {
                  setActivePreset("")
                  setRange((r) => ({ ...r, [field]: e.target.value }))
                }}
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Inversión con IVA" value={loading || !report ? "…" : cop(report.totals.spend)} hint={report ? `Meta muestra ${cop(report.totals.spendMeta)}` : undefined} />
        <Kpi label="Ventas de Meta" value={loading || !report ? "…" : String(report.totals.sales)} />
        <Kpi label="Ingreso (sin envío)" value={loading || !report ? "…" : cop(report.totals.revenue)} />
        <Kpi
          label="ROAS total"
          value={loading || !report ? "…" : report.totals.roas !== null ? roasText(report.totals.roas) : "—"}
          hint={report?.totals.roas ? `Por cada $1 invertido vuelven $${report.totals.roas.toFixed(2).replace(".", ",")}` : undefined}
        />
      </div>

      {data?.business && !loading && <BusinessProfitSection business={data.business} />}

      {report && (
        <>
          <RoasTable
            title="Por creativo"
            subtitle="Cada creativo se identifica con su letra, la misma que va en la columna “Campaña” del Excel."
            rows={report.creatives}
            showLetter
          />
          <RoasTable
            title="Por campaña"
            subtitle="El costo por resultado depende del objetivo de cada campaña (conversaciones, vistas de página, etc.)."
            rows={report.campaigns}
          />

          {report.unattributed.length > 0 && (
            <section className="rounded-sm border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
              <p className="font-semibold text-foreground">
                {report.unattributed.length} venta(s) de Meta Ads sin creativo reconocido en este rango
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                No entran al ROAS hasta que su columna “Campaña” tenga una letra que exista abajo, en “Letras de creativos”.
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                {report.unattributed.map((s, i) => (
                  <li key={i}>
                    {s.contactDate} · {s.customerName || "(sin nombre)"} · {cop(s.amount)} · letra: {s.letter || "vacía"}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <CostsAndReferences onSaved={fetchData} />
      <CreativeLetters onSaved={fetchData} />
    </div>
  )
}

function AlertCard({ alert, onSeen }: { alert: StoredAlert; onSeen?: () => void }) {
  const style = ALERT_STYLE[alert.kind]
  const Icon = style.icon
  return (
    <div className={`flex gap-3 rounded-sm border-l-4 p-3 ${style.cls}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider">
          {style.label} · <span className="font-normal normal-case text-muted-foreground">{alert.runDate}</span>
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">{alert.scopeLabel}</p>
        <p className="text-sm text-foreground">{alert.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
      </div>
      {onSeen && (
        <button type="button" onClick={onSeen} className="self-start text-xs text-muted-foreground hover:text-foreground" title="Marcar como vista">
          <Check className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function RoasTable({ title, subtitle, rows, showLetter }: { title: string; subtitle: string; rows: RoasRow[]; showLetter?: boolean }) {
  return (
    <section className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="min-w-[220px] px-3 py-2 text-left font-medium">{showLetter ? "Creativo" : "Campaña"}</th>
              <th className="px-3 py-2 text-right font-medium">Gasto + IVA</th>
              <th className="px-3 py-2 text-right font-medium">Resultados</th>
              <th className="px-3 py-2 text-right font-medium">Costo por resultado</th>
              <th className="px-3 py-2 text-right font-medium">Ventas</th>
              <th className="px-3 py-2 text-right font-medium">Ingreso</th>
              <th className="px-3 py-2 text-right font-medium">Costo producto</th>
              <th className="px-3 py-2 text-right font-medium">Utilidad</th>
              <th className="px-3 py-2 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const verdict = roasVerdict(r)
              const label = RESULT_LABELS[r.resultType]
              return (
                <tr key={r.key} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      {r.letter && (
                        <span className="mt-0.5 inline-flex min-w-6 items-center justify-center rounded-sm bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                          {r.letter}
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{r.label}</p>
                        {showLetter && r.campaignName && <p className="text-xs text-muted-foreground">{r.campaignName}</p>}
                        {r.letter && (
                          <p className={`text-xs ${r.references.length ? "text-muted-foreground" : "text-amber-500"}`}>
                            {r.references.length ? `Referencia: ${r.references.join(", ")}` : "Falta la referencia que ofrece"}
                          </p>
                        )}
                        {r.lastSpendDate && <p className="text-xs text-muted-foreground">Último gasto: {r.lastSpendDate}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{cop(r.spend)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {r.resultType === "impressions" ? r.results.toLocaleString("es-CO") : r.results}
                    <p className="text-xs text-muted-foreground">{label.plural}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {r.costPerResult !== null ? cop(r.costPerResult) : "—"}
                    <p className="text-xs text-muted-foreground">{label.per}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {r.hasSalesTracking ? r.sales : "—"}
                    {r.costPerSale !== null && <p className="text-xs text-muted-foreground">{cop(r.costPerSale)} c/u</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{r.hasSalesTracking ? cop(r.revenue) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {r.productCost !== null ? cop(r.productCost) : "—"}
                    {r.unitsWithoutCost > 0 && <p className="text-xs text-amber-500">{r.unitsWithoutCost} und. sin costo</p>}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${r.profit === null ? "" : r.profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {r.profit !== null ? cop(r.profit) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <p className="font-bold text-foreground">{r.roas !== null ? roasText(r.roas) : "—"}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${verdict.cls}`}>{verdict.text}</span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  Sin gasto en Meta en este rango.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CreativeLetters({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [ads, setAds] = useState<KnownAd[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/meta-roas/creatives", { credentials: "include", cache: "no-store" })
    const json = await res.json()
    setAds(json.ads || [])
    setDrafts(Object.fromEntries((json.ads || []).map((a: KnownAd) => [a.adId, a.letter || ""])))
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function save(ad: KnownAd) {
    setMessage(null)
    const letter = (drafts[ad.adId] || "").trim()
    const res = await fetch("/api/meta-roas/creatives", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adId: ad.adId, letter: letter || null, label: ad.adName }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMessage(json.error || "No se pudo guardar")
      return
    }
    setMessage(letter ? `“${ad.adName}” ahora es el creativo ${letter.toUpperCase()}.` : `Se quitó la letra de “${ad.adName}”.`)
    await load()
    onSaved()
  }

  const usedLetters = new Set(ads.map((a) => a.letter).filter(Boolean))

  return (
    <section className="rounded-sm border border-border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
        <span className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-base font-bold text-foreground">Letras de creativos</span>
            <span className="block text-xs text-muted-foreground">
              Cada creativo nuevo recibe una letra propia. Escríbela aquí y en la columna “Campaña” de cada venta que traiga.
            </span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-border p-4">
          {usedLetters.size > 0 && (
            <p className="text-xs text-muted-foreground">Letras en uso: {[...usedLetters].sort().join(", ")}</p>
          )}
          {message && <p className="text-sm text-foreground">{message}</p>}
          <div className="max-h-96 overflow-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Anuncio</th>
                  <th className="px-3 py-2 text-left font-medium">Campaña</th>
                  <th className="px-3 py-2 text-left font-medium">Último dato</th>
                  <th className="px-3 py-2 text-left font-medium">Letra</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.adId} className="border-t border-border">
                    <td className="px-3 py-2">{ad.adName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{ad.campaignName}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{ad.lastDate}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={drafts[ad.adId] ?? ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [ad.adId]: e.target.value.toUpperCase() }))}
                          maxLength={10}
                          className="w-16 rounded-sm border border-input bg-background px-2 py-1 text-sm uppercase"
                          placeholder="—"
                        />
                        {(drafts[ad.adId] ?? "") !== (ad.letter ?? "") && (
                          <button type="button" onClick={() => save(ad)} className="text-xs font-medium text-primary hover:underline">
                            Guardar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {ads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      Aún no hay anuncios: se llenan con la primera actualización.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function BusinessProfitSection({ business: b }: { business: BusinessProfit }) {
  const positive = b.profit >= 0
  return (
    <section className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">Utilidad aproximada del negocio</h2>
          <p className="text-xs text-muted-foreground">
            Todas las ventas del rango (cualquier canal, por fecha de compra) − costo de compra de lo vendido − toda la
            pauta de Meta con IVA. No incluye empaques, comisiones ni costos fijos.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Ingreso (sin envío)" value={cop(b.revenue)} hint={`${b.units} unidades`} />
        <Kpi label="Costo de producto" value={`− ${cop(b.productCost)}`} />
        <Kpi
          label="Pauta Meta con IVA"
          value={`− ${cop(b.metaSpend)}`}
          hint={b.metaSpendOther > 0 ? `Productos ${cop(b.metaSpendProducts)} · otros ${cop(b.metaSpendOther)}` : undefined}
        />
        <div className={`rounded-sm border p-3 ${positive ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Utilidad aproximada</p>
          <p className={`mt-1 text-lg font-bold ${positive ? "text-green-500" : "text-red-500"}`}>{cop(b.profit)}</p>
        </div>
        <Kpi label="Margen" value={b.margin !== null ? `${b.margin.toFixed(1).replace(".", ",")}%` : "—"} hint="Utilidad ÷ ingreso" />
      </div>
      {b.unitsWithoutCost > 0 && (
        <p className="rounded-sm border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-foreground">
          {b.unitsWithoutCost} unidad(es) vendidas no tienen costo registrado (códigos: {b.unknownCodes.join(", ")}). Su
          costo cuenta como $0 hasta que lo agregues en “Costos de compra”, así que la utilidad real es menor.
        </p>
      )}
      {b.byChannel.length > 0 && (
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Canal</th>
                <th className="px-3 py-2 text-right font-medium">Ventas</th>
                <th className="px-3 py-2 text-right font-medium">Unidades</th>
                <th className="px-3 py-2 text-right font-medium">Ingreso</th>
                <th className="px-3 py-2 text-right font-medium">Costo producto</th>
                <th className="px-3 py-2 text-right font-medium">Margen bruto</th>
              </tr>
            </thead>
            <tbody>
              {b.byChannel.map((c) => (
                <tr key={c.channel} className="border-t border-border">
                  <td className="px-3 py-2">{c.channel}</td>
                  <td className="px-3 py-2 text-right">{c.sales}</td>
                  <td className="px-3 py-2 text-right">{c.units}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{cop(c.revenue)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{cop(c.productCost)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{cop(c.grossProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Margen bruto por canal = ingreso − costo de producto. La pauta se resta una sola vez en el total.
      </p>
    </section>
  )
}

function CostsAndReferences({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [costs, setCosts] = useState<ProductCost[]>([])
  const [letters, setLetters] = useState<{ letter: string; codes: string[] }[]>([])
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({})
  const [newCost, setNewCost] = useState({ code: "", name: "", unitCost: "" })
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/meta-roas/costs", { credentials: "include", cache: "no-store" })
    const json = await res.json()
    setCosts(json.costs || [])
    setLetters(json.letters || [])
    setCostDrafts(Object.fromEntries((json.costs || []).map((c: ProductCost) => [c.code, String(c.unitCost)])))
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  async function post(body: object, ok: string) {
    setMessage(null)
    const res = await fetch("/api/meta-roas/costs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
      setMessage(json.error || "No se pudo guardar")
      return false
    }
    setMessage(ok)
    await load()
    onSaved()
    return true
  }

  function toggleCode(letter: string, code: string) {
    const current = letters.find((l) => l.letter === letter)?.codes ?? []
    const codes = current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    post({ type: "letter", letter, codes }, `Creativo ${letter}: ${codes.length ? codes.join(", ") : "sin referencias"}.`)
  }

  return (
    <section className="rounded-sm border border-border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
        <span className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-base font-bold text-foreground">Costos de compra y referencias de cada creativo</span>
            <span className="block text-xs text-muted-foreground">
              Costo por unidad de cada referencia (con el código de la columna Producto del Excel) y qué referencias ofrece cada creativo.
            </span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-border p-4">
          {message && <p className="text-sm text-foreground">{message}</p>}

          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Código</th>
                  <th className="px-3 py-2 text-left font-medium">Referencia</th>
                  <th className="px-3 py-2 text-left font-medium">Costo de compra por unidad</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((c) => (
                  <tr key={c.code} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={costDrafts[c.code] ?? ""}
                          onChange={(e) => setCostDrafts((d) => ({ ...d, [c.code]: e.target.value }))}
                          className="w-32 rounded-sm border border-input bg-background px-2 py-1 text-sm"
                        />
                        {Number(costDrafts[c.code]) !== c.unitCost && costDrafts[c.code] !== "" && (
                          <button
                            type="button"
                            onClick={() =>
                              post({ type: "cost", code: c.code, name: c.name, unitCost: Number(costDrafts[c.code]) }, `Costo de ${c.name} actualizado.`)
                            }
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Guardar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-secondary/40">
                  <td className="px-3 py-2">
                    <input
                      placeholder="código"
                      value={newCost.code}
                      onChange={(e) => setNewCost((n) => ({ ...n, code: e.target.value.toLowerCase() }))}
                      className="w-24 rounded-sm border border-input bg-background px-2 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      placeholder="Nombre exacto de la referencia"
                      value={newCost.name}
                      onChange={(e) => setNewCost((n) => ({ ...n, name: e.target.value }))}
                      className="w-full rounded-sm border border-input bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="costo"
                        value={newCost.unitCost}
                        onChange={(e) => setNewCost((n) => ({ ...n, unitCost: e.target.value }))}
                        className="w-32 rounded-sm border border-input bg-background px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!newCost.code || !newCost.name || newCost.unitCost === ""}
                        onClick={async () => {
                          const ok = await post(
                            { type: "cost", code: newCost.code, name: newCost.name, unitCost: Number(newCost.unitCost) },
                            `Referencia ${newCost.name} agregada.`
                          )
                          if (ok) setNewCost({ code: "", name: "", unitCost: "" })
                        }}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-40"
                      >
                        Agregar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">Referencias que ofrece cada creativo</h3>
            <p className="text-xs text-muted-foreground">
              Todo creativo de producto debe tener al menos una. Las letras nuevas aparecen aquí al asignarlas abajo.
            </p>
            {letters.map((l) => (
              <div key={l.letter} className="flex flex-wrap items-center gap-2 rounded-sm border border-border p-2">
                <span className="inline-flex min-w-6 items-center justify-center rounded-sm bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {l.letter}
                </span>
                {costs.map((c) => {
                  const on = l.codes.includes(c.code)
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleCode(l.letter, c.code)}
                      className={`rounded-full px-2.5 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                    >
                      {c.name}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
