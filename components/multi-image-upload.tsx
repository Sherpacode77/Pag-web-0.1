"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Upload, X, Loader2, ImagePlus } from "lucide-react"

interface MultiImageUploadProps {
  value: string[]
  onChange: (paths: string[]) => void
  label?: string
}

export function MultiImageUpload({
  value,
  onChange,
  label = "Imágenes",
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    if (!files || files.length === 0) return

    setError("")
    setUploading(true)

    try {
      const uploadedPaths: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Validar tipo
        if (!file.type.startsWith("image/")) {
          setError(`${file.name} no es una imagen válida`)
          continue
        }

        // Validar tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} es demasiado grande (máx 5MB)`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (response.ok && data.success) {
          uploadedPaths.push(data.path)
        } else {
          setError(data.error || `Error al subir ${file.name}`)
        }
      }

      if (uploadedPaths.length > 0) {
        onChange([...value, ...uploadedPaths])
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError("Error al subir las imágenes")
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

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  async function removeImage(index: number) {
    const imagePath = value[index]
    
    try {
      // Llamar a la API para eliminar el archivo físico
      const response = await fetch(`/api/upload/images?path=${encodeURIComponent(imagePath)}`, {
        method: "DELETE",
      })
      
      if (!response.ok) {
        console.error("Error al eliminar el archivo físico de la imagen")
      }
    } catch (error) {
      console.error("Error al eliminar imagen del servidor:", error)
    }
    
    // Remover del array de imágenes
    const newImages = value.filter((_, i) => i !== index)
    onChange(newImages)
  }

  function moveImage(fromIndex: number, toIndex: number) {
    const newImages = [...value]
    const [removed] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, removed)
    onChange(newImages)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium uppercase tracking-wider">
        {label}
      </label>

      {/* Preview de imágenes existentes */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {value.map((imagePath, index) => (
            <div
              key={imagePath}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-border bg-secondary group"
            >
              <Image
                src={imagePath || "/placeholder.svg"}
                alt={`Imagen ${index + 1}`}
                fill
                className="object-cover"
              />
              {/* Badge de orden */}
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              {/* Botones de control */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                    title="Mover adelante"
                  >
                    ←
                  </button>
                )}
                {index < value.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                    title="Mover atrás"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  title="Eliminar imagen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zona de upload */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-secondary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Subiendo imágenes...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <ImagePlus className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Arrastra imágenes aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG o WEBP (máx 5MB por imagen)
              </p>
              <p className="text-xs text-primary mt-1 font-medium">
                La primera imagen será la portada del producto
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
