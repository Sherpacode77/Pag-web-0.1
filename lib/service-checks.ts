import { hasDatabaseUrl, getDbPool } from "@/lib/db"
import {
  upsertServiceStatus,
  getServiceStatusById,
  type ServiceStatusValue,
} from "@/lib/db-service-status"

// Debe coincidir con el numero real usado en components/whatsapp-button.tsx.
const WHATSAPP_NUMBER = "573114755825"

function getSiteUrl() {
  return (process.env.SITE_URL || "https://cerounobikes.com").replace(/\/+$/, "")
}

type CheckOutcome = {
  ok: boolean
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
      if (!text.startsWith("id\t")) {
        return { ok: false, errorType: "formato_invalido", errorMessage: "El feed no empieza con el encabezado esperado" }
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
      const status: ServiceStatusValue = isNoteOnly ? "unknown" : outcome.ok ? "ok" : "failing"

      const now = new Date()
      const consecutiveFailures =
        status === "failing" ? (previous?.consecutive_failures ?? 0) + 1 : 0

      await upsertServiceStatus({
        serviceId: check.id,
        serviceName: check.name,
        status,
        lastOkAt: status === "ok" ? now : previous?.last_ok_at ? new Date(previous.last_ok_at) : null,
        lastFailureAt:
          status === "failing" ? now : previous?.last_failure_at ? new Date(previous.last_failure_at) : null,
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
