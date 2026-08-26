"use client"

import { useEffect } from "react"

// Cada despliegue reemplaza los archivos JS/CSS con nombres nuevos (hash de
// contenido) -- si el navegador tenia el sitio cargado desde ANTES de un
// despliegue, intenta pedir un archivo que ya no existe y revienta con
// "ChunkLoadError" (pantalla en blanco o rota). En vez de que el usuario
// tenga que darse cuenta y refrescar a mano, se detecta ese error puntual y
// se recarga la pagina sola -- una sola vez por sesion de pestaña, para no
// entrar en bucle si el error fuera por otra razon (deploy realmente roto).
const RELOAD_FLAG_KEY = "chunk-error-reload-attempted"

function isChunkLoadError(reason: unknown): boolean {
  if (!reason) return false
  const name = reason instanceof Error ? reason.name : ""
  const message = reason instanceof Error ? reason.message : String(reason)
  return name === "ChunkLoadError" || /Failed to load chunk|Loading chunk .* failed/i.test(message)
}

export function ChunkErrorReload() {
  useEffect(() => {
    function handlePossibleChunkError(reason: unknown) {
      if (!isChunkLoadError(reason)) return
      try {
        if (sessionStorage.getItem(RELOAD_FLAG_KEY)) return
        sessionStorage.setItem(RELOAD_FLAG_KEY, "1")
      } catch {
        // si sessionStorage no esta disponible, igual recargamos una vez
      }
      window.location.reload()
    }

    function onError(event: ErrorEvent) {
      handlePossibleChunkError(event.error ?? event.message)
    }
    function onRejection(event: PromiseRejectionEvent) {
      handlePossibleChunkError(event.reason)
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}
