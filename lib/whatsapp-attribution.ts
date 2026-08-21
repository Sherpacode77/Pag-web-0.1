"use client"

const CODE_KEY = "wa_referral_code"
const CREATED_AT_KEY = "wa_referral_created_at"
const VALID_FOR_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

// Se llama en cada carga de pagina (ver AnalyticsManager) -- si la URL trae
// parametros de un clic de anuncio, se registra un codigo de referencia
// corto en el servidor y se guarda localmente para adjuntarlo despues al
// mensaje de WhatsApp, sin importar cuantas paginas navegue antes de escribir.
export function captureAdClickAttribution() {
  if (typeof window === "undefined") return

  const params = new URLSearchParams(window.location.search)
  const fbclid = params.get("fbclid") || undefined
  const gclid = params.get("gclid") || undefined
  const ttclid = params.get("ttclid") || undefined
  const utmSource = params.get("utm_source") || undefined
  const utmCampaign = params.get("utm_campaign") || undefined
  const utmMedium = params.get("utm_medium") || undefined

  if (!fbclid && !gclid && !ttclid && !utmSource && !utmCampaign) return

  fetch("/api/whatsapp-referral", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fbclid,
      gclid,
      ttclid,
      utmSource,
      utmCampaign,
      utmMedium,
      landingPage: window.location.pathname,
    }),
  })
    .then((res) => res.json())
    .then((data: { code?: string }) => {
      if (data.code) {
        localStorage.setItem(CODE_KEY, data.code)
        localStorage.setItem(CREATED_AT_KEY, String(Date.now()))
      }
    })
    .catch(() => {
      // Best-effort -- si falla, el boton de WhatsApp simplemente no lleva codigo.
    })
}

export function getWhatsAppReferralCode(): string | null {
  if (typeof window === "undefined") return null

  const code = localStorage.getItem(CODE_KEY)
  const createdAt = Number(localStorage.getItem(CREATED_AT_KEY) || 0)
  if (!code || !createdAt || Date.now() - createdAt > VALID_FOR_MS) return null

  return code
}
