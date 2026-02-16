"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, Check, Loader2, Image as ImageIcon } from "lucide-react"

interface ImageUploadProps {
  value: string
  onChange: (path: string) => void
  label?: string
}

export function ImageUpload({ value, onChange, label = "Imagen" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen")
      return
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen debe ser menor a 5MB")
      return
    }

    setError("")
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.success) {
        onChange(data.path)
      } else {
        setError(data.error || "Error al subir imagen")
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError("Error al subir la imagen")
    } finally {
      setUploading(false)
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  async function handleRemoveImage() {
    if (value) {
      try {
        // Llamar a la API para eliminar el archivo físico
        const response = await fetch(`/api/upload/images?path=${encodeURIComponent(value)}`, {
          method: "DELETE",
        })
        
        if (!response.ok) {
          console.error("Error al eliminar el archivo físico de la imagen")
        }
      } catch (error) {
        console.error("Error al eliminar imagen del servidor:", error)
      }
    }
    
    // Limpiar el valor
    onChange("")
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium uppercase tracking-wider">
        {label}
      </label>

      {/* Preview actual */}
      {value && !uploading && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-secondary">
          <Image
            src={value || "/placeholder.svg"}
            alt="Preview"
            fill
            className="object-contain"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
            title="Eliminar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Zona de upload */}
      {!value && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-secondary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Arrastra una imagen o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG o WEBP (máx. 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campo de texto para ruta manual (opcional) */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/products/imagen.jpg"
          className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {value && !uploading && (
          <button
            type="button"
            className="px-3 py-2 bg-green-500/10 text-green-500 rounded-md"
            title="Imagen cargada"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
