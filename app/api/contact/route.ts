import { NextRequest, NextResponse } from "next/server"
import { sendContactFormEmail } from "@/lib/email"
import { isContactDbEnabled, saveContactMessage } from "@/lib/db-contact"
import { getClientIp } from "@/lib/auth"

type ContactPayload = {
  nombre?: string
  email?: string
  telefono?: string
  asunto?: string
  mensaje?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactPayload
    const nombre = body.nombre?.trim()
    const email = body.email?.trim()
    const telefono = body.telefono?.trim()
    const asunto = body.asunto?.trim()
    const mensaje = body.mensaje?.trim()

    if (!nombre || !email || !telefono || !asunto || !mensaje) {
      return NextResponse.json(
        { error: "Nombre, email, telefono, asunto y mensaje son obligatorios" },
        { status: 400 }
      )
    }

    const results = await Promise.allSettled([
      sendContactFormEmail({ nombre, email, telefono, asunto, mensaje }),
      isContactDbEnabled()
        ? saveContactMessage({
            name: nombre,
            email,
            phone: telefono,
            subject: asunto,
            message: mensaje,
            ipAddress: getClientIp(request),
          })
        : Promise.resolve(),
    ])

    const [emailResult, dbResult] = results
    if (emailResult.status === "rejected") {
      console.error("POST /api/contact: fallo enviando email", emailResult.reason)
    }
    if (dbResult.status === "rejected") {
      console.error("POST /api/contact: fallo guardando en BD", dbResult.reason)
    }

    if (emailResult.status === "rejected" && dbResult.status === "rejected") {
      throw new Error("No se pudo enviar el mensaje ni guardarlo")
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno enviando el mensaje"
    console.error("POST /api/contact:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
