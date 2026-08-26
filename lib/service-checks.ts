import { hasDatabaseUrl, getDbPool } from "@/lib/db"
import { getAllProductsWithFallback } from "@/lib/db-products"
import {
  upsertServiceStatus,
  getServiceStatusById,
  type ServiceStatusValue,
} from "@/lib/db-service-status"

// Debe coincidir con el numero real usado en components/whatsapp-button.tsx.
const WHATSAPP_NUMBER = "573114515672"

function getSiteUrl() {
  return (process.env.SITE_URL || "https://cerounobikes.com").replace(/\/+$/, "")
}

type CheckOutcome = {
  ok: boolean
  degraded?: boolean
  errorType?: string
  errorMessage?: string
}

type ServiceCheck = {
  id: string
  name: string
  run: () => Promise<CheckOutcome>
}

async function withTiming<T extends CheckOutcome>(
  fn: () => Promise<T>
): Promise<T & { responseTimeMs: number }> {
  const start = Date.now()
  try {
    const result = await fn()
    return { ...result, responseTimeMs: Date.now() - start }
  } catch (error) {
    return {
      ok: false,
      errorType: "excepcion",
      errorMessage: error instanceof Error ? error.message : String(error),
      responseTimeMs: Date.now() - start,
    } as T & { responseTimeMs: number }
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function absoluteMediaUrl(mediaPath: string): string {
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath
  return `${getSiteUrl()}${mediaPath.startsWith("/") ? mediaPath : `/${mediaPath}`}`
}

// Verifica que una URL de imagen/video responda correctamente. Usa HEAD
// primero (mas liviano); si el servidor no lo soporta, reintenta con GET.
async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, { method: "HEAD", cache: "no-store" }, 8000)
    if (res.ok) return true
    if (res.status !== 405 && res.status !== 501) return false
  } catch {
    // sigue al intento con GET
  }
  try {
    const res = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, 8000)
    return res.ok
  } catch {
    return false
  }
}

// Corre `isUrlReachable` sobre una lista de URLs con concurrencia limitada
// para no saturar el CDN/servidor con demasiadas solicitudes simultaneas.
async function checkUrlsReachability(urls: string[], concurrency = 6): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()
  let index = 0
  async function worker() {
    while (index < urls.length) {
      const current = urls[index]
      index += 1
      results.set(current, await isUrlReachable(current))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
  return results
}

// Secciones publicas del sitio a monitorear (aparte de "/", que ya tiene su
// propio check dedicado "site_home"). Lista curada aparte de components/navbar.tsx
// a proposito -- no todo lo que aparece en el menu es necesariamente relevante
// para salud del sitio, y viceversa (ej. /tienda no esta en el navbar).
const PUBLIC_SECTIONS = [
  "/tienda",
  "/alforjas",
  "/accesorios",
  "/travel",
  "/ofertas",
  "/contacto",
  "/nosotros",
  "/blog",
]

// Secciones del panel de administracion. Se verifican sin cookie de sesion
// (el check corre server-side) -- las paginas admin son "use client" y
// redirigen a /admin recien despues de montar en el navegador si no hay
// sesion, asi que devuelven 200 con el shell igual; esto detecta rutas
// caidas/rotas por deploy, no problemas dentro de una sesion autenticada.
const ADMIN_SECTIONS = [
  "/admin",
  "/admin/dashboard",
  "/admin/inventario",
  "/admin/pedidos",
  "/admin/ofertas",
  "/admin/cupones",
  "/admin/ventas",
  "/admin/trafico",
  "/admin/servicios",
]

function buildSectionsCheck(id: string, name: string, paths: string[]): ServiceCheck {
  return {
    id,
    name,
    async run() {
      const siteUrl = getSiteUrl()
      const urls = paths.map((p) => `${siteUrl}${p}`)
      const results = await checkUrlsReachability(urls)
      const broken = [...results.entries()]
        .filter(([, ok]) => !ok)
        .map(([url]) => url.replace(siteUrl, ""))

      if (broken.length === 0) return { ok: true }

      const allBroken = broken.length === urls.length
      const percent = Math.round((broken.length / urls.length) * 100)
      const errorMessage = `${broken.length} de ${urls.length} secciones no responden (${percent}%): ${broken.join(", ")}`

      return allBroken
        ? { ok: false, errorType: "secciones_caidas", errorMessage }
        : { ok: false, degraded: true, errorType: "secciones_rotas", errorMessage }
    },
  }
}

const CHECKS: ServiceCheck[] = [
  {
    id: "site_home",
    name: "Sitio web (Home)",
    async run() {
      const res = await fetchWithTimeout(`${getSiteUrl()}/`, { cache: "no-store" })
      if (!res.ok) {
        return { ok: false, errorType: `http_${res.status}`, errorMessage: `El home respondio ${res.status}` }
      }
      return { ok: true }
    },
  },
  {
    id: "mercadopago_checkout",
    name: "Checkout MercadoPago",
    async run() {
      const res = await fetchWithTimeout(
        `${getSiteUrl()}/api/payments/mercadopago/preference`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                id: "health-check",
                title: "Verificacion automatica de estado",
                unit_price: 100,
                quantity: 1,
              },
            ],
          }),
          cache: "no-store",
        },
        15000
      )
      const data = (await res.json().catch(() => ({}))) as { init_point?: string; error?: string }
      if (!res.ok || !data.init_point) {
        return {
          ok: false,
          errorType: !res.ok ? `http_${res.status}` : "sin_init_point",
          errorMessage: data.error || "No se recibio init_point de MercadoPago",
        }
      }
      return { ok: true }
    },
  },
  {
    id: "whatsapp_button",
    name: "Boton flotante WhatsApp",
    async run() {
      const res = await fetchWithTimeout(
        `https://wa.me/${WHATSAPP_NUMBER}`,
        { redirect: "follow" },
        10000
      )
      if (res.status >= 400) {
        return { ok: false, errorType: `http_${res.status}`, errorMessage: `wa.me respondio ${res.status} para +${WHATSAPP_NUMBER}` }
      }
      return { ok: true }
    },
  },
  {
    id: "facebook_feed",
    name: "Feed de catalogo (Meta/Facebook)",
    async run() {
      const res = await fetchWithTimeout(`${getSiteUrl()}/feeds/facebook-catalog`, { cache: "no-store" })
      if (!res.ok) {
        return { ok: false, errorType: `http_${res.status}`, errorMessage: `El feed respondio ${res.status}` }
      }
      const text = await res.text()
      const lines = text.split("\n").filter((line) => line.trim().length > 0)
      if (lines.length === 0 || !lines[0].startsWith("id\t")) {
        return { ok: false, errorType: "formato_invalido", errorMessage: "El feed no empieza con el encabezado esperado" }
      }

      const header = lines[0].split("\t")
      const imageLinkIndex = header.indexOf("image_link")
      const imageUrls = new Set<string>()
      if (imageLinkIndex !== -1) {
        for (const line of lines.slice(1)) {
          const value = line.split("\t")[imageLinkIndex]
          if (value) imageUrls.add(value)
        }
      }

      const videoUrls = new Set<string>()
      try {
        const products = await getAllProductsWithFallback()
        for (const product of products) {
          for (const video of product.videos ?? []) {
            videoUrls.add(absoluteMediaUrl(video))
          }
        }
      } catch {
        // si falla la lectura de productos para videos, seguimos solo con imagenes
      }

      const [imageResults, videoResults] = await Promise.all([
        checkUrlsReachability([...imageUrls]),
        checkUrlsReachability([...videoUrls]),
      ])

      const brokenImages = [...imageResults.values()].filter((ok) => !ok).length
      const brokenVideos = [...videoResults.values()].filter((ok) => !ok).length
      const totalChecked = imageResults.size + videoResults.size

      if (brokenImages > 0 || brokenVideos > 0) {
        const parts: string[] = []
        if (brokenImages > 0) parts.push(`${brokenImages} imagen${brokenImages === 1 ? "" : "es"}`)
        if (brokenVideos > 0) parts.push(`${brokenVideos} video${brokenVideos === 1 ? "" : "s"}`)
        const brokenTotal = brokenImages + brokenVideos
        const percent = totalChecked > 0 ? Math.round((brokenTotal / totalChecked) * 100) : 0
        return {
          ok: false,
          degraded: true,
          errorType: "media_rota",
          errorMessage: `${parts.join(" y ")} rota${brokenTotal === 1 ? "" : "s"} o inaccesible${brokenTotal === 1 ? "" : "s"} de ${totalChecked} archivos revisados (${percent}%)`,
        }
      }

      return { ok: true }
    },
  },
  {
    id: "database",
    name: "Base de datos",
    async run() {
      if (!hasDatabaseUrl()) {
        return { ok: true, errorType: "no_configurada" }
      }
      const pool = getDbPool()
      await pool.query("SELECT 1")
      return { ok: true }
    },
  },
  {
    id: "email_service",
    name: "Notificaciones por correo (Resend)",
    async run() {
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        return {
          ok: false,
          errorType: "config_faltante",
          errorMessage: "RESEND_API_KEY o RESEND_FROM_EMAIL no configurados",
        }
      }
      return { ok: true }
    },
  },
  buildSectionsCheck("site_sections", "Secciones del sitio web", PUBLIC_SECTIONS),
  buildSectionsCheck("admin_sections", "Secciones del panel de administración", ADMIN_SECTIONS),
]

export type ServiceCheckRunResult = {
  serviceId: string
  serviceName: string
  status: ServiceStatusValue
  errorType: string | null
  errorMessage: string | null
  responseTimeMs: number
}

// Corre todos los checks en paralelo, calcula la transicion de estado
// (contra lo que ya habia guardado) y persiste el resultado de cada uno.
export async function runAllServiceChecks(): Promise<ServiceCheckRunResult[]> {
  const results = await Promise.all(
    CHECKS.map(async (check) => {
      const outcome = await withTiming(check.run)
      const previous = await getServiceStatusById(check.id).catch(() => null)

      const isNoteOnly = outcome.ok && outcome.errorType === "no_configurada"
      const status: ServiceStatusValue = isNoteOnly
        ? "unknown"
        : outcome.ok
          ? "ok"
          : outcome.degraded
            ? "degraded"
            : "failing"

      const now = new Date()
      const consecutiveFailures =
        status === "failing" || status === "degraded" ? (previous?.consecutive_failures ?? 0) + 1 : 0

      await upsertServiceStatus({
        serviceId: check.id,
        serviceName: check.name,
        status,
        lastOkAt: status === "ok" ? now : previous?.last_ok_at ? new Date(previous.last_ok_at) : null,
        lastFailureAt:
          status === "failing" || status === "degraded"
            ? now
            : previous?.last_failure_at
              ? new Date(previous.last_failure_at)
              : null,
        errorType: outcome.errorType ?? null,
        errorMessage: outcome.errorMessage ?? null,
        responseTimeMs: outcome.responseTimeMs,
        consecutiveFailures,
      })

      return {
        serviceId: check.id,
        serviceName: check.name,
        status,
        errorType: outcome.errorType ?? null,
        errorMessage: outcome.errorMessage ?? null,
        responseTimeMs: outcome.responseTimeMs,
      }
    })
  )

  return results
}
