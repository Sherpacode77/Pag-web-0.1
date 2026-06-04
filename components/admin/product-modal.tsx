"use client"

import { useState } from "react"
import { X, Save, ImagePlus } from "lucide-react"
import { MultiImageUpload } from "@/components/multi-image-upload"
import { VideoUpload } from "@/components/video-upload"
import { ImageGalleryModal } from "@/components/image-gallery-modal"
import { VariantManager } from "@/components/variant-manager"
import type { Product } from "@/lib/data"

interface ProductModalProps {
  product: Partial<Product>
  isEdit: boolean
  onClose: () => void
  onSave: () => Promise<void>
  onChange: (data: Partial<Product>) => void
}

export function ProductModal({ product, isEdit, onClose, onSave, onChange }: ProductModalProps) {
  const [showGallery, setShowGallery] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-wider">
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={product.name || ""}
              onChange={(e) => onChange({ ...product, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="SaddleBag 12L"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Slug (URL) *
            </label>
            <input
              type="text"
              value={product.slug || ""}
              onChange={(e) =>
                onChange({ ...product, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
              }
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="saddlebag-12l"
              required
            />
          </div>

          {/* Price & Original Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
                Precio (COP) *
              </label>
              <input
                type="number"
                value={product.price || 0}
                onChange={(e) => onChange({ ...product, price: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
                Precio Original (opcional)
              </label>
              <input
                type="number"
                value={product.originalPrice || ""}
                onChange={(e) =>
                  onChange({
                    ...product,
                    originalPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Categoría *
            </label>
            <select
              value={product.category || "alforjas"}
              onChange={(e) => onChange({ ...product, category: e.target.value as Product["category"] })}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="alforjas">Alforjas</option>
              <option value="accesorios">Accesorios</option>
              <option value="ropa">Ropa</option>
              <option value="kits">Kits</option>
            </select>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Descripción corta *
            </label>
            <input
              type="text"
              value={product.shortDescription || ""}
              onChange={(e) => onChange({ ...product, shortDescription: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción breve para listados"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Descripción completa *
            </label>
            <textarea
              value={product.description || ""}
              onChange={(e) => onChange({ ...product, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción detallada del producto"
            />
          </div>

          {/* Imágenes principales */}
          <MultiImageUpload
            value={product.images || []}
            onChange={(paths) =>
              onChange({ ...product, images: paths, image: paths[0] || "" })
            }
            label="Imágenes principales del producto (color negro) *"
          />

          {/* Galería */}
          <button
            type="button"
            onClick={() => setShowGallery(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-secondary transition-colors"
          >
            <ImagePlus className="h-4 w-4" />
            <span className="text-sm">O seleccionar de la galería</span>
          </button>

          {/* Videos */}
          <VideoUpload
            value={product.videos || []}
            onChange={(paths) => onChange({ ...product, videos: paths })}
            label="Videos del producto (opcional)"
            maxVideos={3}
          />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Tags (separados por coma)
            </label>
            <input
              type="text"
              value={product.tags?.join(", ") || ""}
              onChange={(e) =>
                onChange({ ...product, tags: e.target.value.split(",").map((t) => t.trim()) })
              }
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="impermeable, roll-top, sillin"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={product.featured || false}
                onChange={(e) => onChange({ ...product, featured: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm">Producto Destacado</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={product.bestSeller || false}
                onChange={(e) => onChange({ ...product, bestSeller: e.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm">Más Vendido</span>
            </label>
          </div>

          {/* Variantes de Color */}
          <div className="pt-4 border-t border-border">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={product.hasVariants || false}
                onChange={(e) => {
                  const hasVariants = e.target.checked
                  onChange({ ...product, hasVariants, variants: hasVariants ? (product.variants || []) : [] })
                }}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium uppercase tracking-wider">
                ¿Este producto tiene variantes de color?
              </span>
            </label>

            {product.hasVariants && (
              <VariantManager
                variants={product.variants || []}
                productImages={product.images || []}
                onChange={(variants) => onChange({ ...product, variants })}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border rounded-md hover:bg-secondary"
          >
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

      <ImageGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelect={(path) => {
          onChange({ ...product, image: path })
          setShowGallery(false)
        }}
        currentImage={product.image}
      />
    </div>
  )
}
