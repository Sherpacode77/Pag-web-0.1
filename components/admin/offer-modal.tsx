"use client"

import { useState } from "react"
import { X, Save, Plus } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { ImageUpload } from "@/components/image-upload"
import { OfferProductPicker } from "@/components/admin/offer-product-picker"
import { assetUrl } from "@/lib/assets"
import { formatPrice } from "@/lib/data"
import type { Product } from "@/lib/data"
import type { OfferType, OfferDiscountType, OfferProductEntry } from "@/lib/db-offers"

export interface OfferFormState {
  id?: number
  name: string
  description: string
  offer_type: OfferType
  discount_type: OfferDiscountType
  discount_value: number | null
  cover_image: string
  products: OfferProductEntry[]
  valid_until: string
}

export function emptyOfferDraft(): OfferFormState {
  return {
    name: "",
    description: "",
    offer_type: "single",
    discount_type: "percentage",
    discount_value: null,
    cover_image: "",
    products: [{ productId: "", variantColors: [] }],
    valid_until: "",
  }
}

interface OfferModalProps {
  offer: OfferFormState
  isEdit: boolean
  products: Product[]
  onClose: () => void
  onSave: () => Promise<void>
  onChange: (data: OfferFormState) => void
}

export function OfferModal({ offer, isEdit, products, onClose, onSave, onChange }: OfferModalProps) {
  const [saving, setSaving] = useState(false)

  function setOfferType(offer_type: OfferType) {
    onChange({
      ...offer,
      offer_type,
      products:
        offer_type === "single"
          ? [offer.products[0] ?? { productId: "", variantColors: [] }]
          : offer.products.length >= 2
          ? offer.products
          : [...offer.products, { productId: "", variantColors: [] }],
      cover_image: offer_type === "single" ? "" : offer.cover_image,
    })
  }

  function updateEntry(index: number, entry: OfferProductEntry) {
    const products = [...offer.products]
    products[index] = entry
    onChange({ ...offer, products })
  }

  function addEntry() {
    onChange({ ...offer, products: [...offer.products, { productId: "", variantColors: [], quantity: 1 }] })
  }

  function removeEntry(index: number) {
    onChange({ ...offer, products: offer.products.filter((_, i) => i !== index) })
  }

  async function handleSave() {
    if (!offer.name.trim()) {
      toast.error("Ingresa un nombre para la oferta")
      return
    }
    const validProducts = offer.products.filter((p) => p.productId)
    if (validProducts.length === 0) {
      toast.error("Selecciona al menos un producto")
      return
    }
    if (offer.offer_type === "bundle") {
      if (validProducts.length < 2) {
        toast.error("Un combo requiere al menos 2 productos")
        return
      }
      if (!offer.cover_image) {
        toast.error("Sube una imagen de portada personalizada para el combo")
        return
      }
    }
    if (offer.discount_type === "percentage") {
      if (!offer.discount_value || offer.discount_value < 1 || offer.discount_value > 99) {
        toast.error("Ingresa un porcentaje de descuento entre 1 y 99")
        return
      }
    }

    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  const isBundle = offer.offer_type === "bundle"
  const bundleProducts = offer.products
    .map((entry) => ({ entry, product: products.find((p) => p.id === entry.productId) }))
    .filter((x): x is { entry: OfferProductEntry; product: Product } => !!x.product)
  const bundleVideoCount = bundleProducts.reduce((sum, { product }) => sum + (product.videos?.length ?? 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold uppercase tracking-wider">
            {isEdit ? "Editar Oferta" : "Nueva Oferta"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">Nombre *</label>
            <input
              type="text"
              value={offer.name}
              onChange={(e) => onChange({ ...offer, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej: SaddleBag 12L con 20% OFF"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Descripción (opcional)
            </label>
            <textarea
              value={offer.description}
              onChange={(e) => onChange({ ...offer, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Vigencia */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Vence el (opcional)
            </label>
            <input
              type="date"
              value={offer.valid_until}
              onChange={(e) => onChange({ ...offer, valid_until: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Tipo de descuento */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">Tipo de descuento</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => onChange({ ...offer, discount_type: "percentage" })}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  offer.discount_type === "percentage"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                % Descuento
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...offer, discount_type: "free_shipping", discount_value: null })}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  offer.discount_type === "free_shipping"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                Envío gratis
              </button>
            </div>
            {offer.discount_type === "percentage" && (
              <div className="relative w-32">
                <input
                  type="number"
                  min={1}
                  max={99}
                  placeholder="Ej: 20"
                  value={offer.discount_value ?? ""}
                  onChange={(e) => onChange({ ...offer, discount_value: e.target.value ? Number(e.target.value) : null })}
                  className="w-full pl-3 pr-8 py-2 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
              </div>
            )}
          </div>

          {/* Caso: referencia única o combo */}
          <div className="pt-4 border-t border-border">
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">Composición</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setOfferType("single")}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  offer.offer_type === "single"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                Referencia única
              </button>
              <button
                type="button"
                onClick={() => setOfferType("bundle")}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                  offer.offer_type === "bundle"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                Combo (varios productos)
              </button>
            </div>

            {isBundle && (
              <div className="mb-4">
                <ImageUpload
                  value={offer.cover_image}
                  onChange={(path) => onChange({ ...offer, cover_image: path })}
                  label="Imagen de portada del combo *"
                />
              </div>
            )}

            <div className="space-y-3">
              {offer.products.map((entry, index) => (
                <OfferProductPicker
                  key={index}
                  products={products}
                  entry={entry}
                  onChange={(e) => updateEntry(index, e)}
                  onRemove={isBundle && offer.products.length > 2 ? () => removeEntry(index) : undefined}
                  showQuantity={isBundle}
                />
              ))}
            </div>

            {isBundle && (
              <button
                type="button"
                onClick={addEntry}
                className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                Agregar producto al combo
              </button>
            )}

            {/* Vista previa de galería para combos */}
            {isBundle && bundleProducts.length > 0 && (
              <div className="mt-5 bg-secondary/30 border border-border rounded-md p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Vista previa de la galería (portada + productos en orden)
                </p>
                <div className="flex flex-wrap gap-2">
                  {offer.cover_image && (
                    <div className="relative h-16 w-16 rounded overflow-hidden border-2 border-primary">
                      <Image src={assetUrl(offer.cover_image)} alt="Portada" fill className="object-cover" />
                    </div>
                  )}
                  {bundleProducts.map(({ product }, i) => (
                    <div key={`${product.id}-${i}`} className="relative h-16 w-16 rounded overflow-hidden border border-border">
                      <Image src={assetUrl(product.image || "/placeholder.svg")} alt={product.name} fill className="object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {bundleVideoCount > 0
                    ? `Se incluirán automáticamente ${bundleVideoCount} video(s) de estos productos.`
                    : "Ninguno de estos productos tiene videos cargados todavía."}
                </p>
              </div>
            )}

            {/* Preview de precio para referencia única con % */}
            {!isBundle && offer.discount_type === "percentage" && offer.discount_value && (() => {
              const product = products.find((p) => p.id === offer.products[0]?.productId)
              if (!product) return null
              const discounted = Math.round(product.price * (1 - offer.discount_value! / 100))
              return (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-secondary rounded w-fit">
                  <span className="text-xs line-through text-muted-foreground">{formatPrice(product.price)}</span>
                  <span className="font-bold text-primary">{formatPrice(discounted)}</span>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 border border-border rounded-md hover:bg-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
