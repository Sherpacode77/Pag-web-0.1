"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Tag, Percent, Archive, Pencil, Trash2, Plus, Package } from "lucide-react"
import { toast } from "sonner"
import { AdminNav } from "@/components/admin/admin-nav"
import { OfferModal, emptyOfferDraft, type OfferFormState } from "@/components/admin/offer-modal"
import { assetUrl } from "@/lib/assets"
import { formatPrice } from "@/lib/data"
import type { Product } from "@/lib/data"
import type { Offer } from "@/lib/db-offers"

export default function AdminOfertas() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<{ isEdit: boolean; draft: OfferFormState } | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      if (!res.ok) { router.push("/admin"); return }
      await Promise.all([fetchOffers(), fetchProducts()])
      setLoading(false)
    }
    bootstrap()
  }, [router])

  async function fetchOffers() {
    try {
      const res = await fetch("/api/offers", { credentials: "include", cache: "no-store" })
      if (res.status === 401) { router.push("/admin"); return }
      const data = await res.json()
      setOffers(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al cargar ofertas")
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products", { credentials: "include", cache: "no-store" })
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      toast.error("Error al cargar productos")
    }
  }

  function openCreateModal() {
    setModal({ isEdit: false, draft: emptyOfferDraft() })
  }

  function openEditModal(offer: Offer) {
    setModal({
      isEdit: true,
      draft: {
        id: offer.id,
        name: offer.name,
        description: offer.description ?? "",
        offer_type: offer.offer_type,
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        cover_image: offer.cover_image ?? "",
        products: offer.products,
        valid_until: offer.valid_until ? offer.valid_until.slice(0, 10) : "",
      },
    })
  }

  async function saveOffer() {
    if (!modal) return
    const { draft, isEdit } = modal

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      offer_type: draft.offer_type,
      discount_type: draft.discount_type,
      discount_value: draft.discount_type === "percentage" ? draft.discount_value : null,
      cover_image: draft.offer_type === "bundle" ? draft.cover_image : null,
      products: draft.products.filter((p) => p.productId),
      valid_until: draft.valid_until || null,
    }

    try {
      const res = await fetch(isEdit ? `/api/offers/${draft.id}` : "/api/offers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Error al guardar la oferta")
      }
      toast.success(isEdit ? "Oferta actualizada" : "Oferta creada")
      setModal(null)
      await fetchOffers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar la oferta")
      throw err
    }
  }

  async function toggleActive(offer: Offer) {
    setSaving(true)
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !offer.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(offer.is_active ? "Oferta desactivada" : "Oferta activada")
      await fetchOffers()
    } catch {
      toast.error("Error al actualizar la oferta")
    } finally {
      setSaving(false)
    }
  }

  async function removeOffer(offer: Offer) {
    if (!confirm(`¿Eliminar la oferta "${offer.name}" permanentemente?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/offers/${offer.id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error()
      toast.success("Oferta eliminada")
      await fetchOffers()
    } catch {
      toast.error("Error al eliminar la oferta")
    } finally {
      setSaving(false)
    }
  }

  const activeOffers = offers.filter((o) => o.is_active)
  const avgDiscount = (() => {
    const withPct = activeOffers.filter((o) => o.discount_type === "percentage" && o.discount_value)
    if (withPct.length === 0) return 0
    return Math.round(withPct.reduce((sum, o) => sum + Number(o.discount_value), 0) / withPct.length)
  })()

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
              <Archive className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{offers.length - activeOffers.length}</p>
              <p className="text-sm text-muted-foreground">Inactivas (historial)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">Gestión de Ofertas</h1>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-bold hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Crear oferta
          </button>
        </div>

        {/* Tabla de ofertas */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Oferta</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Descuento</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Productos</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Vigencia</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Aún no has creado ninguna oferta.
                    </td>
                  </tr>
                ) : (
                  offers.map((offer) => {
                    const includedProducts = offer.products
                      .map((p) => products.find((prod) => prod.id === p.productId))
                      .filter((p): p is Product => !!p)

                    return (
                      <tr key={offer.id} className={`hover:bg-secondary/20 ${offer.is_active ? "bg-primary/5" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {offer.offer_type === "bundle" && offer.cover_image ? (
                              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden bg-secondary rounded">
                                <Image src={assetUrl(offer.cover_image)} alt={offer.name} fill className="object-cover" />
                              </div>
                            ) : includedProducts[0] ? (
                              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden bg-secondary rounded">
                                <Image
                                  src={assetUrl(includedProducts[0].image || "/placeholder.svg")}
                                  alt={offer.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : null}
                            <p className="font-medium">{offer.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {offer.offer_type === "bundle" ? (
                              <>
                                <Package className="h-3.5 w-3.5" /> Combo
                              </>
                            ) : (
                              "Referencia única"
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            {offer.discount_type === "free_shipping"
                              ? "Envío gratis"
                              : `-${Math.round(Number(offer.discount_value))}%`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground max-w-[220px] truncate">
                            {includedProducts.map((p) => p.name).join(", ") || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {offer.valid_until ? new Date(offer.valid_until).toLocaleDateString("es-CO") : "Sin vencimiento"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {offer.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                              ACTIVA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                              Inactiva
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(offer)}
                              disabled={saving}
                              className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleActive(offer)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-secondary text-muted-foreground disabled:opacity-50"
                            >
                              {offer.is_active ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              onClick={() => removeOffer(offer)}
                              disabled={saving}
                              className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {modal && (
        <OfferModal
          offer={modal.draft}
          isEdit={modal.isEdit}
          products={products}
          onClose={() => setModal(null)}
          onSave={saveOffer}
          onChange={(draft) => setModal({ ...modal, draft })}
        />
      )}
    </div>
  )
}
