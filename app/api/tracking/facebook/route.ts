import { NextResponse } from "next/server"
import { sendFacebookCapiEvent, type FacebookCapiUserData } from "@/lib/facebook-capi"

type FacebookTrackingPayload = {
  eventName: string
  eventId?: string
  eventSourceUrl?: string
  customData?: Record<string, unknown>
  userData?: FacebookCapiUserData
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FacebookTrackingPayload
    if (!body.eventName) {
      return NextResponse.json(
        { error: "eventName es obligatorio" },
        { status: 400 }
      )
    }

    const result = await sendFacebookCapiEvent({
      eventName: body.eventName,
      eventId: body.eventId,
      eventSourceUrl: body.eventSourceUrl,
      customData: body.customData,
      userData: body.userData,
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
