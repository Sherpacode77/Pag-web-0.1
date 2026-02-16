"use client"

import { useState } from "react"
import { Check } from "lucide-react"

interface ProductVariant {
  color: "negro" | "rojo" | "naranja" | "verde" | "azul"
  colorName: string
  image: string
  inStock: boolean
}

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onSelect: (variant: ProductVariant) => void
}

const colorHex = {
  negro: "#1F2937",
  rojo: "#EF4444",
  naranja: "#F97316",
  verde: "#10B981",
  azul: "#3B82F6",
}

export function VariantSelector({
  variants,
  selectedVariant,
  onSelect,
}: VariantSelectorProps) {
  if (!variants || variants.length === 0) return null

  // Ordenar variantes: negro primero, luego el resto
  const sortedVariants = [...variants].sort((a, b) => {
    if (a.color === "negro") return -1
    if (b.color === "negro") return 1
    return 0
  })

  return (
    <div className="mt-6">
      <label className="block text-sm font-bold uppercase tracking-wider text-foreground mb-3">
        Color disponible
      </label>
      <div className="flex flex-wrap gap-3">
        {sortedVariants.map((variant) => {
          const isSelected = selectedVariant?.color === variant.color
          const isOutOfStock = !variant.inStock

          return (
            <button
              key={variant.color}
              type="button"
              onClick={() => !isOutOfStock && onSelect(variant)}
              disabled={isOutOfStock}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : isOutOfStock
                  ? "border-border bg-secondary/50 opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary/50"
              }`}
              title={isOutOfStock ? "No disponible" : variant.colorName}
            >
              <div
                className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: colorHex[variant.color] }}
              />
              <span className="text-sm font-medium">{variant.colorName}</span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
              {isOutOfStock && (
                <span className="text-xs text-muted-foreground ml-1">
                  (Agotado)
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
