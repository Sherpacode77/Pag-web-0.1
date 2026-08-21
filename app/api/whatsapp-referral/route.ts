import { NextRequest, NextResponse } from "next/server"
import { hasDatabaseUrl } from "@/lib/db"
import { createWhatsAppReferral } from "@/lib/db-whatsapp"

type ReferralPayload = {
  utmSource?: string
  utmCampaign?: string
  utmMedium?: string
  fbclid?: string
  gclid?: string
  ttclid?: string
  landingPage?: string
}

// Sin autenticacion: lo dispara cualquier visitante del sitio que llega
// desde un anuncio, antes de existir sesion alguna.
export async function POST(request: NextRequest) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "No configurado" }, { status: 200 })
  }

  try {
    const body = (await request.json()) as ReferralPayload

    const hasAnySignal =
      body.utmSource || body.utmCampaign || body.fbclid || body.gclid || body.ttclid
    if (!hasAnySignal) {
      return NextResponse.json({ error: "Sin datos de atribucion" }, { status: 400 })
    }

    const code = await createWhatsAppReferral({
      utmSource: body.utmSource,
      utmCampaign: body.utmCampaign,
      utmMedium: body.utmMedium,
      fbclid: body.fbclid,
      gclid: body.gclid,
      ttclid: body.ttclid,
      landingPage: body.landingPage,
    })

    return NextResponse.json({ code })
  } catch (error) {
    console.error("POST /api/whatsapp-referral:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
