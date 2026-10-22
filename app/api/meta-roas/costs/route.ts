import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { listLetterReferences, listProductCosts, setLetterReferences, setProductCost } from "@/lib/meta-roas"

export const runtime = "nodejs"

// Costos de compra por referencia y referencias que ofrece cada creativo.
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized
  if (!hasDatabaseUrl()) return NextResponse.json({ costs: [], letters: [] })

  try {
    const [costs, letters] = await Promise.all([listProductCosts(), listLetterReferences()])
    return NextResponse.json({
      costs,
      letters: [...letters.entries()].map(([letter, codes]) => ({ letter, codes })).sort((a, b) => a.letter.localeCompare(b.letter)),
    })
  } catch (error) {
    console.error("GET /api/meta-roas/costs:", error)
    return NextResponse.json({ error: "Error obteniendo los costos" }, { status: 500 })
  }
}

const bodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cost"),
    code: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(120),
    unitCost: z.number().finite().min(0).max(100_000_000),
  }),
  z.object({
    type: z.literal("letter"),
    letter: z.string().trim().regex(/^[A-Za-z0-9]{1,10}$/),
    codes: z.array(z.string().trim().min(1).max(40)).max(20),
  }),
])

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Payload invalido" }, { status: 400 })
  }

  try {
    const body = parsed.data
    if (body.type === "cost") await setProductCost(body.code, body.name, body.unitCost)
    else await setLetterReferences(body.letter, body.codes)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/meta-roas/costs:", error)
    return NextResponse.json({ error: "Error guardando" }, { status: 500 })
  }
}
