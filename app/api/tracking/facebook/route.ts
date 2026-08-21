import { NextRequest, NextResponse } from "next/server"
import { getClientIp } from "@/lib/auth"
import { sendFacebookCapiEvent, type FacebookCapiUserData } from "@/lib/facebook-capi"

type FacebookTrackingPayload = {
  eventName: string
  eventId?: string
  eventSourceUrl?: string
  customData?: Record<string, unknown>
  userData?: FacebookCapiUserData
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FacebookTrackingPayload
    if (!body.eventName) {
      return NextResponse.json(
        { error: "eventName es obligatorio" },
        { status: 400 }
      )
    }

    // Meta exige al menos un parametro de informacion de cliente por evento.
    // IP y user-agent los tomamos siempre del request (el navegador no puede
    // falsificarlos ni omitirlos), fbp/fbc/email/telefono son los que manda
    // el cliente cuando los tiene disponibles.
    const result = await sendFacebookCapiEvent({
      eventName: body.eventName,
      eventId: body.eventId,
      eventSourceUrl: body.eventSourceUrl,
      customData: body.customData,
      userData: {
        ...body.userData,
        clientIpAddress: body.userData?.clientIpAddress || getClientIp(request),
        clientUserAgent: body.userData?.clientUserAgent || request.headers.get("user-agent"),
      },
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: "details" in result ? result.details : undefined },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, result: result.result }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno enviando evento"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
