import { NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { hasDatabaseUrl } from "@/lib/db"
import {
  getOrderByNumber,
  getOrderWithItemsByNumber,
  updateOrderPaymentStatus,
  type OrderStatus,
} from "@/lib/db-orders"
import { sendOrderPaidEmails } from "@/lib/email"

const STATUS_MAP: Record<string, OrderStatus> = {
  approved: "paid",
  pending: "pending",
  in_process: "pending",
  authorized: "pending",
  in_mediation: "pending",
  rejected: "cancelled",
  cancelled: "cancelled",
  refunded: "refunded",
  charged_back: "refunded",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  return NextResponse.json(
    {
      ok: true,
      topic: searchParams.get("topic"),
      id: searchParams.get("id"),
      resource: searchParams.get("resource"),
    },
    { status: 200 }
  )
}

export async function POST(request: Request) {
  let payload: any
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ received: false, error: "Webhook payload invalido" }, { status: 400 })
  }

  const type = payload?.type
  const paymentId = payload?.data?.id

  // Solo nos interesan notificaciones de pago; el resto se confirma sin procesar.
  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken || !hasDatabaseUrl()) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  try {
    const client = new MercadoPagoConfig({ accessToken })
    const payment = await new Payment(client).get({ id: paymentId })

    const orderNumber = payment.external_reference
    if (!orderNumber) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const mappedStatus = STATUS_MAP[payment.status ?? ""] ?? "pending"
    const customerName =
      [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ") || null

    const previousOrder = await getOrderByNumber(orderNumber)

    const updated = await updateOrderPaymentStatus(orderNumber, {
      status: mappedStatus,
      mercadopago_id: payment.id != null ? String(payment.id) : null,
      mercadopago_status: payment.status ?? null,
      payment_method: payment.payment_method_id ?? null,
      customer_email: payment.payer?.email ?? null,
      customer_name: customerName,
      customer_phone: payment.payer?.phone?.number ?? null,
    })

    if (!updated) {
      // El pedido no existe (external_reference no coincide) — nada que actualizar,
      // pero confirmamos recepción para que MercadoPago no reintente indefinidamente.
      return NextResponse.json({ received: true, orderFound: false }, { status: 200 })
    }

    // Solo se envía al transicionar a "paid" — evita duplicar correos si MercadoPago
    // reenvía la misma notificación (reintentos) o reporta el mismo estado dos veces.
    if (mappedStatus === "paid" && previousOrder?.status !== "paid") {
      const orderWithItems = await getOrderWithItemsByNumber(orderNumber)
      if (orderWithItems) {
        sendOrderPaidEmails(orderWithItems).catch((err) =>
          console.error("Error enviando correos de confirmación de pago:", err)
        )
      }
    }

    return NextResponse.json({ received: true, orderFound: true }, { status: 200 })
  } catch (error) {
    console.error("Error procesando webhook de MercadoPago:", error)
    // 500 para que MercadoPago reintente — puede ser un fallo transitorio (DB caida, etc.)
    return NextResponse.json({ received: false }, { status: 500 })
  }
}
