import { createHash } from "crypto"
import { NextResponse } from "next/server"

type FacebookTrackingPayload = {
  eventName: string
  eventId?: string
  eventSourceUrl?: string
  customData?: Record<string, unknown>
  userData?: {
    email?: string
    phone?: string
    externalId?: string
    clientIpAddress?: string
    clientUserAgent?: string
    fbp?: string
    fbc?: string
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

export async function POST(request: Request) {
  try {
    const pixelId = process.env.FACEBOOK_PIXEL_ID
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN

    if (!pixelId || !accessToken) {
      return NextResponse.json(
        { error: "FACEBOOK_PIXEL_ID/FACEBOOK_ACCESS_TOKEN no configurados" },
        { status: 500 }
      )
    }

    const body = (await request.json()) as FacebookTrackingPayload
    if (!body.eventName) {
      return NextResponse.json(
        { error: "eventName es obligatorio" },
        { status: 400 }
      )
    }

    const userData = body.userData || {}
    const hashedUserData: Record<string, unknown> = {}

    if (userData.email) hashedUserData.em = [sha256(userData.email)]
    if (userData.phone) hashedUserData.ph = [sha256(userData.phone)]
    if (userData.externalId) hashedUserData.external_id = [sha256(userData.externalId)]
    if (userData.clientIpAddress) hashedUserData.client_ip_address = userData.clientIpAddress
    if (userData.clientUserAgent) hashedUserData.client_user_agent = userData.clientUserAgent
    if (userData.fbp) hashedUserData.fbp = userData.fbp
    if (userData.fbc) hashedUserData.fbc = userData.fbc

    const payload = {
      data: [
        {
          event_name: body.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: body.eventSourceUrl,
          event_id: body.eventId,
          user_data: hashedUserData,
          custom_data: body.customData || {},
        },
      ],
      test_event_code: process.env.FACEBOOK_TEST_EVENT_CODE,
    }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    )

    const result = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Error enviando evento a Facebook",
          details: result,
        },
        { status: response.status }
      )
    }

    return NextResponse.json({ ok: true, result }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno enviando evento"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
