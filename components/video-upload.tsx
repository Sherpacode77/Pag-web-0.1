"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2, Video, Play } from "lucide-react"
import { assetUrl } from "@/lib/assets"

interface VideoUploadProps {
  value: string[]
  onChange: (paths: string[]) => void
  label?: string
  maxVideos?: number
}

interface UploadStats {
  percent: number
  loaded: number
  total: number
  speedBps: number
  etaSeconds: number
}

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1)
}

function formatEta(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "calculando..."
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}m ${secs}s`
}

// XHR en vez de fetch: es la única API del navegador que expone progreso de
// subida (fetch no lo soporta), sin depender de ninguna libreria externa.
function uploadVideoWithProgress(
  file: File,
  onProgress: (stats: UploadStats) => void
): Promise<{ ok: boolean; data: { success?: boolean; path?: string; error?: string } }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)

    let lastLoaded = 0
    let lastTime = performance.now()
    let emaSpeedBps = 0

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return

      const now = performance.now()
      const dt = (now - lastTime) / 1000
      if (dt > 0.15) {
        const instantSpeed = (event.loaded - lastLoaded) / dt
        emaSpeedBps = emaSpeedBps === 0 ? instantSpeed : emaSpeedBps * 0.7 + instantSpeed * 0.3
        lastLoaded = event.loaded
        lastTime = now
      }

      const remaining = event.total - event.loaded
      onProgress({
        percent: Math.round((event.loaded / event.total) * 100),
        loaded: event.loaded,
        total: event.total,
        speedBps: emaSpeedBps,
        etaSeconds: emaSpeedBps > 0 ? remaining / emaSpeedBps : 0,
      })
    }

    xhr.onload = () => {
      let data: { success?: boolean; path?: string; error?: string } = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // respuesta no-JSON (error de servidor) — data queda vacio
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, data })
    }

    xhr.onerror = () => reject(new Error("Error de red al subir el video"))

    xhr.open("POST", "/api/upload/video")
    xhr.send(formData)
  })
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
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null)
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

        setUploadStats(null)
        const { ok, data } = await uploadVideoWithProgress(file, setUploadStats)

        if (ok && data.success && data.path) {
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
      setUploadStats(null)
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

  function removeVideo(index: number) {
    // El borrado físico del archivo se difiere hasta que se confirme "Guardar"
    // (lo maneja ProductModal) — aquí solo se actualiza el array en memoria.
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
                  src={assetUrl(videoPath)}
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

              {uploadStats && (
                <div className="w-full max-w-xs space-y-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-[width] duration-150"
                      style={{ width: `${uploadStats.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-medium text-foreground">
                    <span>{uploadStats.percent}%</span>
                    <span>
                      Faltan {formatMB(uploadStats.total - uploadStats.loaded)} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {uploadStats.speedBps > 0
                        ? `${formatMB(uploadStats.speedBps)} MB/s`
                        : "calculando velocidad..."}
                    </span>
                    <span>~{formatEta(uploadStats.etaSeconds)} restante</span>
                  </div>
                </div>
              )}
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
