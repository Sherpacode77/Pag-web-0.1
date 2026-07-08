import { Resend } from "resend"
import type { OrderWithItems } from "@/lib/db-orders"

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount)
}

function buildItemsRows(order: OrderWithItems): string {
  return order.items
    .map((item) => {
      const variant = [item.variant_color_name, item.variant_size_name].filter(Boolean).join(" / ")
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;">
          ${item.product_name}${variant ? ` (${variant})` : ""}<br/>
          <span style="color:#888;font-size:13px;">Cantidad: ${item.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
          ${formatCOP(item.unit_price * item.quantity)}
        </td>
      </tr>`
    })
    .join("")
}

function buildTotalsRows(order: OrderWithItems): string {
  const rows = [
    ["Subtotal", formatCOP(order.subtotal)],
    ...(order.discount > 0 ? [["Descuento", `-${formatCOP(order.discount)}`]] : []),
    ["Envío", order.shipping_cost > 0 ? formatCOP(order.shipping_cost) : "Gratis"],
  ]
  return (
    rows.map(([label, value]) => `<tr><td style="padding:2px 0;">${label}</td><td style="padding:2px 0;text-align:right;">${value}</td></tr>`).join("") +
    `<tr><td style="padding-top:8px;font-weight:bold;">Total</td><td style="padding-top:8px;text-align:right;font-weight:bold;">${formatCOP(order.total)}</td></tr>`
  )
}

function buildCustomerEmailHtml(order: OrderWithItems): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <h2 style="margin-bottom:4px;">¡Gracias por tu compra${order.customer_name ? `, ${order.customer_name}` : ""}!</h2>
      <p style="color:#555;">Confirmamos que tu pago para el pedido <strong>${order.order_number}</strong> fue acreditado correctamente.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${buildItemsRows(order)}</table>
      <table style="width:100%;margin-top:8px;">${buildTotalsRows(order)}</table>
      <p style="margin-top:24px;color:#888;font-size:13px;">Te avisaremos por este medio cuando tu pedido sea despachado. Si tienes dudas, responde este correo.</p>
    </div>
  `
}

function buildStoreEmailHtml(order: OrderWithItems): string {
  const addr = order.shipping_address
  const deliveryInfo =
    addr?.delivery_method === "envio"
      ? `Envío a domicilio — ${[addr.address_line, addr.apartment, addr.city, addr.department].filter(Boolean).join(", ")}`
      : "Retiro en punto de venta"

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <h2 style="margin-bottom:4px;">Nuevo pedido pagado: ${order.order_number}</h2>
      <p style="color:#555;">
        <strong>Cliente:</strong> ${order.customer_name ?? "—"}<br/>
        <strong>Email:</strong> ${order.customer_email ?? "—"}<br/>
        <strong>Teléfono:</strong> ${order.customer_phone ?? "—"}<br/>
        <strong>Entrega:</strong> ${deliveryInfo}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${buildItemsRows(order)}</table>
      <table style="width:100%;margin-top:8px;">${buildTotalsRows(order)}</table>
    </div>
  `
}

// Se llama solo cuando un pedido transiciona a "paid" (ver webhook de MercadoPago) —
// nunca en reintentos del mismo estado, para no duplicar correos.
export async function sendOrderPaidEmails(order: OrderWithItems): Promise<void> {
  const resend = getClient()
  if (!resend) {
    console.error("sendOrderPaidEmails: RESEND_API_KEY no configurado, se omite el envío")
    return
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "CERO.UNO <onboarding@resend.dev>"
  const storeEmail = process.env.STORE_NOTIFICATION_EMAIL

  const sends: Promise<unknown>[] = []

  if (order.customer_email) {
    sends.push(
      resend.emails.send({
        from: fromAddress,
        to: order.customer_email,
        subject: `Confirmamos tu pago — Pedido ${order.order_number}`,
        html: buildCustomerEmailHtml(order),
      })
    )
  }

  if (storeEmail) {
    sends.push(
      resend.emails.send({
        from: fromAddress,
        to: storeEmail,
        subject: `Nuevo pedido pagado — ${order.order_number}`,
        html: buildStoreEmailHtml(order),
      })
    )
  }

  const results = await Promise.allSettled(sends)
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("sendOrderPaidEmails: fallo enviando email", result.reason)
    }
  }
}
