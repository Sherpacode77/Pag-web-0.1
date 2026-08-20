"use client"

import { useRef, useState } from "react"
import { ImageUpload } from "./image-upload"
import { Check, ImagePlus, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { ProductVariant } from "@/lib/data"
import { CustomColorDialog } from "./custom-color-dialog"
import { QUICK_PRESET_COLORS, LEGACY_COLOR_HEX, slugifyColorName } from "@/lib/color-palette"

interface VariantManagerProps {
  variants: ProductVariant[]
  onChange: (variants: ProductVariant[]) => void
}

const availableColors = QUICK_PRESET_COLORS.map((c) => ({ value: c.slug, name: c.name, hex: c.hex }))

export function VariantManager({ variants, onChange }: VariantManagerProps) {
  const [selectedColors, setSelectedColors] = useState<string[]>(
    variants.map((v) => v.color)
  )
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [uploadingColor, setUploadingColor] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function colorInfoFor(colorValue: string): { name: string; hex: string } | null {
    const preset = availableColors.find((c) => c.value === colorValue)
    if (preset) return preset
    const variant = variants.find((v) => v.color === colorValue)
    if (variant) return { name: variant.colorName, hex: variant.colorHex ?? LEGACY_COLOR_HEX[colorValue] ?? "#9CA3AF" }
    return null
  }

  function toggleColor(colorValue: string) {
    if (selectedColors.includes(colorValue)) {
      // Remover color — requiere confirmación, se pierde sus imágenes y stock configurados
      const colorInfo = colorInfoFor(colorValue)
      toast.warning(`¿Quitar la variante ${colorInfo?.name ?? colorValue}?`, {
        description: "Se perderán sus imágenes y estado de stock configurados.",
        action: {
          label: "Quitar",
          onClick: () => {
            setSelectedColors((prev) => prev.filter((c) => c !== colorValue))
            onChange(variants.filter((v) => v.color !== colorValue))
          },
        },
        cancel: {
          label: "Cancelar",
          onClick: () => {},
        },
        duration: 8000,
      })
    } else {
      // Agregar color preset
      const colorInfo = availableColors.find((c) => c.value === colorValue)
      if (!colorInfo) return

      setSelectedColors([...selectedColors, colorValue])

      onChange([
        ...variants,
        {
          color: colorValue,
          colorName: colorInfo.name,
          colorHex: colorInfo.hex,
          images: [],
          inStock: true,
        },
      ])
    }
  }

  function addCustomColor(name: string, hex: string) {
    let slug = slugifyColorName(name)
    if (!slug) slug = "color"
    let candidate = slug
    let n = 2
    while (selectedColors.includes(candidate)) {
      candidate = `${slug}-${n}`
      n++
    }

    setSelectedColors([...selectedColors, candidate])
    onChange([
      ...variants,
      {
        color: candidate,
        colorName: name,
        colorHex: hex,
        images: [],
        inStock: true,
      },
    ])
    setCustomDialogOpen(false)
  }

  function addVariantImage(colorValue: string) {
    const updatedVariants = variants.map((v) =>
      v.color === colorValue
        ? { ...v, images: [...v.images, { url: "", designName: "" }] }
        : v
    )
    onChange(updatedVariants)
  }

  function updateVariantImageUrl(colorValue: string, index: number, url: string) {
    const updatedVariants = variants.map((v) =>
      v.color === colorValue
        ? { ...v, images: v.images.map((img, i) => (i === index ? { ...img, url } : img)) }
        : v
    )
    onChange(updatedVariants)
  }

  function updateVariantImageDesignName(colorValue: string, index: number, designName: string) {
    const updatedVariants = variants.map((v) =>
      v.color === colorValue
        ? { ...v, images: v.images.map((img, i) => (i === index ? { ...img, designName } : img)) }
        : v
    )
    onChange(updatedVariants)
  }

  function removeVariantImage(colorValue: string, index: number) {
    const updatedVariants = variants.map((v) =>
      v.color === colorValue
        ? { ...v, images: v.images.filter((_, i) => i !== index) }
        : v
    )
    onChange(updatedVariants)
  }

  // Mueve una imagen de la variante a otra posicion (ej. la ultima subida
  // hasta la primera posicion, que es la portada de esa variante).
  function moveVariantImage(colorValue: string, fromIndex: number, toIndex: number) {
    const updatedVariants = variants.map((v) => {
      if (v.color !== colorValue) return v
      const images = [...v.images]
      const [removed] = images.splice(fromIndex, 1)
      images.splice(toIndex, 0, removed)
      return { ...v, images }
    })
    onChange(updatedVariants)
  }

  // Sube varios archivos a la vez para una variante y agrega cada uno como
  // una imagen nueva (diseño vacio, se completa despues manualmente).
  async function addVariantImagesFromFiles(colorValue: string, files: FileList) {
    if (!files || files.length === 0) return

    setUploadError((prev) => ({ ...prev, [colorValue]: "" }))
    setUploadingColor(colorValue)

    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!file.type.startsWith("image/")) {
          setUploadError((prev) => ({ ...prev, [colorValue]: `${file.name} no es una imagen válida` }))
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          setUploadError((prev) => ({ ...prev, [colorValue]: `${file.name} es demasiado grande (máx 5MB)` }))
          continue
        }

        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch("/api/upload/image", { method: "POST", body: formData })
        const data = await response.json()

        if (response.ok && data.success) {
          uploadedUrls.push(data.path)
        } else {
          setUploadError((prev) => ({ ...prev, [colorValue]: data.error || `Error al subir ${file.name}` }))
        }
      }

      if (uploadedUrls.length > 0) {
        const updatedVariants = variants.map((v) =>
          v.color === colorValue
            ? { ...v, images: [...v.images, ...uploadedUrls.map((url) => ({ url, designName: "" }))] }
            : v
        )
        onChange(updatedVariants)
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadError((prev) => ({ ...prev, [colorValue]: "Error al subir las imágenes" }))
    } finally {
      setUploadingColor(null)
    }
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

        {/* Variantes de color personalizadas ya agregadas (no forman parte de los presets rápidos) */}
        {selectedColors
          .filter((c) => !availableColors.some((preset) => preset.value === c))
          .map((colorValue) => {
            const colorInfo = colorInfoFor(colorValue)
            if (!colorInfo) return null
            return (
              <button
                key={colorValue}
                type="button"
                onClick={() => toggleColor(colorValue)}
                className="relative mt-3 flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5 w-full"
              >
                <div
                  className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: colorInfo.hex }}
                />
                <span className="text-sm font-medium">{colorInfo.name}</span>
                <span className="text-xs text-muted-foreground">(personalizado)</span>
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              </button>
            )
          })}

        <button
          type="button"
          onClick={() => setCustomDialogOpen(true)}
          className="mt-3 flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
        >
          <Plus className="h-4 w-4" />
          Color personalizado
        </button>

        <CustomColorDialog
          open={customDialogOpen}
          onOpenChange={setCustomDialogOpen}
          onConfirm={addCustomColor}
        />
      </div>

      {/* Imágenes y diseños para cada variante seleccionada */}
      {selectedColors.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <p className="text-sm font-medium uppercase tracking-wider">
            Imágenes y diseños por variante
          </p>
          <p className="text-xs text-muted-foreground -mt-2">
            Cada color puede tener varias imágenes, una por cada diseño disponible en esa tela.
          </p>
          {selectedColors.map((colorValue) => {
            const colorInfo = colorInfoFor(colorValue)
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

                <div className="space-y-3">
                  {variant.images.map((img, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Imagen {index + 1}{index === 0 ? " (portada)" : ""}
                          </span>
                          <div className="flex items-center gap-1">
                            {index > 0 && (
                              <button
                                type="button"
                                onClick={() => moveVariantImage(colorValue, index, index - 1)}
                                className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                                title="Mover adelante"
                              >
                                ←
                              </button>
                            )}
                            {index > 1 && (
                              <button
                                type="button"
                                onClick={() => moveVariantImage(colorValue, index, 0)}
                                className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                                title="Llevar a portada"
                              >
                                Portada
                              </button>
                            )}
                            {index < variant.images.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveVariantImage(colorValue, index, index + 1)}
                                className="px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                                title="Mover atrás"
                              >
                                →
                              </button>
                            )}
                          </div>
                        </div>
                        <ImageUpload
                          value={img.url}
                          onChange={(path) => updateVariantImageUrl(colorValue, index, path)}
                          label=""
                        />
                        <input
                          type="text"
                          value={img.designName}
                          onChange={(e) =>
                            updateVariantImageDesignName(colorValue, index, e.target.value)
                          }
                          placeholder="Nombre del diseño (ej. Logo Clásico, Ruta Andina...)"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariantImage(colorValue, index)}
                        className="mt-1 text-muted-foreground hover:text-destructive"
                        aria-label="Quitar imagen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div
                    onClick={() => fileInputRefs.current[colorValue]?.click()}
                    className="relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-4 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
                  >
                    <input
                      ref={(el) => { fileInputRefs.current[colorValue] = el }}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) addVariantImagesFromFiles(colorValue, e.target.files)
                        e.target.value = ""
                      }}
                    />
                    {uploadingColor === colorValue ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Subiendo imágenes...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-3.5 w-3.5" />
                        Subir una o varias imágenes
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addVariantImage(colorValue)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar por URL manual
                  </button>

                  {uploadError[colorValue] && (
                    <p className="text-xs text-destructive">{uploadError[colorValue]}</p>
                  )}

                  {variant.images.length === 0 && (
                    <p className="text-xs text-destructive">⚠️ Agrega al menos una imagen para este color</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
