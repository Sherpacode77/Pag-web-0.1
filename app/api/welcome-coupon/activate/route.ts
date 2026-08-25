import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hasDatabaseUrl } from "@/lib/db"
import { activateLead } from "@/lib/db-welcome-coupon"

const activateSchema = z.object({
  token: z.string().trim().min(1),
  full_name: z.string().trim().min(2).max(200),
  document: z.string().trim().min(3).max(50),
  whatsapp: z.string().trim().min(7).max(30),
  consent: z.literal(true),
})

// POST - Completa el formulario corto del link del correo y activa el cupón.
export async function POST(request: NextRequest) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = activateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Debes completar todos los campos y aceptar el tratamiento de datos" },
        { status: 400 }
      )
    }

    const { token, ...input } = parsed.data
    const result = await activateLead(token, input)

    if (!result.ok) {
      if (result.reason === "document_taken") {
        return NextResponse.json(
          { error: "Ya existe un cupón de bienvenida registrado con ese número de cédula" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: "Este enlace de activación no es válido" }, { status: 404 })
    }

    return NextResponse.json({ success: true, couponCode: result.couponCode })
  } catch (error) {
    console.error("POST /api/welcome-coupon/activate error:", error)
    return NextResponse.json({ error: "Error al activar el cupón" }, { status: 500 })
  }
}
