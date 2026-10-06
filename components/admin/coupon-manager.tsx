"use client"

import { useEffect, useState } from "react"
import { Ticket, Plus, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { formatPrice } from "@/lib/data"

type Coupon = {
  id: number
  code: string
  description: string | null
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  max_uses: number | null
  uses_count: number
  is_active: boolean
  valid_until: string | null
}

type CouponDraft = {
  code: string
  description: string
  discount_type: "percentage" | "fixed"
  discount_value: string
  min_order_amount: string
  max_discount_amount: string
  max_uses: string
  valid_until: string
}

const emptyDraft: CouponDraft = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_amount: "",
  max_discount_amount: "",
  max_uses: "",
  valid_until: "",
}

// MySQL devuelve DATETIME como "YYYY-MM-DD HH:MM:SS" (o Date segun el driver).
// El <input type="date"> solo entiende "YYYY-MM-DD".
function toDateInput(value: string | null): string {
  if (!value) return ""
  const s = String(value)
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  const d = new Date(s)
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

function formatVence(value: string | null): { texto: string; vencido: boolean } {
  const iso = toDateInput(value)
  if (!iso) return { texto: "Sin vencimiento", vencido: false }
  const [y, m, d] = iso.split("-").map(Number)
  const fin = new Date(y, m - 1, d, 23, 59, 59)
  return {
    texto: fin.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }),
    vencido: fin.getTime() < Date.now(),
  }
}

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<CouponDraft>(emptyDraft)

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function fetchCoupons() {
    try {
      const res = await fetch("/api/coupons", { credentials: "include", cache: "no-store" })
      const data = await res.json()
      setCoupons(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al cargar cupones")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    const discountValue = parseFloat(draft.discount_value)
    if (!draft.code.trim() || isNaN(discountValue) || discountValue <= 0) {
      toast.error("Código y valor de descuento son obligatorios")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: draft.code.trim(),
          description: draft.description.trim() || null,
          discount_type: draft.discount_type,
          discount_value: discountValue,
          min_order_amount: draft.min_order_amount ? Number(draft.min_order_amount) : 0,
          max_discount_amount: draft.max_discount_amount ? Number(draft.max_discount_amount) : null,
          max_uses: draft.max_uses ? Number(draft.max_uses) : null,
          valid_until: draft.valid_until || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al crear el cupón")
        return
      }
      setCoupons((prev) => [data, ...prev])
      setDraft(emptyDraft)
      setShowForm(false)
      toast.success("Cupón creado correctamente")
    } catch {
      toast.error("Error al crear el cupón")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })
      if (!res.ok) throw new Error()
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      )
    } catch {
      toast.error("Error al actualizar el cupón")
    }
  }

  function startEdit(coupon: Coupon) {
    setShowForm(false)
    setEditId(coupon.id)
    setEditDraft({
      code: coupon.code,
      description: coupon.description ?? "",
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value ?? ""),
      min_order_amount: String(coupon.min_order_amount ?? ""),
      max_discount_amount: coupon.max_discount_amount != null ? String(coupon.max_discount_amount) : "",
      max_uses: coupon.max_uses != null ? String(coupon.max_uses) : "",
      valid_until: toDateInput(coupon.valid_until),
    })
  }

  async function handleUpdate() {
    if (editId == null) return
    const discountValue = parseFloat(editDraft.discount_value)
    if (isNaN(discountValue) || discountValue <= 0) {
      toast.error("El valor de descuento debe ser mayor que cero")
      return
    }

    setSaving(true)
    try {
      const payload = {
        description: editDraft.description.trim() || null,
        discount_type: editDraft.discount_type,
        discount_value: discountValue,
        min_order_amount: editDraft.min_order_amount ? Number(editDraft.min_order_amount) : 0,
        max_discount_amount: editDraft.max_discount_amount ? Number(editDraft.max_discount_amount) : null,
        max_uses: editDraft.max_uses ? Number(editDraft.max_uses) : null,
        valid_until: editDraft.valid_until || null,
      }
      const res = await fetch(`/api/coupons/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar el cupón")
        return
      }
      setCoupons((prev) =>
        prev.map((c) => (c.id === editId ? { ...c, ...payload, valid_until: payload.valid_until } : c))
      )
      setEditId(null)
      toast.success("Cupón actualizado")
    } catch {
      toast.error("Error al actualizar el cupón")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(coupon: Coupon) {
    toast.warning(`¿Eliminar el cupón "${coupon.code}"?`, {
      action: {
        label: "Eliminar",
        onClick: async () => {
          try {
            const res = await fetch(`/api/coupons/${coupon.id}`, {
              method: "DELETE",
              credentials: "include",
            })
            if (!res.ok) throw new Error()
            setCoupons((prev) => prev.filter((c) => c.id !== coupon.id))
            toast.success("Cupón eliminado")
          } catch {
            toast.error("Error al eliminar el cupón")
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    })
  }

  if (loading) return null

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wider">
          <Ticket className="h-5 w-5 text-primary" />
          Cupones de Descuento
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancelar" : "Nuevo cupón"}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Código *</label>
              <input
                type="text"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="VERANO20"
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={draft.discount_type}
                onChange={(e) => setDraft({ ...draft, discount_type: e.target.value as "percentage" | "fixed" })}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo (COP)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {draft.discount_type === "percentage" ? "Porcentaje *" : "Monto (COP) *"}
              </label>
              <input
                type="number"
                value={draft.discount_value}
                onChange={(e) => setDraft({ ...draft, discount_value: e.target.value })}
                placeholder={draft.discount_type === "percentage" ? "20" : "20000"}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Compra mínima (COP)</label>
              <input
                type="number"
                value={draft.min_order_amount}
                onChange={(e) => setDraft({ ...draft, min_order_amount: e.target.value })}
                placeholder="0"
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {draft.discount_type === "percentage" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tope de descuento (opcional)</label>
                <input
                  type="number"
                  value={draft.max_discount_amount}
                  onChange={(e) => setDraft({ ...draft, max_discount_amount: e.target.value })}
                  placeholder="Sin tope"
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Usos máximos (opcional)</label>
              <input
                type="number"
                value={draft.max_uses}
                onChange={(e) => setDraft({ ...draft, max_uses: e.target.value })}
                placeholder="Ilimitado"
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Vence (opcional)</label>
              <input
                type="date"
                value={draft.valid_until}
                onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción (opcional)</label>
              <input
                type="text"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Descuento de temporada"
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="mt-4 rounded bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Creando..." : "Crear cupón"}
          </button>
        </div>
      )}

      {editId !== null && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider">
              Editando <span className="font-mono text-primary">{editDraft.code}</span>
            </p>
            <button
              onClick={() => setEditId(null)}
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={editDraft.discount_type}
                onChange={(e) => setEditDraft({ ...editDraft, discount_type: e.target.value as "percentage" | "fixed" })}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo (COP)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {editDraft.discount_type === "percentage" ? "Porcentaje *" : "Monto (COP) *"}
              </label>
              <input
                type="number"
                value={editDraft.discount_value}
                onChange={(e) => setEditDraft({ ...editDraft, discount_value: e.target.value })}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Compra minima (COP)</label>
              <input
                type="number"
                value={editDraft.min_order_amount}
                onChange={(e) => setEditDraft({ ...editDraft, min_order_amount: e.target.value })}
                placeholder="0"
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Vence (vacio = sin vencimiento)</label>
              <input
                type="date"
                value={editDraft.valid_until}
                onChange={(e) => setEditDraft({ ...editDraft, valid_until: e.target.value })}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {editDraft.discount_type === "percentage" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Tope de descuento (opcional)</label>
                <input
                  type="number"
                  value={editDraft.max_discount_amount}
                  onChange={(e) => setEditDraft({ ...editDraft, max_discount_amount: e.target.value })}
                  placeholder="Sin tope"
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Usos maximos (vacio = ilimitado)</label>
              <input
                type="number"
                value={editDraft.max_uses}
                onChange={(e) => setEditDraft({ ...editDraft, max_uses: e.target.value })}
                placeholder="Ilimitado"
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripcion (opcional)</label>
              <input
                type="text"
                value={editDraft.description}
                onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            El codigo no se puede cambiar: ya esta impreso en campanas y mensajes enviados.
          </p>
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="mt-3 rounded bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Descuento</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Mín. compra</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Usos</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Vence</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay cupones creados todavía.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold">{coupon.code}</p>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground">{coupon.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}%`
                        : formatPrice(coupon.discount_value)}
                      {coupon.max_discount_amount && (
                        <p className="text-xs text-muted-foreground">
                          Tope {formatPrice(coupon.max_discount_amount)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.min_order_amount > 0 ? formatPrice(coupon.min_order_amount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {coupon.uses_count}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const { texto, vencido } = formatVence(coupon.valid_until)
                        return (
                          <span className={vencido ? "font-medium text-destructive" : "text-muted-foreground"}>
                            {texto}
                            {vencido && " (vencido)"}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          coupon.is_active
                            ? "bg-green-500/10 text-green-600"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {coupon.is_active ? "ACTIVO" : "INACTIVO"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startEdit(coupon)}
                        className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon)}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        title="Eliminar"
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
    </div>
  )
}
