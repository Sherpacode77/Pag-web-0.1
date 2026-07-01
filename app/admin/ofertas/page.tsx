"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Tag, Percent, TrendingDown, Check, X, Pencil } from "lucide-react"
import { toast } from "sonner"
import { AdminNav } from "@/components/admin/admin-nav"
import { assetUrl } from "@/lib/assets"
import { formatPrice } from "@/lib/data"
import type { Product } from "@/lib/data"

type OfferDraft = { productId: string; mode: "discount" | "price"; value: string }

export default function AdminOfertas() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [draft, setDraft] = useState<OfferDraft | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      if (!res.ok) { router.push("/admin"); return }
      await fetchProducts()
    }
    bootstrap()
  }, [router])

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products", { cache: "no-store" })
      if (res.status === 401) { router.push("/admin"); return }
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }

  async function activateOffer(product: Product) {
    if (!draft || draft.productId !== product.id) return
    const basePrice = product.originalPrice ?? product.price
    let newPrice: number

    if (draft.mode === "discount") {
      const pct = parseFloat(draft.value)
      if (isNaN(pct) || pct <= 0 || pct >= 100) {
        toast.error("Ingresa un descuento entre 1% y 99%")
        return
      }
      newPrice = Math.round(basePrice * (1 - pct / 100))
    } else {
      newPrice = parseInt(draft.value.replace(/\D/g, ""), 10)
      if (isNaN(newPrice) || newPrice <= 0 || newPrice >= basePrice) {
        toast.error("El precio de oferta debe ser menor al precio actual")
        return
      }
    }

    setSaving(product.id)
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...product, price: newPrice, originalPrice: basePrice }),
      })
      if (!res.ok) throw new Error()
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, price: newPrice, originalPrice: basePrice } : p)
      )
      setDraft(null)
      toast.success("Oferta activada correctamente")
    } catch {
      toast.error("Error al guardar la oferta")
    } finally {
      setSaving(null)
    }
  }

  async function deactivateOffer(product: Product) {
    if (!product.originalPrice) return
    setSaving(product.id)
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...product, price: product.originalPrice, originalPrice: undefined }),
      })
      if (!res.ok) throw new Error()
      const restoredPrice = product.originalPrice
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, price: restoredPrice, originalPrice: undefined } : p)
      )
      setDraft(null)
      toast.success("Oferta desactivada — precio restaurado")
    } catch {
      toast.error("Error al desactivar la oferta")
    } finally {
      setSaving(null)
    }
  }

  const activeOffers = products.filter((p) => p.originalPrice && p.originalPrice > p.price)
  const withoutOffer = products.filter((p) => !p.originalPrice || p.originalPrice <= p.price)
  const avgDiscount =
    activeOffers.length > 0
      ? Math.round(
          activeOffers.reduce(
            (sum, p) => sum + ((p.originalPrice! - p.price) / p.originalPrice!) * 100,
            0
          ) / activeOffers.length
        )
      : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">

        {/* KPI Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeOffers.length}</p>
              <p className="text-sm text-muted-foreground">Ofertas activas</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Percent className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgDiscount}%</p>
              <p className="text-sm text-muted-foreground">Descuento promedio</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <TrendingDown className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{withoutOffer.length}</p>
              <p className="text-sm text-muted-foreground">Sin oferta activa</p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold uppercase tracking-wider mb-6">Gestión de Ofertas</h1>

        {/* Tabla de productos */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Precio normal</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Precio oferta</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Descuento</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => {
                  const isActive = !!(product.originalPrice && product.originalPrice > product.price)
                  const discount = isActive
                    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
                    : null
                  const isSaving = saving === product.id
                  const isDrafting = draft?.productId === product.id

                  return (
                    <tr key={product.id} className={`hover:bg-secondary/20 ${isActive ? "bg-primary/5" : ""}`}>
                      {/* Producto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden bg-secondary rounded">
                            <Image
                              src={assetUrl(product.image || "/placeholder.svg")}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                          </div>
                        </div>
                      </td>

                      {/* Precio normal */}
                      <td className="px-4 py-3 text-right">
                        <span className={isActive ? "line-through text-muted-foreground text-xs" : "font-semibold"}>
                          {formatPrice(product.originalPrice ?? product.price)}
                        </span>
                      </td>

                      {/* Precio oferta */}
                      <td className="px-4 py-3 text-right">
                        {isActive ? (
                          <span className="font-bold text-primary">{formatPrice(product.price)}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Descuento % */}
                      <td className="px-4 py-3 text-center">
                        {discount !== null ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            -{discount}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            ACTIVA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                            Sin oferta
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isActive ? (
                            <>
                              <button
                                onClick={() =>
                                  setDraft(
                                    isDrafting
                                      ? null
                                      : { productId: product.id, mode: "discount", value: String(discount) }
                                  )
                                }
                                disabled={isSaving}
                                className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                                title="Editar descuento"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deactivateOffer(product)}
                                disabled={isSaving}
                                className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-secondary text-muted-foreground disabled:opacity-50"
                              >
                                {isSaving ? "Guardando..." : "Desactivar"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                setDraft(
                                  isDrafting
                                    ? null
                                    : { productId: product.id, mode: "discount", value: "" }
                                )
                              }
                              disabled={isSaving}
                              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                                isDrafting
                                  ? "bg-secondary text-muted-foreground border border-border"
                                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                              }`}
                            >
                              {isDrafting ? "Cancelar" : "Crear oferta"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel inline de configuración de oferta */}
        {draft && (() => {
          const product = products.find((p) => p.id === draft.productId)
          if (!product) return null
          const basePrice = product.originalPrice ?? product.price
          const discountVal = parseFloat(draft.value)
          const priceVal = parseInt(draft.value.replace(/\D/g, ""), 10)
          const previewPrice =
            draft.mode === "discount" && !isNaN(discountVal) && discountVal > 0 && discountVal < 100
              ? Math.round(basePrice * (1 - discountVal / 100))
              : draft.mode === "price" && !isNaN(priceVal) && priceVal > 0 && priceVal < basePrice
              ? priceVal
              : null

          return (
            <div className="mt-4 bg-card border border-primary/40 rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider">
                    {product.originalPrice ? "Editar oferta:" : "Nueva oferta:"} {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Precio base: <strong>{formatPrice(basePrice)}</strong>
                  </p>
                </div>
                <button onClick={() => setDraft(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                {/* Selector de modo */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Modo</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDraft({ ...draft, mode: "discount", value: "" })}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                        draft.mode === "discount"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      % Descuento
                    </button>
                    <button
                      onClick={() => setDraft({ ...draft, mode: "price", value: "" })}
                      className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                        draft.mode === "price"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      Precio final
                    </button>
                  </div>
                </div>

                {/* Input */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                    {draft.mode === "discount" ? "Porcentaje de descuento" : "Precio con oferta (COP)"}
                  </p>
                  {draft.mode === "discount" ? (
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        placeholder="Ej: 20"
                        value={draft.value}
                        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                        className="w-28 pl-3 pr-8 py-2 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input
                        type="text"
                        placeholder="Ej: 144000"
                        value={draft.value}
                        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                        className="w-44 pl-7 pr-3 py-2 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      />
                    </div>
                  )}
                </div>

                {/* Preview */}
                {previewPrice && (
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Vista previa</p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded">
                      <span className="text-xs line-through text-muted-foreground">{formatPrice(basePrice)}</span>
                      <span className="font-bold text-primary">{formatPrice(previewPrice)}</span>
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                        -{Math.round(((basePrice - previewPrice) / basePrice) * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Botón aplicar */}
                <button
                  onClick={() => activateOffer(product)}
                  disabled={saving === product.id || !previewPrice}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5" />
                  {saving === product.id ? "Guardando..." : "Aplicar oferta"}
                </button>
              </div>
            </div>
          )
        })()}
      </main>
    </div>
  )
}
