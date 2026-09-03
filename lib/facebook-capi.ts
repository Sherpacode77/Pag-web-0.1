import { createHash } from "crypto"

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

export type FacebookCapiUserData = {
  email?: string | null
  phone?: string | null
  externalId?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  fbp?: string | null
  fbc?: string | null
  firstName?: string | null
  lastName?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
}

export type FacebookCapiEventInput = {
  eventName: string
  eventId?: string
  eventSourceUrl?: string
  actionSource?: "website" | "system_generated" | "other"
  customData?: Record<string, unknown>
  userData?: FacebookCapiUserData
}

export type FacebookCapiResult =
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; error: string; details?: Record<string, unknown> }

// Envia un evento server-to-server a la Conversions API de Meta. Usada tanto
// por /api/tracking/facebook (eventos disparados desde el navegador) como
// por el webhook de MercadoPago (Purchase, que solo puede confirmarse en el
// servidor una vez que el pago esta realmente aprobado).
export async function sendFacebookCapiEvent(input: FacebookCapiEventInput): Promise<FacebookCapiResult> {
  const pixelId = process.env.FACEBOOK_PIXEL_ID
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    return { ok: false, error: "FACEBOOK_PIXEL_ID/FACEBOOK_ACCESS_TOKEN no configurados" }
  }

  const userData = input.userData || {}
  const hashedUserData: Record<string, unknown> = {}

  if (userData.email) hashedUserData.em = [sha256(userData.email)]
  if (userData.phone) hashedUserData.ph = [sha256(userData.phone.replace(/[^\d]/g, ""))]
  if (userData.externalId) hashedUserData.external_id = [sha256(userData.externalId)]
  if (userData.clientIpAddress) hashedUserData.client_ip_address = userData.clientIpAddress
  if (userData.clientUserAgent) hashedUserData.client_user_agent = userData.clientUserAgent
  if (userData.fbp) hashedUserData.fbp = userData.fbp
  if (userData.fbc) hashedUserData.fbc = userData.fbc
  if (userData.firstName) hashedUserData.fn = [sha256(userData.firstName)]
  if (userData.lastName) hashedUserData.ln = [sha256(userData.lastName)]
  if (userData.city) hashedUserData.ct = [sha256(userData.city.replace(/[^a-zA-Z]/g, ""))]
  if (userData.state) hashedUserData.st = [sha256(userData.state.replace(/[^a-zA-Z]/g, ""))]
  if (userData.zip) hashedUserData.zp = [sha256(userData.zip.replace(/[^\d]/g, ""))]
  if (userData.country) hashedUserData.country = [sha256(userData.country)]

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: input.actionSource ?? "website",
        event_source_url: input.eventSourceUrl,
        event_id: input.eventId,
        user_data: hashedUserData,
        custom_data: input.customData || {},
      },
    ],
    test_event_code: process.env.FACEBOOK_TEST_EVENT_CODE,
  }

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )

  const result = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    return { ok: false, error: "Error enviando evento a Facebook", details: result }
  }

  return { ok: true, result }
}
