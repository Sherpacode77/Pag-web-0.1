"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2, Video, Play } from "lucide-react"

interface VideoUploadProps {
  value: string[]
  onChange: (paths: string[]) => void
  label?: string
  maxVideos?: number
}

export function VideoUpload({
  value,
  onChange,
  label = "Videos del producto",
  maxVideos = 3,
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState("")
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    if (!files || files.length === 0) return

    // Verificar límite de videos
    if (value.length >= maxVideos) {
      setError(`Máximo ${maxVideos} videos por producto`)
      return
    }

    const remainingSlots = maxVideos - value.length
    if (files.length > remainingSlots) {
      setError(`Solo puedes subir ${remainingSlots} video(s) más`)
      return
    }

    setError("")
    setUploading(true)

    try {
      const uploadedPaths: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress(`Subiendo ${i + 1} de ${files.length}...`)

        // Validar tipo
        if (file.type !== "video/mp4") {
          setError(`${file.name} no es un archivo MP4 válido`)
          continue
        }

        // Validar tamaño (50MB)
        if (file.size > 50 * 1024 * 1024) {
          setError(`${file.name} es demasiado grande (máx 50MB)`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload/video", {
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
      setError("Error al subir los videos")
    } finally {
      setUploading(false)
      setUploadProgress("")
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

  async function removeVideo(index: number) {
    const videoPath = value[index]
    
    // Extraer el nombre del archivo de la ruta
    const filename = videoPath.split('/').pop()
    
    if (filename) {
      try {
        // Llamar a la API para eliminar el archivo físico
        const response = await fetch(`/api/upload/video?filename=${filename}`, {
          method: "DELETE",
        })
        
        if (!response.ok) {
          console.error("Error al eliminar el archivo físico del video")
        }
      } catch (error) {
        console.error("Error al eliminar video del servidor:", error)
      }
    }
    
    // Remover del array de videos
    const newVideos = value.filter((_, i) => i !== index)
    onChange(newVideos)
  }

  function moveVideo(fromIndex: number, toIndex: number) {
    const newVideos = [...value]
    const [removed] = newVideos.splice(fromIndex, 1)
    newVideos.splice(toIndex, 0, removed)
    onChange(newVideos)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium uppercase tracking-wider">
          {label}
        </label>
        <span className="text-xs text-muted-foreground">
          {value.length} / {maxVideos} videos
        </span>
      </div>

      {/* Preview de videos existentes */}
      {value.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {value.map((videoPath, index) => (
            <div
              key={videoPath}
              className="relative rounded-lg overflow-hidden border-2 border-border bg-secondary group"
            >
              <div className="relative aspect-square">
                <video
                  src={videoPath}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>
              {/* Badge de orden */}
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold z-10">
                {index + 1}
              </div>
              {/* Botones de control */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveVideo(index, index - 1)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                    title="Mover adelante"
                  >
                    ←
                  </button>
                )}
                {index < value.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveVideo(index, index + 1)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90"
                    title="Mover atrás"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeVideo(index)}
                  className="p-1.5 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
                  title="Eliminar video"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zona de upload */}
      {value.length < maxVideos && (
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
            accept="video/mp4"
            onChange={handleChange}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{uploadProgress}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Video className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Arrastra videos aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo MP4 (máx 50MB por video)
                </p>
                <p className="text-xs text-primary mt-1 font-medium">
                  Máximo {maxVideos} videos por producto
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Recomendaciones */}
      <div className="bg-muted/50 border border-border rounded-md px-4 py-3">
        <p className="text-xs font-medium text-foreground mb-2">
          📹 Recomendaciones de video:
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• <strong>Relación de aspecto:</strong> 1:1 (cuadrado) o 9:16 (vertical)</li>
          <li>• <strong>Resolución recomendada:</strong> 1080x1080 (1:1) o 1080x1920 (9:16)</li>
          <li>• <strong>Duración:</strong> 10-30 segundos para mejor rendimiento</li>
          <li>• <strong>Tamaño:</strong> Máximo 50MB por video</li>
          <li>• <strong>Formato:</strong> MP4 (H.264 codec)</li>
        </ul>
      </div>
    </div>
  )
}
