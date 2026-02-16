"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ImageUpload } from "./image-upload"
import { Check } from "lucide-react"

interface ProductVariant {
  color: "negro" | "rojo" | "naranja" | "verde" | "azul"
  colorName: string
  image: string
  inStock: boolean
}

interface VariantManagerProps {
  variants: ProductVariant[]
  onChange: (variants: ProductVariant[]) => void
  productImages?: string[]
}

const availableColors = [
  { value: "negro", name: "Negro", hex: "#1F2937" },
  { value: "rojo", name: "Rojo", hex: "#EF4444" },
  { value: "naranja", name: "Naranja", hex: "#F97316" },
  { value: "verde", name: "Verde", hex: "#10B981" },
  { value: "azul", name: "Azul", hex: "#3B82F6" },
] as const

export function VariantManager({ variants, onChange, productImages = [] }: VariantManagerProps) {
  const [selectedColors, setSelectedColors] = useState<string[]>(
    variants.map((v) => v.color)
  )

  // Sincronizar imagen de variante "negro" con productImages
  useEffect(() => {
    const negroVariant = variants.find((v) => v.color === "negro")
    if (negroVariant && productImages.length > 0 && negroVariant.image !== productImages[0]) {
      const updatedVariants = variants.map((v) =>
        v.color === "negro" ? { ...v, image: productImages[0] } : v
      )
      onChange(updatedVariants)
    }
  }, [productImages])

  function toggleColor(colorValue: string) {
    if (selectedColors.includes(colorValue)) {
      // Remover color
      setSelectedColors(selectedColors.filter((c) => c !== colorValue))
      onChange(variants.filter((v) => v.color !== colorValue))
    } else {
      // Agregar color
      const colorInfo = availableColors.find((c) => c.value === colorValue)
      if (!colorInfo) return

      setSelectedColors([...selectedColors, colorValue])
      
      // Si es negro, usar la primera imagen principal del producto
      const image = colorValue === "negro" ? (productImages[0] || "") : ""
      
      onChange([
        ...variants,
        {
          color: colorValue as any,
          colorName: colorInfo.name,
          image: image,
          inStock: true,
        },
      ])
    }
  }

  function updateVariantImage(colorValue: string, imagePath: string) {
    const updatedVariants = variants.map((v) =>
      v.color === colorValue ? { ...v, image: imagePath } : v
    )
    onChange(updatedVariants)
  }

  function toggleStock(colorValue: string) {
    const updatedVariants = variants.map((v) =>
      v.color === colorValue ? { ...v, inStock: !v.inStock } : v
    )
    onChange(updatedVariants)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-3 uppercase tracking-wider">
          Selecciona los colores disponibles
        </label>
        <div className="grid grid-cols-2 gap-3">
          {availableColors.map((color) => {
            const isSelected = selectedColors.includes(color.value)
            return (
              <button
                key={color.value}
                type="button"
                onClick={() => toggleColor(color.value)}
                className={`relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div
                  className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-sm font-medium">{color.name}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Imágenes para cada variante seleccionada */}
      {selectedColors.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <p className="text-sm font-medium uppercase tracking-wider">
            Imágenes por variante
          </p>
          {selectedColors.map((colorValue) => {
            const colorInfo = availableColors.find((c) => c.value === colorValue)
            const variant = variants.find((v) => v.color === colorValue)
            if (!colorInfo || !variant) return null

            return (
              <div
                key={colorValue}
                className="p-4 rounded-lg border border-border bg-secondary/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: colorInfo.hex }}
                    />
                    <span className="text-sm font-bold">{colorInfo.name}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={variant.inStock}
                      onChange={() => toggleStock(colorValue)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">
                      En stock
                    </span>
                  </label>
                </div>
                {colorValue === "negro" ? (
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Negro</span> usa automáticamente las <strong>Imágenes principales del producto</strong>.
                    </p>
                    {productImages.length > 0 ? (
                      <div className="mt-2 flex gap-2">
                        {productImages.slice(0, 3).map((img, idx) => (
                          <div key={img} className="relative h-14 w-14 rounded border border-border overflow-hidden">
                            <Image src={img || "/placeholder.svg"} alt={`Imagen ${idx + 1}`} fill className="object-cover" />
                          </div>
                        ))}
                        {productImages.length > 3 && (
                          <div className="h-14 w-14 rounded border border-border bg-secondary flex items-center justify-center">
                            <span className="text-xs font-medium">+{productImages.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-destructive">⚠️ Sube imágenes principales arriba</p>
                    )}
                  </div>
                ) : (
                  <ImageUpload
                    value={variant.image}
                    onChange={(path) => updateVariantImage(colorValue, path)}
                    label={`Imagen ${colorInfo.name}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
