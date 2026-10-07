"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Bus, Download, Plus, Trash2, Users, X } from "lucide-react"
import {
  GIRO_DE_RIGO_SERVICES,
  TRAVEL_LISTS,
  getServiceOptions,
  buildTravelSku,
  getListsForRoute,
  getTravelServicePrice,
  type TravelListKey,
  type TravelRouteKey,
} from "@/lib/travel-services"
import type { TravelPassengerRow, TravelListStats, TravelServiceStats } from "@/lib/db-travel"

function formatCop(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

function barColor(occupancy: number): string {
  if (occupancy >= 1) return "bg-destructive"
  if (occupancy >= 0.85) return "bg-orange-500"
  return "bg-primary"
}

const ROUTE_LABELS: Record<TravelRouteKey, string> = {
  ida: "Bogotá → Cali (30 oct)",
  regreso: "Cali → Bogotá (2 nov)",
  "ida-vuelta": "Ida 30 oct y regreso 2 nov",
}

// El catalogo de servicios no depende de la base de datos: si la consulta
// falla, igual se muestran las filas, pero sin contadores ni ocupacion para no
// inventar datos.
function buildCatalogRows(): TravelServiceStats[] {
  const rows: TravelServiceStats[] = []
  for (const service of GIRO_DE_RIGO_SERVICES) {
    for (const route of ["ida", "regreso", "ida-vuelta"] as TravelRouteKey[]) {
      for (const option of getServiceOptions(service)) {
        const price = getTravelServicePrice(service, route, option.key)
        rows.push({
          sku: buildTravelSku(service.key, route, option.key),
          serviceKey: service.key,
          serviceName: service.name,
          vehicle: service.vehicle,
          route,
          routeLabel: ROUTE_LABELS[route],
          bike: option.key,
          bikeLabel: option.label,
          carriesPassenger: service.carriesPassenger,
          price,
          deposit: Math.round(price / 2),
          lists: getListsForRoute(service.key, route),
          passengers: 0,
          occupancy: 0,
          atCapacity: false,
        })
      }
    }
  }
  return rows
}

const EMPTY_FORM = {
  listKeys: [] as TravelListKey[],
  fullName: "",
  phone: "",
  pickupPoint: "",
  deposit: "",
  balance: "",
  paymentChannel: "Nequi",
  depositDate: new Date().toISOString().slice(0, 10),
  withBike: true,
  groupNumber: "",
  isGroupLeader: false,
  notes: "",
}

export function TravelServicesPanel() {
  const [passengers, setPassengers] = useState<TravelPassengerRow[]>([])
  const [lists, setLists] = useState<TravelListStats[]>([])
  const [services, setServices] = useState<TravelServiceStats[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [activeList, setActiveList] = useState<TravelListKey | "all">("all")
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/travel-passengers", { credentials: "include", cache: "no-store" })
      const data = await res.json()
      if (res.ok) {
        setLoadError(null)
        setPassengers(data.passengers || [])
        setLists(data.stats?.lists || [])
        setServices(data.stats?.services || [])
      } else {
        // Nunca se muestran contadores en cero cuando la consulta fallo: seria
        // indistinguible de "no hay nadie inscrito".
        setLoadError(data.error || "No se pudieron cargar las listas")
        setPassengers([])
        setLists([])
        setServices(buildCatalogRows())
      }
    } catch {
      setLoadError("No se pudieron cargar las listas")
      setServices(buildCatalogRows())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.listKeys.length === 0) {
      toast.error("Elige al menos una lista")
      return
    }
    if (!form.fullName.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/travel-passengers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listKeys: form.listKeys,
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          pickupPoint: form.pickupPoint.trim() || null,
          deposit: Number(form.deposit) || 0,
          balance: Number(form.balance) || 0,
          paymentChannel: form.paymentChannel.trim() || null,
          depositDate: form.depositDate || null,
          withBike: form.withBike,
          groupNumber: form.groupNumber ? Number(form.groupNumber) : null,
          isGroupLeader: form.isGroupLeader,
          notes: form.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "No se pudo registrar")
        return
      }
      toast.success("Pasajero registrado")
      setForm(EMPTY_FORM)
      setFormOpen(false)
      fetchData()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar a ${name} de esta lista?`)) return
    const res = await fetch(`/api/travel-passengers?id=${id}`, { method: "DELETE", credentials: "include" })
    if (res.ok) {
      toast.success("Pasajero eliminado")
      fetchData()
    } else {
      toast.error("No se pudo eliminar")
    }
  }

  const visible = activeList === "all" ? passengers : passengers.filter((p) => p.list_key === activeList)
  const full = lists.filter((l) => l.booked >= l.capacity)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Servicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cupos de transporte de CERO.UNO Travel, ocupación por lista y pasajeros inscritos.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/travel-passengers/export"
            className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary"
          >
            <Download className="h-4 w-4" />
            Descargar listas
          </a>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {formOpen ? "Cerrar" : "Registrar pasajero"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-4 text-sm text-foreground">
          <strong>No se pudieron cargar los datos:</strong> {loadError}. Los contadores no se muestran para no
          confundirlos con listas vacías.{" "}
          <button type="button" onClick={fetchData} className="underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {full.length > 0 && (
        <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-4 text-sm text-foreground">
          <strong>Lista llena:</strong> {full.map((l) => `${l.label} (${l.booked}/${l.capacity})`).join(", ")}. La
          página sigue vendiendo: ciérralo tú si ya no caben más pasajeros.
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Registro manual (ventas por WhatsApp)</p>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Listas que ocupa este pasajero
            </p>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_LISTS.map((list) => {
                const active = form.listKeys.includes(list.key)
                return (
                  <button
                    key={list.key}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        listKeys: active ? f.listKeys.filter((k) => k !== list.key) : [...f.listKeys, list.key],
                      }))
                    }
                    className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                      active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
                    }`}
                  >
                    {list.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              placeholder="Nombre completo"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Punto de embarque (ej. Boyacá con 53)"
              value={form.pickupPoint}
              onChange={(e) => setForm((f) => ({ ...f, pickupPoint: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Abono"
              value={form.deposit}
              onChange={(e) => setForm((f) => ({ ...f, deposit: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Saldo"
              value={form.balance}
              onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Canal de pago (Nequi, Llave…)"
              value={form.paymentChannel}
              onChange={(e) => setForm((f) => ({ ...f, paymentChannel: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.depositDate}
              onChange={(e) => setForm((f) => ({ ...f, depositDate: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Número de grupo (opcional)"
              value={form.groupNumber}
              onChange={(e) => setForm((f) => ({ ...f, groupNumber: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Notas"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="rounded-sm border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.withBike}
                onChange={(e) => setForm((f) => ({ ...f, withBike: e.target.checked }))}
                className="h-4 w-4"
              />
              Viaja con bicicleta
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.isGroupLeader}
                onChange={(e) => setForm((f) => ({ ...f, isGroupLeader: e.target.checked }))}
                className="h-4 w-4"
              />
              Separó el cupo del grupo
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-sm bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Guardar pasajero"}
          </button>
        </form>
      )}

      {/* Ocupación por lista de abordaje */}
      <div className="grid gap-3 md:grid-cols-4">
        {lists.map((list) => (
          <div key={list.key} className="rounded-sm border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{list.label}</p>
              <Bus className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {list.booked}
              <span className="text-base font-normal text-muted-foreground"> / {list.capacity}</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all duration-500 ${barColor(list.occupancy)}`}
                style={{ width: `${Math.min(100, list.occupancy * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pct(list.occupancy)} de ocupación</p>
          </div>
        ))}
      </div>

      {/* Tabla de servicios vendibles */}
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Servicio</th>
              <th className="px-3 py-2 text-left font-medium">Evento y fechas</th>
              <th className="px-3 py-2 text-right font-medium">Pasajeros</th>
              <th className="px-3 py-2 text-left font-medium">Ocupación</th>
              <th className="px-3 py-2 text-right font-medium">Precio / abono</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.sku} className="border-t border-border align-top">
                <td className="px-3 py-3">
                  <p className="font-medium text-foreground">{s.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{s.bikeLabel}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{s.sku}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="text-foreground">Giro de Rigo 2026 · Cali</p>
                  <p className="text-xs text-muted-foreground">{s.routeLabel}</p>
                  <p className="text-xs text-muted-foreground">{s.vehicle}</p>
                </td>
                <td className="px-3 py-3 text-right font-bold text-foreground">
                  {loadError ? <span className="text-muted-foreground">—</span> : s.passengers}
                </td>
                <td className="px-3 py-3">
                  {loadError ? (
                    <span className="text-xs text-muted-foreground">Sin datos</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full ${barColor(s.occupancy)}`}
                          style={{ width: `${Math.min(100, s.occupancy * 100)}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-xs text-foreground">{pct(s.occupancy)}</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.lists.length > 1 ? "Promedio de ida y regreso" : TRAVEL_LISTS.find((l) => l.key === s.lists[0])?.label}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <p className="font-medium text-foreground">{formatCop(s.price)}</p>
                  <p className="text-xs text-muted-foreground">abono {formatCop(s.deposit)}</p>
                </td>
              </tr>
            ))}
            {!loading && services.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Sin servicios configurados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Listas de pasajeros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Pasajeros inscritos</h2>
          <div className="ml-auto flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveList("all")}
              className={`rounded-full px-3 py-1 text-xs ${
                activeList === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              Todas ({passengers.length})
            </button>
            {TRAVEL_LISTS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setActiveList(l.key)}
                className={`rounded-full px-3 py-1 text-xs ${
                  activeList === l.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {l.label} ({passengers.filter((p) => p.list_key === l.key).length})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Lista</th>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Teléfono</th>
                <th className="px-3 py-2 text-left font-medium">Punto de embarque</th>
                <th className="px-3 py-2 text-right font-medium">Abono</th>
                <th className="px-3 py-2 text-right font-medium">Saldo</th>
                <th className="px-3 py-2 text-left font-medium">Pago</th>
                <th className="px-3 py-2 text-left font-medium">Origen</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {TRAVEL_LISTS.find((l) => l.key === p.list_key)?.label}
                  </td>
                  <td className="px-3 py-2">
                    <span className={p.is_group_leader ? "font-bold text-primary" : "text-foreground"}>
                      {p.full_name}
                    </span>
                    {p.group_number !== null && (
                      <span className="ml-2 rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                        grupo {p.group_number}
                      </span>
                    )}
                    {p.is_group_leader && (
                      <span className="ml-2 text-xs text-primary">separó el grupo</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{p.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.pickup_point ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-foreground">{formatCop(p.deposit)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-muted-foreground">
                    {formatCop(p.balance)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.payment_channel ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-xs ${
                        p.source === "web" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {p.source === "web" ? "WEB" : "Manual"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.full_name)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Eliminar a ${p.full_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                    Todavía no hay pasajeros en esta lista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
