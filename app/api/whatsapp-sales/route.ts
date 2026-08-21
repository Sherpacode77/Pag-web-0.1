import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession, getAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import {
  createWhatsAppSale,
  deleteWhatsAppSale,
  getWhatsAppReferralByCode,
  getWhatsAppSalesStats,
  listWhatsAppSales,
  type WhatsAppSaleChannel,
} from "@/lib/db-whatsapp"

const CHANNELS: WhatsAppSaleChannel[] = ["meta", "google", "tiktok", "organico", "otro"]
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidChannel(value: string | null): value is WhatsAppSaleChannel {
  return !!value && (CHANNELS as string[]).includes(value)
}

export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ sales: [], stats: { count: 0, totalAmount: 0 } })
  }

  const { searchParams } = request.nextUrl
  const channel = searchParams.get("channel")
  const since = searchParams.get("since") || ""
  const until = searchParams.get("until") || ""

  if (!isValidChannel(channel)) {
    return NextResponse.json({ error: "channel invalido" }, { status: 400 })
  }
  if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
    return NextResponse.json({ error: "since/until deben tener formato YYYY-MM-DD" }, { status: 400 })
  }

  try {
    const [sales, stats] = await Promise.all([
      listWhatsAppSales(channel, since, until),
      getWhatsAppSalesStats(channel, since, until),
    ])
    return NextResponse.json({ sales, stats })
  } catch (error) {
    console.error("GET /api/whatsapp-sales:", error)
    return NextResponse.json({ error: "Error obteniendo ventas de WhatsApp" }, { status: 500 })
  }
}

type CreateSalePayload = {
  referralCode?: string
  channel: string
  campaignName?: string
  amount: number
  customerName?: string
  note?: string
  saleDate: string
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  try {
    const body = (await request.json()) as CreateSalePayload

    if (!isValidChannel(body.channel)) {
      return NextResponse.json({ error: "channel invalido" }, { status: 400 })
    }
    if (!Number.isFinite(body.amount) || body.amount <= 0) {
      return NextResponse.json({ error: "amount debe ser un numero mayor a 0" }, { status: 400 })
    }
    if (!DATE_RE.test(body.saleDate)) {
      return NextResponse.json({ error: "saleDate debe tener formato YYYY-MM-DD" }, { status: 400 })
    }

    // Si viene un codigo de referencia, se valida que exista -- pero no es
    // obligatorio, el equipo puede registrar la venta sin codigo.
    let campaignName = body.campaignName ?? null
    if (body.referralCode) {
      const referral = await getWhatsAppReferralByCode(body.referralCode)
      if (referral && !campaignName) {
        campaignName = referral.utm_campaign
      }
    }

    const session = getAdminSession(request)

    const id = await createWhatsAppSale({
      referralCode: body.referralCode || null,
      channel: body.channel,
      campaignName,
      amount: body.amount,
      customerName: body.customerName || null,
      note: body.note || null,
      saleDate: body.saleDate,
      createdBy: session?.username ?? null,
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error("POST /api/whatsapp-sales:", error)
    return NextResponse.json({ error: "Error registrando la venta" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized

  const { searchParams } = request.nextUrl
  const id = Number(searchParams.get("id"))
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id invalido" }, { status: 400 })
  }

  try {
    const deleted = await deleteWhatsAppSale(id)
    return NextResponse.json({ deleted })
  } catch (error) {
    console.error("DELETE /api/whatsapp-sales:", error)
    return NextResponse.json({ error: "Error eliminando la venta" }, { status: 500 })
  }
}
