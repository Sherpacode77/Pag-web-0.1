"use client"

import { Check } from "lucide-react"
import type { ProductSizeVariant, SizeValue } from "@/lib/data"

interface SizeManagerProps {
  sizes: ProductSizeVariant[]
  onChange: (sizes: ProductSizeVariant[]) => void
}

export const availableSizes: { value: SizeValue; name: string }[] = [
  { value: "unica", name: "Talla Única" },
  { value: "xs", name: "XS" },
  { value: "s", name: "S" },
  { value: "m", name: "M" },
  { value: "l", name: "L" },
  { value: "xl", name: "XL" },
]

export function SizeManager({ sizes, onChange }: SizeManagerProps) {
  function toggleSize(value: SizeValue) {
    const exists = sizes.some((s) => s.size === value)
    if (exists) {
      onChange(sizes.filter((s) => s.size !== value))
    } else {
      const sizeInfo = availableSizes.find((s) => s.value === value)
      if (!sizeInfo) return
      onChange([...sizes, { size: value, sizeName: sizeInfo.name, inStock: true }])
    }
  }

  function toggleStock(value: SizeValue) {
    onChange(sizes.map((s) => (s.size === value ? { ...s, inStock: !s.inStock } : s)))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {availableSizes.map((size) => {
          const isSelected = sizes.some((s) => s.size === size.value)
          return (
            <button
              key={size.value}
              type="button"
              onClick={() => toggleSize(size.value)}
              className={`relative flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-sm font-medium">{size.name}</span>
              {isSelected && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {sizes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          {sizes.map((s) => (
            <label
              key={s.size}
              className="flex items-center justify-between p-2 rounded-md bg-secondary/20 cursor-pointer"
            >
              <span className="text-sm font-medium">{s.sizeName}</span>
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.inStock}
                  onChange={() => toggleStock(s.size)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-muted-foreground">En stock</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
