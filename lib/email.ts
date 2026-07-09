import { Resend } from "resend"
import type { OrderWithItems } from "@/lib/db-orders"

const BRAND = {
  bg: "#0D0D0D",
  card: "#141414",
  border: "#2E2E2E",
  text: "#F2F2F2",
  muted: "#ADADAD",
  accent: "#E00000",
}

const SITE_BASE_URL = (process.env.SITE_URL || "https://cerounobikes.com").replace(/\/+$/, "")
const LOGO_URL = `${SITE_BASE_URL}/images/marca-alta-blancorecurso-207.png`
const PAYMENT_CONFIRMED_IMAGE_URL = `${SITE_BASE_URL}/images/email-pago-confirmado.png`

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
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;">
          ${item.product_name}${variant ? ` <span style="color:${BRAND.muted};">(${variant})</span>` : ""}<br/>
          <span style="color:${BRAND.muted};font-size:13px;">Cantidad: ${item.quantity}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.border};text-align:right;white-space:nowrap;color:${BRAND.text};font-size:14px;">
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
    rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:3px 0;color:${BRAND.muted};font-size:14px;">${label}</td><td style="padding:3px 0;text-align:right;color:${BRAND.text};font-size:14px;">${value}</td></tr>`
      )
      .join("") +
    `<tr><td style="padding-top:12px;font-weight:700;color:${BRAND.text};font-size:16px;">Total</td><td style="padding-top:12px;text-align:right;font-weight:700;color:${BRAND.accent};font-size:16px;">${formatCOP(order.total)}</td></tr>`
  )
}

function buildEmailShell(bodyHtml: string, heroImageUrl?: string): string {
  const headerHtml = heroImageUrl
    ? `<td style="padding-bottom:24px;">
        <img src="${heroImageUrl}" alt="CERO.UNO — Pago confirmado" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;" />
      </td>`
    : `<td style="text-align:center;padding-bottom:24px;">
        <img src="${LOGO_URL}" alt="CERO.UNO" width="140" style="display:inline-block;height:auto;" />
      </td>`

  return `
    <div style="background-color:${BRAND.bg};padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
        <tr>${headerHtml}</tr>
        <tr>
          <td style="background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:24px;color:${BRAND.muted};font-size:12px;">
            CERO.UNO &middot; <a href="https://cerounobikes.com" style="color:${BRAND.muted};">cerounobikes.com</a>
          </td>
        </tr>
      </table>
    </div>
  `
}

function buildCustomerEmailHtml(order: OrderWithItems): string {
  const firstName = order.customer_name?.split(" ")[0]
  return buildEmailShell(
    `
    <p style="margin:0 0 4px;color:${BRAND.text};font-size:16px;font-weight:700;">Hola${firstName ? ` ${firstName}` : ""},</p>
    <p style="margin:0 0 24px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      Tu pedido <strong style="color:${BRAND.text};">${order.order_number}</strong> ya quedó confirmado y lo estamos alistando con todo el cuidado. Pronto estarás rodando con él.
    </p>
    <table role="presentation" width="100%" style="border-collapse:collapse;">${buildItemsRows(order)}</table>
    <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:8px;">${buildTotalsRows(order)}</table>
    <p style="margin:28px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
      Te avisaremos por aquí apenas tu pedido salga despachado. Si tienes cualquier duda, simplemente responde este correo — con gusto te ayudamos.
    </p>
    <p style="margin:20px 0 0;color:${BRAND.text};font-size:14px;">
      Gracias por confiar en nosotros,<br/>El equipo de CERO.UNO
    </p>
  `,
    PAYMENT_CONFIRMED_IMAGE_URL
  )
}

function buildStoreEmailHtml(order: OrderWithItems): string {
  const addr = order.shipping_address
  const deliveryInfo =
    addr?.delivery_method === "envio"
      ? `Envío a domicilio — ${[addr.address_line, addr.apartment, addr.city, addr.department].filter(Boolean).join(", ")}`
      : "Retiro en punto de venta"

  return buildEmailShell(`
    <h1 style="margin:0 0 4px;color:${BRAND.text};font-size:20px;">Nuevo pedido pagado</h1>
    <p style="margin:0 0 24px;color:${BRAND.accent};font-size:14px;font-weight:700;">${order.order_number}</p>
    <p style="margin:0 0 24px;color:${BRAND.muted};font-size:14px;line-height:1.8;">
      <strong style="color:${BRAND.text};">Cliente:</strong> ${order.customer_name ?? "—"}<br/>
      <strong style="color:${BRAND.text};">Email:</strong> ${order.customer_email ?? "—"}<br/>
      <strong style="color:${BRAND.text};">Teléfono:</strong> ${order.customer_phone ?? "—"}<br/>
      <strong style="color:${BRAND.text};">Entrega:</strong> ${deliveryInfo}
    </p>
    <table role="presentation" width="100%" style="border-collapse:collapse;">${buildItemsRows(order)}</table>
    <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:8px;">${buildTotalsRows(order)}</table>
  `)
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
        subject: `¡Gracias por tu compra! Pedido ${order.order_number} confirmado`,
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
