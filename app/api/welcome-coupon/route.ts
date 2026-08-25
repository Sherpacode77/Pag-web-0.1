import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hasDatabaseUrl } from "@/lib/db"
import { createPendingLead, getLeadByEmail, getCouponCodeForLead } from "@/lib/db-welcome-coupon"
import { subscribeToNewsletter } from "@/lib/db-newsletter"
import { sendWelcomeCouponEmail } from "@/lib/email"

const SITE_URL = (process.env.SITE_URL || "https://cerounobikes.com").replace(/\/+$/, "")

const subscribeSchema = z.object({
  email: z.string().trim().email().max(255),
})

// POST - Suscribirse y recibir el cupón de bienvenida por correo. Responde
// siempre el mismo mensaje de éxito, exista o no ya un lead con ese email,
// para no filtrar si un correo ya está registrado.
export async function POST(request: NextRequest) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const body = await request.json()
    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Correo inválido" }, { status: 400 })
    }

    const email = parsed.data.email.trim().toLowerCase()
    const existing = await getLeadByEmail(email)

    if (existing) {
      if (!existing.activated_at) {
        const couponCode = await getCouponCodeForLead(existing.coupon_id)
        if (couponCode) {
          const activationUrl = `${SITE_URL}/bienvenida/${existing.activation_token}`
          await sendWelcomeCouponEmail(email, couponCode, activationUrl)
        }
      }
      return NextResponse.json({ success: true })
    }

    const { lead, coupon } = await createPendingLead(email)
    await subscribeToNewsletter(email)
    const activationUrl = `${SITE_URL}/bienvenida/${lead.activation_token}`
    await sendWelcomeCouponEmail(email, coupon.code, activationUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/welcome-coupon error:", error)
    return NextResponse.json({ error: "Error al procesar la suscripción" }, { status: 500 })
  }
}
