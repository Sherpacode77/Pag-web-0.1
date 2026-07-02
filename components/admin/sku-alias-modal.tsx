"use client"

import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

type SkuAlias = {
  id: number
  alias_sku: string
  source: string | null
  notes: string | null
}

interface SkuAliasModalProps {
  sku: string
  aliases: SkuAlias[]
  onClose: () => void
  onChange: (aliases: SkuAlias[]) => void
}

export function SkuAliasModal({ sku, aliases, onClose, onChange }: SkuAliasModalProps) {
  const [newAlias, setNewAlias] = useState("")
  const [newSource, setNewSource] = useState("")
  const [saving, setSaving] = useState(false)

  async function addAlias() {
    const trimmed = newAlias.trim()
    if (!trimmed) {
      toast.error("Ingresa un código de alias")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/${sku}/aliases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alias_sku: trimmed, source: newSource.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Error al agregar alias")
        return
      }
      onChange([...aliases, data])
      setNewAlias("")
      setNewSource("")
      toast.success("Alias agregado")
    } finally {
      setSaving(false)
    }
  }

  async function removeAlias(aliasId: number) {
    try {
      const res = await fetch(`/api/inventory/${sku}/aliases/${aliasId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        toast.error("Error al eliminar alias")
        return
      }
      onChange(aliases.filter((a) => a.id !== aliasId))
      toast.success("Alias eliminado")
    } catch {
      toast.error("Error al eliminar alias")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wider">
            Alias de <code className="font-mono">{sku}</code>
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Relaciona códigos externos (proveedor, marketplace) con este SKU. No tienen restricción de formato.
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {aliases.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Sin alias registrados</p>
            )}
            {aliases.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 bg-secondary/40 rounded px-3 py-2">
                <div>
                  <span className="text-sm font-mono">{a.alias_sku}</span>
                  {a.source && <span className="ml-2 text-xs text-muted-foreground">({a.source})</span>}
                </div>
                <button onClick={() => removeAlias(a.id)} className="text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <input
              type="text"
              placeholder="Código alias (ej. PROV-4471)"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addAlias() }}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Origen (opcional, ej. Proveedor XYZ)"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addAlias() }}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={addAlias}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Agregar alias
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
