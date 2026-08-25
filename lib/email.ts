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

// Destinatarios fijos para notificaciones de formularios (contacto, cotizacion Travel).
// Distintos de STORE_NOTIFICATION_EMAIL, que es solo para pedidos pagados.
const FORM_NOTIFICATION_EMAILS = ["cerounobta@gmail.com", "equipo@cerounobikes.com"]

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
      const variant = [item.variant_color_name, item.variant_size_name, item.variant_design_name]
        .filter(Boolean)
        .join(" / ")
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
    <p style="margin:24px 0 0;text-align:center;">
      <img src="${LOGO_URL}" alt="CERO.UNO" width="100" style="display:inline-block;height:auto;" />
    </p>
  `,
    PAYMENT_CONFIRMED_IMAGE_URL
  )
}

function buildStoreEmailHtml(order: OrderWithItems): string {
  const addr = order.shipping_address
  const deliveryInfo =
    addr?.delivery_method === "envio"
      ? `Envío a domicilio — ${[addr.address_line, addr.apartment, addr.neighborhood, addr.city, addr.department].filter(Boolean).join(", ")}`
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

type ContactFormData = {
  nombre: string
  email: string
  telefono: string
  asunto: string
  mensaje: string
}

function buildContactFormEmailHtml(data: ContactFormData): string {
  return buildEmailShell(`
    <h1 style="margin:0 0 4px;color:${BRAND.text};font-size:20px;">Nuevo mensaje de contacto</h1>
    <p style="margin:0 0 24px;color:${BRAND.muted};font-size:14px;line-height:1.8;">
      <strong style="color:${BRAND.text};">Nombre:</strong> ${escapeHtml(data.nombre)}<br/>
      <strong style="color:${BRAND.text};">Email:</strong> ${escapeHtml(data.email)}<br/>
      <strong style="color:${BRAND.text};">Telefono / WhatsApp:</strong> ${escapeHtml(data.telefono)}<br/>
      <strong style="color:${BRAND.text};">Asunto:</strong> ${escapeHtml(data.asunto)}
    </p>
    <p style="margin:0;color:${BRAND.text};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.mensaje)}</p>
  `)
}

// Disparado por el formulario de /contacto — notifica al equipo, con reply-to
// apuntando al correo del cliente para poder responder directo.
export async function sendContactFormEmail(data: ContactFormData): Promise<void> {
  const resend = getClient()
  if (!resend) {
    console.error("sendContactFormEmail: RESEND_API_KEY no configurado, se omite el envío")
    throw new Error("Servicio de email no configurado")
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "CERO.UNO <onboarding@resend.dev>"

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: FORM_NOTIFICATION_EMAILS,
    replyTo: data.email,
    subject: `Nuevo mensaje de contacto — ${data.asunto}`,
    html: buildContactFormEmailHtml(data),
  })

  if (error) {
    throw new Error(error.message)
  }
}

function buildWelcomeCouponEmailHtml(couponCode: string, activationUrl: string): string {
  return buildEmailShell(`
    <p style="margin:0 0 4px;color:${BRAND.text};font-size:16px;font-weight:700;">¡Bienvenido a la comunidad CERO.UNO!</p>
    <p style="margin:0 0 24px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      Tu cupón de descuento para tu primera aventura ya está listo. Solo falta un paso para activarlo.
    </p>
    <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="background-color:${BRAND.bg};border:1px dashed ${BRAND.accent};border-radius:8px;padding:18px;text-align:center;">
          <span style="display:block;color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Tu código</span>
          <span style="display:block;color:${BRAND.accent};font-size:22px;font-weight:700;letter-spacing:1px;">${couponCode}</span>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      Para activarlo, completa un formulario cortico con tus datos de contacto — toma menos de un minuto.
    </p>
    <table role="presentation" width="100%" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <a href="${activationUrl}" style="display:inline-block;background-color:${BRAND.accent};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:6px;">
            Activar mi cupón
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
      Si el botón no funciona, copia y pega este link en tu navegador:<br/>
      <a href="${activationUrl}" style="color:${BRAND.muted};">${activationUrl}</a>
    </p>
  `)
}

// Disparado por el formulario "10% OFF" al suscribirse — el cupón se crea
// inactivo (ver lib/db-welcome-coupon.ts) y este correo es la única forma
// de llegar al link de activación.
export async function sendWelcomeCouponEmail(
  to: string,
  couponCode: string,
  activationUrl: string
): Promise<void> {
  const resend = getClient()
  if (!resend) {
    console.error("sendWelcomeCouponEmail: RESEND_API_KEY no configurado, se omite el envío")
    return
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "CERO.UNO <onboarding@resend.dev>"

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject: "Tu cupón de bienvenida CERO.UNO — falta un paso para activarlo",
    html: buildWelcomeCouponEmailHtml(couponCode, activationUrl),
  })

  if (error) {
    console.error("sendWelcomeCouponEmail: fallo enviando email", error)
  }
}

type TravelQuoteFormData = {
  nombre: string
  telefono: string
  evento: string
  tipoViaje: "ida" | "ida_vuelta"
  fechaIda: string
  fechaRegreso?: string
  personas: string
  servicioTransporte?: boolean
  servicioHospedaje?: boolean
  mensaje?: string
}

function buildTravelQuoteEmailHtml(data: TravelQuoteFormData): string {
  const fechasHtml =
    data.tipoViaje === "ida_vuelta" && data.fechaRegreso
      ? `<strong style="color:${BRAND.text};">Fecha de ida:</strong> ${escapeHtml(data.fechaIda)}<br/>
         <strong style="color:${BRAND.text};">Fecha de regreso:</strong> ${escapeHtml(data.fechaRegreso)}<br/>`
      : `<strong style="color:${BRAND.text};">Fecha (solo ida):</strong> ${escapeHtml(data.fechaIda)}<br/>`

  const servicios = [
    data.servicioTransporte ? "Transporte" : null,
    data.servicioHospedaje ? "Hospedaje" : null,
  ].filter(Boolean)
  const serviciosLabel = servicios.length > 0 ? servicios.join(" y ") : "No especificado"

  return buildEmailShell(`
    <h1 style="margin:0 0 4px;color:${BRAND.text};font-size:20px;">Nueva cotizacion — CERO.UNO Travel</h1>
    <p style="margin:0 0 24px;color:${BRAND.muted};font-size:14px;line-height:1.8;">
      <strong style="color:${BRAND.text};">Nombre:</strong> ${escapeHtml(data.nombre)}<br/>
      <strong style="color:${BRAND.text};">Telefono / WhatsApp:</strong> ${escapeHtml(data.telefono)}<br/>
      <strong style="color:${BRAND.text};">Evento:</strong> ${escapeHtml(data.evento)}<br/>
      <strong style="color:${BRAND.text};">Tipo de viaje:</strong> ${data.tipoViaje === "ida_vuelta" ? "Ida y vuelta" : "Solo ida"}<br/>
      ${fechasHtml}
      <strong style="color:${BRAND.text};">Personas:</strong> ${escapeHtml(data.personas)}<br/>
      <strong style="color:${BRAND.text};">Servicio solicitado:</strong> ${escapeHtml(serviciosLabel)}
    </p>
    ${
      data.mensaje
        ? `<p style="margin:0;color:${BRAND.text};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.mensaje)}</p>`
        : ""
    }
  `)
}

// Disparado por el formulario de cotizacion en /travel.
export async function sendTravelQuoteEmail(data: TravelQuoteFormData): Promise<void> {
  const resend = getClient()
  if (!resend) {
    console.error("sendTravelQuoteEmail: RESEND_API_KEY no configurado, se omite el envío")
    throw new Error("Servicio de email no configurado")
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "CERO.UNO <onboarding@resend.dev>"

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: FORM_NOTIFICATION_EMAILS,
    subject: `Nueva cotizacion Travel — ${data.evento}`,
    html: buildTravelQuoteEmailHtml(data),
  })

  if (error) {
    throw new Error(error.message)
  }
}
