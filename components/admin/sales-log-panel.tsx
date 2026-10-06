"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3 } from "lucide-react"
import type { SalesLogRow, SalesLogStats } from "@/lib/db-sales-log"

function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
}

function formatSyncDate(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

const EMPTY: SalesLogStats = {
  total: { count: 0, units: 0, grossAmount: 0, netAmount: 0 },
  byChannel: [],
  returnsExcluded: 0,
  lastSyncAt: null,
}

type Props = { since: string; until: string }

export function SalesLogPanel({ since, until }: Props) {
  const [stats, setStats] = useState<SalesLogStats>(EMPTY)
  const [sales, setSales] = useState<SalesLogRow[]>([])
  const [selected, setSelected] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ since, until, channel: selected })
      const res = await fetch(`/api/sales-log?${params.toString()}`, { credentials: "include", cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "No se pudo cargar el informe de ventas")
        return
      }
      setStats(data.stats || EMPTY)
      setSales(data.sales || [])
    } catch {
      setError("No se pudo cargar el informe de ventas")
    } finally {
      setLoading(false)
    }
  }, [since, until, selected])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const { total, byChannel } = stats
  const avgTicket = total.count > 0 ? total.netAmount / total.count : 0
  const selectedLabel = selected === "all" ? "Todos los canales" : selected

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">Informe de ventas por canal</h2>
            <p className="text-xs text-muted-foreground">
              Ventas clasificadas en Mensajería 2026, por fecha de compra, sin devoluciones. Monto = ROAS (ingreso sin envío).
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {stats.lastSyncAt ? `Última sincronización: ${formatSyncDate(stats.lastSyncAt)}` : "Aún sin sincronizar"}
        </p>
      </div>

      {error && <p className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Ventas" value={loading ? "…" : String(total.count)} />
        <Kpi label="Unidades" value={loading ? "…" : String(total.units)} />
        <Kpi label="Ingreso (ROAS)" value={loading ? "…" : formatCop(total.netAmount)} />
        <Kpi label="Ticket promedio" value={loading ? "…" : formatCop(avgTicket)} />
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Canal</th>
              <th className="px-3 py-2 text-right font-medium">Ventas</th>
              <th className="px-3 py-2 text-right font-medium">Unidades</th>
              <th className="px-3 py-2 text-right font-medium">Ingreso (ROAS)</th>
              <th className="px-3 py-2 text-right font-medium">% del total</th>
              <th className="px-3 py-2 text-right font-medium">Total cobrado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              onClick={() => setSelected("all")}
              className={`cursor-pointer border-t border-border font-semibold ${selected === "all" ? "bg-primary/10" : "hover:bg-secondary/60"}`}
            >
              <td className="px-3 py-2">Todos los canales</td>
              <td className="px-3 py-2 text-right">{total.count}</td>
              <td className="px-3 py-2 text-right">{total.units}</td>
              <td className="px-3 py-2 text-right">{formatCop(total.netAmount)}</td>
              <td className="px-3 py-2 text-right">100%</td>
              <td className="px-3 py-2 text-right">{formatCop(total.grossAmount)}</td>
            </tr>
            {byChannel.map((c) => (
              <tr
                key={c.channel}
                onClick={() => setSelected(c.channel)}
                className={`cursor-pointer border-t border-border ${selected === c.channel ? "bg-primary/10" : "hover:bg-secondary/60"}`}
              >
                <td className="px-3 py-2">{c.channel}</td>
                <td className="px-3 py-2 text-right">{c.count}</td>
                <td className="px-3 py-2 text-right">{c.units}</td>
                <td className="px-3 py-2 text-right">{formatCop(c.netAmount)}</td>
                <td className="px-3 py-2 text-right">
                  {total.netAmount > 0 ? `${((c.netAmount / total.netAmount) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2 text-right">{formatCop(c.grossAmount)}</td>
              </tr>
            ))}
            {!loading && byChannel.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No hay ventas clasificadas en este rango.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {stats.returnsExcluded > 0 && (
        <p className="text-xs text-muted-foreground">
          {stats.returnsExcluded} devolución(es) del rango no se cuentan en este informe.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          Detalle: {selectedLabel} <span className="font-normal text-muted-foreground">({sales.length >= 500 ? "primeras 500" : sales.length} ventas)</span>
        </h3>
        <div className="max-h-96 overflow-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Canal</th>
                <th className="px-3 py-2 text-left font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Cant.</th>
                <th className="px-3 py-2 text-right font-medium">Ingreso (ROAS)</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2">{s.sale_date}</td>
                  <td className="px-3 py-2">{s.customer_name || "—"}</td>
                  <td className="px-3 py-2">
                    {s.channel}
                    {s.channel_raw && s.channel_raw !== s.channel ? (
                      <span className="text-xs text-muted-foreground"> ({s.channel_raw})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{s.product_code || "—"}</td>
                  <td className="px-3 py-2 text-right">{s.quantity}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{formatCop(s.net_amount)}</td>
                </tr>
              ))}
              {!loading && sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    Sin ventas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}
