"use client"

import { Fragment, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle, Search, TrendingDown, Boxes, Pencil, Check, X, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { AdminNav } from "@/components/admin/admin-nav"
import { SkuAliasModal } from "@/components/admin/sku-alias-modal"

type StockStatus = "urgent" | "warning" | "good"

type SkuAlias = {
  id: number
  alias_sku: string
  source: string | null
  notes: string | null
}

type InventoryItem = {
  id: number
  sku: string
  product_id: string
  product_name: string | null
  variant_color: string | null
  variant_color_name: string | null
  variant_size: string | null
  stock_quantity: number
  ideal_quantity: number
  low_stock_threshold: number
  is_available: boolean
  updated_at: string
  aliases: SkuAlias[]
}

// Debe coincidir con SKU_FORMAT_REGEX de lib/db-inventory.ts — no se importa
// directo porque ese módulo trae dependencias de servidor (mysql2) que no
// pueden entrar al bundle de este componente cliente.
const SKU_FORMAT_REGEX = /^[A-Z]{2}[0-9]{3}[A-Z]{3}$/

function getStatus(item: InventoryItem): StockStatus {
  if (item.ideal_quantity > 0) {
    const ratio = item.stock_quantity / item.ideal_quantity
    if (ratio < 0.25) return "urgent"
    if (ratio < 0.60) return "warning"
    return "good"
  }
  if (item.stock_quantity <= item.low_stock_threshold) return "urgent"
  return "good"
}

function getCoverage(item: InventoryItem): number | null {
  if (item.ideal_quantity === 0) return null
  return Math.round((item.stock_quantity / item.ideal_quantity) * 100)
}

const STATUS_CONFIG = {
  urgent: {
    label: "URGENTE",
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/30",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  warning: {
    label: "IMPORTANTE",
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/30",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
  },
  good: {
    label: "BIEN",
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/30",
    bar: "bg-green-500",
    dot: "bg-green-500",
  },
}

type EditingState = {
  sku: string
  field: "stock_quantity" | "ideal_quantity" | "sku"
  value: string
} | null

export default function AdminInventario() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | StockStatus>("all")
  const [editing, setEditing] = useState<EditingState>(null)
  const [saving, setSaving] = useState(false)
  const [aliasModalItem, setAliasModalItem] = useState<InventoryItem | null>(null)
  const router = useRouter()

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory", { credentials: "include", cache: "no-store" })
      if (res.status === 401) { router.push("/admin"); return }
      const data = await res.json()
      if (Array.isArray(data)) {
        setItems(data)
      } else {
        setItems([])
        if (res.status === 503) {
          toast.info("Base de datos no conectada — el inventario está disponible en producción (Hostinger)")
        }
      }
    } catch {
      toast.error("Error al cargar el inventario")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    async function bootstrap() {
      const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      if (!res.ok) { router.push("/admin"); return }
      await fetchInventory()
    }
    bootstrap()
  }, [router, fetchInventory])

  async function saveEdit() {
    if (!editing) return

    if (editing.field === "sku") {
      const newSku = editing.value.trim().toUpperCase()
      if (!SKU_FORMAT_REGEX.test(newSku)) {
        toast.error("El SKU debe ser 2 letras + 3 dígitos + 3 letras mayúsculas (ej. AB001CDE)")
        return
      }
      setSaving(true)
      try {
        const res = await fetch(`/api/inventory/${editing.sku}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ new_sku: newSku }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Error al renombrar SKU")
        setItems((prev) =>
          prev.map((it) => (it.sku === editing.sku ? { ...it, sku: newSku } : it))
        )
        toast.success("SKU actualizado")
        setEditing(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      } finally {
        setSaving(false)
      }
      return
    }

    const numValue = parseInt(editing.value, 10)
    if (isNaN(numValue) || numValue < 0) {
      toast.error("Ingresa un número válido mayor o igual a 0")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/${editing.sku}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [editing.field]: numValue }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) =>
        prev.map((it) =>
          it.sku === editing.sku ? { ...it, [editing.field]: numValue } : it
        )
      )
      toast.success("Inventario actualizado")
      setEditing(null)
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  function startEdit(sku: string, field: "stock_quantity" | "ideal_quantity" | "sku", current: string | number) {
    setEditing({ sku, field, value: String(current) })
  }

  async function toggleAvailability(sku: string, current: boolean) {
    try {
      const res = await fetch(`/api/inventory/${sku}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_available: !current }),
      })
      if (!res.ok) throw new Error()
      setItems((prev) =>
        prev.map((it) => (it.sku === sku ? { ...it, is_available: !current } : it))
      )
      toast.success(!current ? "Variante habilitada — visible en la tienda" : "Variante deshabilitada — oculta en la tienda")
    } catch {
      toast.error("Error al cambiar disponibilidad")
    }
  }

  const safeItems = Array.isArray(items) ? items : []

  const filtered = safeItems.filter((item) => {
    const matchSearch =
      !search ||
      item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.variant_color_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || getStatus(item) === statusFilter
    return matchSearch && matchStatus
  })

  const groups: { product_id: string; product_name: string; items: InventoryItem[] }[] = []
  for (const item of filtered) {
    let group = groups.find((g) => g.product_id === item.product_id)
    if (!group) {
      group = { product_id: item.product_id, product_name: item.product_name ?? item.product_id, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }

  const urgentCount  = safeItems.filter((i) => getStatus(i) === "urgent").length
  const warningCount = safeItems.filter((i) => getStatus(i) === "warning").length
  const goodCount    = safeItems.filter((i) => getStatus(i) === "good").length

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">

        {/* KPI Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => setStatusFilter(statusFilter === "urgent" ? "all" : "urgent")}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${
              statusFilter === "urgent" ? "border-red-500 ring-1 ring-red-500" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{urgentCount}</p>
                <p className="text-sm text-muted-foreground">Urgente</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Stock &lt; 25% del ideal o bajo umbral</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "warning" ? "all" : "warning")}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${
              statusFilter === "warning" ? "border-orange-500 ring-1 ring-orange-500" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingDown className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{warningCount}</p>
                <p className="text-sm text-muted-foreground">Importante</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Stock entre 25% y 60% del ideal</p>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "good" ? "all" : "good")}
            className={`bg-card border rounded-lg p-4 text-left transition-all hover:shadow-md ${
              statusFilter === "good" ? "border-green-500 ring-1 ring-green-500" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{goodCount}</p>
                <p className="text-sm text-muted-foreground">Bien</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Stock ≥ 60% del ideal</p>
          </button>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Boxes className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-sm text-muted-foreground">Total SKUs</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Variantes registradas en sistema</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold uppercase tracking-wider">Gestión de Inventario</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar producto, SKU o color..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Leyenda */}
        {statusFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrando:</span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${STATUS_CONFIG[statusFilter].bg} ${STATUS_CONFIG[statusFilter].text}`}>
              {STATUS_CONFIG[statusFilter].label}
            </span>
            <button onClick={() => setStatusFilter("all")} className="text-xs text-muted-foreground hover:text-foreground underline">
              Limpiar filtro
            </button>
          </div>
        )}

        {/* Tabla */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Variante</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Real
                    <span className="block text-[10px] font-normal text-muted-foreground normal-case">(actual en bodega)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Ideal
                    <span className="block text-[10px] font-normal text-muted-foreground normal-case">(objetivo)</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Cobertura</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Visible
                    <span className="block text-[10px] font-normal text-muted-foreground normal-case">(en tienda)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {items.length === 0
                        ? "Sin datos de inventario — conecta la base de datos o ejecuta el seed"
                        : "No se encontraron variantes con ese filtro"}
                    </td>
                  </tr>
                )}
                {groups.map((group) => (
                  <Fragment key={group.product_id}>
                    <tr className="bg-secondary/40">
                      <td colSpan={7} className="px-4 py-2">
                        <span className="font-bold">{group.product_name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {group.items.length} {group.items.length === 1 ? "variante" : "variantes"}
                        </span>
                      </td>
                    </tr>
                    {group.items.map((item) => {
                      const status = getStatus(item)
                      const coverage = getCoverage(item)
                      const cfg = STATUS_CONFIG[status]
                      const isEditingReal  = editing?.sku === item.sku && editing.field === "stock_quantity"
                      const isEditingIdeal = editing?.sku === item.sku && editing.field === "ideal_quantity"

                      return (
                    <tr key={item.sku} className={`hover:bg-secondary/20 ${status === "urgent" ? "bg-red-500/5" : status === "warning" ? "bg-orange-500/5" : ""}`}>
                      {/* Variante */}
                      <td className="px-4 py-3 pl-8">
                        <div className="flex items-center gap-1.5">
                          {item.variant_color && (
                            <span className="text-xs text-muted-foreground">{item.variant_color_name ?? item.variant_color}</span>
                          )}
                          {item.variant_size && (
                            <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{item.variant_size}</span>
                          )}
                          {!item.variant_color && !item.variant_size && (
                            <span className="text-xs text-muted-foreground italic">variante única</span>
                          )}
                          {!item.is_available && (
                            <span className="text-xs text-muted-foreground italic">— inactivo</span>
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        {editing?.sku === item.sku && editing.field === "sku" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={8}
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value.toUpperCase() })}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null) }}
                              autoFocus
                              className="w-24 text-center border border-primary rounded px-1 py-0.5 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                            />
                            <button onClick={saveEdit} disabled={saving} className="text-green-500 hover:text-green-600"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => startEdit(item.sku, "sku", item.sku)}
                              className="group flex items-center gap-1 hover:text-primary"
                              title="Editar SKU"
                            >
                              <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">{item.sku}</code>
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button
                              onClick={() => setAliasModalItem(item)}
                              className="text-xs text-muted-foreground hover:text-primary underline decoration-dotted"
                              title="Gestionar SKUs alias"
                            >
                              {item.aliases.length > 0 ? `+${item.aliases.length} alias` : "+ alias"}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Stock Real */}
                      <td className="px-4 py-3 text-center">
                        {isEditingReal ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null) }}
                              autoFocus
                              className="w-16 text-center border border-primary rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                            />
                            <button onClick={saveEdit} disabled={saving} className="text-green-500 hover:text-green-600"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item.sku, "stock_quantity", item.stock_quantity)}
                            className="group flex items-center justify-center gap-1 mx-auto hover:text-primary"
                            title="Editar stock real"
                          >
                            <span className="font-bold text-base">{item.stock_quantity}</span>
                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Stock Ideal */}
                      <td className="px-4 py-3 text-center">
                        {isEditingIdeal ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null) }}
                              autoFocus
                              className="w-16 text-center border border-primary rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                            />
                            <button onClick={saveEdit} disabled={saving} className="text-green-500 hover:text-green-600"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item.sku, "ideal_quantity", item.ideal_quantity)}
                            className="group flex items-center justify-center gap-1 mx-auto hover:text-primary text-muted-foreground"
                            title="Editar stock ideal"
                          >
                            <span className="font-medium">{item.ideal_quantity === 0 ? "— sin definir" : item.ideal_quantity}</span>
                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>

                      {/* Cobertura */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1 min-w-[80px]">
                          {coverage !== null ? (
                            <>
                              <span className={`text-xs font-bold ${cfg.text}`}>{coverage}%</span>
                              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${cfg.bar}`}
                                  style={{ width: `${Math.min(coverage, 100)}%` }}
                                />
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">sin ideal</span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Visible en tienda */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAvailability(item.sku, item.is_available)}
                          title={item.is_available ? "Visible — click para ocultar" : "Oculto — click para mostrar"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:opacity-80 ${
                            item.is_available
                              ? "bg-green-500/10 text-green-600 border-green-500/30"
                              : "bg-secondary text-muted-foreground border-border"
                          }`}
                        >
                          {item.is_available ? (
                            <><Eye className="h-3.5 w-3.5" /> Visible</>
                          ) : (
                            <><EyeOff className="h-3.5 w-3.5" /> Oculto</>
                          )}
                        </button>
                      </td>
                    </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {items.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            Mostrando {filtered.length} de {items.length} variantes · Haz clic en un número para editarlo
          </p>
        )}
      </main>

      {aliasModalItem && (
        <SkuAliasModal
          sku={aliasModalItem.sku}
          aliases={aliasModalItem.aliases}
          onClose={() => setAliasModalItem(null)}
          onChange={(aliases) => {
            setItems((prev) => prev.map((it) => (it.sku === aliasModalItem.sku ? { ...it, aliases } : it)))
            setAliasModalItem((prev) => (prev ? { ...prev, aliases } : prev))
          }}
        />
      )}
    </div>
  )
}
