"use client"

import { Check } from "lucide-react"
import Image from "next/image"
import type { ProductVariantImage } from "@/lib/data"
import { assetUrl } from "@/lib/assets"

interface DesignSelectorProps {
  images: ProductVariantImage[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function DesignSelector({ images, selectedIndex, onSelect }: DesignSelectorProps) {
  const namedImages = images.filter((img) => img.designName.trim())
  // Si no hay al menos 2 diseños nombrados, no hay nada real que elegir.
  if (namedImages.length < 2) return null

  return (
    <div className="mt-6">
      <label className="block text-sm font-bold uppercase tracking-wider text-foreground mb-3">
        Diseño
      </label>
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => {
          if (!img.designName.trim()) return null
          const isSelected = index === selectedIndex

          return (
            <button
              key={`${img.url}-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={`relative flex items-center gap-2 rounded-lg border-2 py-1.5 pl-1.5 pr-3 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded bg-secondary">
                <Image
                  src={assetUrl(img.url || "/placeholder.svg")}
                  alt={img.designName}
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
              <span className="text-sm font-medium">{img.designName}</span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
