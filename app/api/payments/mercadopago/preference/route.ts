import { NextResponse } from "next/server"
import { MercadoPagoConfig, Preference } from "mercadopago"

type PreferenceItemInput = {
  id: string
  title: string
  unit_price: number
  quantity: number
  picture_url?: string
  category_id?: string
}

type PreferencePayload = {
  items: PreferenceItemInput[]
  payer?: {
    email?: string
    name?: string
    surname?: string
  }
  externalReference?: string
  backUrls?: {
    success?: string
    failure?: string
    pending?: string
  }
  metadata?: Record<string, unknown>
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  )
}

export async function POST(request: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json(
        { error: "MERCADOPAGO_ACCESS_TOKEN no configurado" },
        { status: 500 }
      )
    }

    const body = (await request.json()) as PreferencePayload

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Debes enviar al menos un item" },
        { status: 400 }
      )
    }

    const invalidItem = body.items.find(
      (item) =>
        !item.title ||
        item.unit_price <= 0 ||
        !Number.isFinite(item.unit_price) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.quantity)
    )

    if (invalidItem) {
      return NextResponse.json(
        { error: "Hay items con datos invalidos" },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const client = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(client)

    const result = await preference.create({
      body: {
        items: body.items.map((item) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: "COP",
          picture_url: item.picture_url,
          category_id: item.category_id,
        })),
        payer: body.payer,
        metadata: body.metadata,
        external_reference:
          body.externalReference || `cero-uno-${Date.now()}`,
        back_urls: {
          success:
            body.backUrls?.success || `${baseUrl}/tienda?checkout=success`,
          failure:
            body.backUrls?.failure || `${baseUrl}/tienda?checkout=failure`,
          pending:
            body.backUrls?.pending || `${baseUrl}/tienda?checkout=pending`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/payments/mercadopago/webhook`,
      },
    })

    return NextResponse.json(
      {
        id: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
      },
      { status: 201 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error creando preferencia"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
