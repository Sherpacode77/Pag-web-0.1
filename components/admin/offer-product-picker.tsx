"use client"

import { X } from "lucide-react"
import type { Product } from "@/lib/data"
import type { OfferProductEntry } from "@/lib/db-offers"

interface OfferProductPickerProps {
  products: Product[]
  entry: OfferProductEntry
  onChange: (entry: OfferProductEntry) => void
  onRemove?: () => void
  showQuantity: boolean
}

export function OfferProductPicker({
  products,
  entry,
  onChange,
  onRemove,
  showQuantity,
}: OfferProductPickerProps) {
  const selectedProduct = products.find((p) => p.id === entry.productId)

  function toggleColor(color: string) {
    const isSelected = entry.variantColors.includes(color)
    onChange({
      ...entry,
      variantColors: isSelected
        ? entry.variantColors.filter((c) => c !== color)
        : [...entry.variantColors, color],
    })
  }

  return (
    <div className="border border-border rounded-md p-4 space-y-3 bg-secondary/20">
      <div className="flex items-start gap-3">
        <select
          value={entry.productId}
          onChange={(e) => onChange({ ...entry, productId: e.target.value, variantColors: [] })}
          className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Selecciona un producto...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {showQuantity && (
          <input
            type="number"
            min={1}
            max={20}
            value={entry.quantity ?? 1}
            onChange={(e) => onChange({ ...entry, quantity: Math.max(1, Number(e.target.value)) })}
            title="Cantidad de unidades"
            className="w-20 px-2 py-2 bg-background border border-input rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-muted-foreground hover:text-destructive"
            title="Quitar producto"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {selectedProduct?.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Colores incluidos (ninguno seleccionado = todos)
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedProduct.variants.map((v) => (
              <button
                key={v.color}
                type="button"
                onClick={() => toggleColor(v.color)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  entry.variantColors.includes(v.color)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {v.colorName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
