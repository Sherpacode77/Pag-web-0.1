"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X, Trash2, Search, Check } from "lucide-react"

interface ImageData {
  name: string
  path: string
  size: number
  uploadedAt: string
}

interface ImageGalleryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (path: string) => void
  currentImage?: string
}

export function ImageGalleryModal({
  isOpen,
  onClose,
  onSelect,
  currentImage,
}: ImageGalleryModalProps) {
  const [images, setImages] = useState<ImageData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPath, setSelectedPath] = useState(currentImage || "")

  useEffect(() => {
    if (isOpen) {
      loadImages()
    }
  }, [isOpen])

  async function loadImages() {
    try {
      setLoading(true)
      const response = await fetch("/api/upload/images")
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error("Error loading images:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(imagePath: string, e: React.MouseEvent) {
    e.stopPropagation()
    
    if (!confirm("¿Estás seguro de eliminar esta imagen?")) return

    try {
      const response = await fetch(
        `/api/upload/images?path=${encodeURIComponent(imagePath)}`,
        { method: "DELETE" }
      )

      if (response.ok) {
        setImages(images.filter((img) => img.path !== imagePath))
        if (selectedPath === imagePath) {
          setSelectedPath("")
        }
      }
    } catch (error) {
      console.error("Error deleting image:", error)
      alert("Error al eliminar la imagen")
    }
  }

  function handleSelect() {
    if (selectedPath) {
      onSelect(selectedPath)
      onClose()
    }
  }

  const filteredImages = images.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-wider">
            Galería de Imágenes
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar imágenes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando imágenes...
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery
                ? "No se encontraron imágenes"
                : "No hay imágenes. Sube tu primera imagen desde el formulario."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredImages.map((image) => (
                <div
                  key={image.path}
                  onClick={() => setSelectedPath(image.path)}
                  className={`group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedPath === image.path
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Image
                    src={image.path || "/placeholder.svg"}
                    alt={image.name}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Selected indicator */}
                  {selectedPath === image.path && (
                    <div className="absolute top-2 right-2 p-1 bg-primary rounded-full">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(image.path, e)}
                    className="absolute top-2 left-2 p-1.5 bg-destructive/80 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  {/* Info overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{image.name}</p>
                    <p className="text-[10px] text-white/70">
                      {(image.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredImages.length} imagen{filteredImages.length !== 1 ? "es" : ""}
            {selectedPath && " • 1 seleccionada"}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-border rounded-md hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedPath}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Seleccionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
