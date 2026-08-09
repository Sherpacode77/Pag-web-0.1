import { NextResponse } from "next/server"
import { sendTravelQuoteEmail } from "@/lib/email"

type TravelQuotePayload = {
  nombre?: string
  telefono?: string
  evento?: string
  tipoViaje?: "ida" | "ida_vuelta"
  fechaIda?: string
  fechaRegreso?: string
  personas?: string
  servicioTransporte?: boolean
  servicioHospedaje?: boolean
  mensaje?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TravelQuotePayload
    const nombre = body.nombre?.trim()
    const telefono = body.telefono?.trim()
    const evento = body.evento?.trim()
    const tipoViaje = body.tipoViaje === "ida_vuelta" ? "ida_vuelta" : "ida"
    const fechaIda = body.fechaIda?.trim()
    const fechaRegreso = body.fechaRegreso?.trim()
    const personas = body.personas?.trim()
    const mensaje = body.mensaje?.trim()

    if (!nombre || !telefono || !evento || !fechaIda || !personas) {
      return NextResponse.json(
        { error: "Nombre, telefono, evento, fecha y personas son obligatorios" },
        { status: 400 }
      )
    }

    if (tipoViaje === "ida_vuelta" && !fechaRegreso) {
      return NextResponse.json(
        { error: "La fecha de regreso es obligatoria para viajes de ida y vuelta" },
        { status: 400 }
      )
    }

    await sendTravelQuoteEmail({
      nombre,
      telefono,
      evento,
      tipoViaje,
      fechaIda,
      fechaRegreso: tipoViaje === "ida_vuelta" ? fechaRegreso : undefined,
      personas,
      servicioTransporte: Boolean(body.servicioTransporte),
      servicioHospedaje: Boolean(body.servicioHospedaje),
      mensaje,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno enviando la solicitud"
    console.error("POST /api/travel-quote:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
