"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { MetaAdsPanel } from "./meta-ads-panel"
import { WhatsAppSalesPanel } from "./whatsapp-sales-panel"
import type { WhatsAppSaleChannel } from "@/lib/db-whatsapp"

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

type Channel = {
  key: WhatsAppSaleChannel
  label: string
  configured: boolean
}

const CHANNELS: Channel[] = [
  { key: "meta", label: "Meta Ads", configured: true },
  { key: "google", label: "Google Ads", configured: false },
  { key: "tiktok", label: "TikTok Ads", configured: false },
  { key: "organico", label: "Orgánico", configured: false },
]

export function VentasDashboard() {
  const [range, setRange] = useState(() => PRESETS[2].range())
  const [activePreset, setActivePreset] = useState("Últimos 7 días")
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0])

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setRange(preset.range())
    setActivePreset(preset.label)
  }

  function handleCustomRangeApply() {
    setActivePreset("")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Ventas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Desempeño de campañas por canal de pauta publicitaria, y ventas cerradas por WhatsApp.
        </p>
      </div>

      {/* Pestañas de canal */}
      <div className="flex gap-1 border-b border-border">
        {CHANNELS.map((channel) => (
          <button
            key={channel.key}
            type="button"
            onClick={() => setActiveChannel(channel)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeChannel.key === channel.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {channel.label}
          </button>
        ))}
      </div>

      {/* Rango de fechas (compartido entre canales) */}
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

      {activeChannel.configured ? (
        activeChannel.key === "meta" && <MetaAdsPanel since={range.since} until={range.until} />
      ) : (
        <div className="flex items-center gap-3 rounded-sm border border-border bg-card p-6 text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-500" />
          <p>
            <span className="font-medium text-foreground">{activeChannel.label}</span> todavía no está conectado a este
            panel. Las ventas cerradas por WhatsApp atribuidas a este canal sí se pueden registrar abajo.
          </p>
        </div>
      )}

      <WhatsAppSalesPanel
        channel={activeChannel.key}
        channelLabel={activeChannel.label}
        since={range.since}
        until={range.until}
      />
    </div>
  )
}
