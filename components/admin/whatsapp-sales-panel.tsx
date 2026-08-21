"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { MessageCircle, Plus, X, Trash2 } from "lucide-react"
import type { WhatsAppSaleChannel, WhatsAppSaleRow } from "@/lib/db-whatsapp"

function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
}

type Props = {
  channel: WhatsAppSaleChannel
  channelLabel: string
  since: string
  until: string
}

export function WhatsAppSalesPanel({ channel, channelLabel, since, until }: Props) {
  const [sales, setSales] = useState<WhatsAppSaleRow[]>([])
  const [stats, setStats] = useState({ count: 0, totalAmount: 0 })
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [referralCode, setReferralCode] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [amount, setAmount] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [note, setNote] = useState("")
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10))

  const fetchSales = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ channel, since, until })
      const res = await fetch(`/api/whatsapp-sales?${params.toString()}`, { credentials: "include", cache: "no-store" })
      const data = await res.json()
      if (res.ok) {
        setSales(data.sales || [])
        setStats(data.stats || { count: 0, totalAmount: 0 })
      }
    } catch {
      // silencioso -- no es critico para el resto del dashboard
    } finally {
      setLoading(false)
    }
  }, [channel, since, until])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  function resetForm() {
    setReferralCode("")
    setCampaignName("")
    setAmount("")
    setCustomerName("")
    setNote("")
    setSaleDate(new Date().toISOString().slice(0, 10))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("El monto debe ser un número mayor a 0")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/whatsapp-sales", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralCode: referralCode || undefined,
          channel,
          campaignName: campaignName || undefined,
          amount: amountNum,
          customerName: customerName || undefined,
          note: note || undefined,
          saleDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error registrando la venta")

      toast.success("Venta registrada")
      resetForm()
      setFormOpen(false)
      fetchSales()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error registrando la venta")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/whatsapp-sales?id=${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
      toast.success("Venta eliminada")
      fetchSales()
    } catch {
      toast.error("No se pudo eliminar la venta")
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <p className="text-xs font-bold uppercase tracking-wider">Ventas cerradas por WhatsApp ({channelLabel})</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{stats.count} venta{stats.count !== 1 ? "s" : ""}</p>
            <p className="text-sm font-bold text-card-foreground">{formatCop(stats.totalAmount)}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-sm bg-green-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-green-700"
          >
            {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {formOpen ? "Cancelar" : "Registrar venta"}
          </button>
        </div>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-b border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Código de referencia (opcional)
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Ej. AB12CD"
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm uppercase"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monto (COP)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                required
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fecha de la venta</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Campaña (opcional)
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Se completa sola si el código coincide"
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cliente (opcional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nota (opcional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-sm bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Guardar venta"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Cliente</th>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Campaña</th>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider">Código</th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wider">Monto</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  {loading ? "Cargando..." : "Sin ventas de WhatsApp registradas en este rango."}
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-2 text-muted-foreground">{sale.sale_date}</td>
                  <td className="px-4 py-2 text-card-foreground">{sale.customer_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{sale.campaign_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{sale.referral_code || "—"}</td>
                  <td className="px-4 py-2 text-right font-medium text-card-foreground">{formatCop(Number(sale.amount))}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(sale.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Eliminar venta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
