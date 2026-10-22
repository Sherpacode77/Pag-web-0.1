import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { listKnownAds, setCreativeLetter } from "@/lib/meta-roas"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized
  if (!hasDatabaseUrl()) return NextResponse.json({ ads: [] })

  try {
    return NextResponse.json({ ads: await listKnownAds() })
  } catch (error) {
    console.error("GET /api/meta-roas/creatives:", error)
    return NextResponse.json({ error: "Error listando los anuncios" }, { status: 500 })
  }
}

// La letra es la misma que se escribe en la columna "Campaña" del Excel.
const assignSchema = z.object({
  adId: z.string().regex(/^\d{5,40}$/),
  letter: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{1,10}$/, "La letra solo puede tener letras o números")
    .nullable(),
  label: z.string().trim().max(120).nullish(),
})

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  const parsed = assignSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Payload invalido" }, { status: 400 })
  }

  try {
    const { adId, letter, label } = parsed.data
    await setCreativeLetter(adId, letter || null, label || null)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/meta-roas/creatives:", error)
    return NextResponse.json({ error: "Error guardando la letra" }, { status: 500 })
  }
}
