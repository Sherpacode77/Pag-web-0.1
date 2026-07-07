"use client"

import { Check } from "lucide-react"
import type { ProductSizeVariant } from "@/lib/data"

interface SizeSelectorProps {
  sizes: ProductSizeVariant[]
  selectedSize: ProductSizeVariant | null
  onSelect: (size: ProductSizeVariant) => void
}

const SIZE_ORDER: Record<string, number> = { unica: 0, xs: 1, s: 2, m: 3, l: 4, xl: 5 }

export function SizeSelector({ sizes, selectedSize, onSelect }: SizeSelectorProps) {
  if (!sizes || sizes.length === 0) return null

  const sortedSizes = [...sizes].sort(
    (a, b) => (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99)
  )

  return (
    <div className="mt-6">
      <label className="block text-sm font-bold uppercase tracking-wider text-foreground mb-3">
        Talla
      </label>
      <div className="flex flex-wrap gap-3">
        {sortedSizes.map((size) => {
          const isSelected = selectedSize?.size === size.size
          const isOutOfStock = !size.inStock

          return (
            <button
              key={size.size}
              type="button"
              onClick={() => !isOutOfStock && onSelect(size)}
              disabled={isOutOfStock}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : isOutOfStock
                  ? "border-border bg-secondary/50 opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary/50"
              }`}
              title={isOutOfStock ? "No disponible" : size.sizeName}
            >
              <span className="text-sm font-medium">{size.sizeName}</span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
              {isOutOfStock && (
                <span className="text-xs text-muted-foreground ml-1">(Agotado)</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
