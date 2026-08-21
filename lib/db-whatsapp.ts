import type { RowDataPacket } from "mysql2/promise"
import { ensureDbSchema, getDbPool } from "@/lib/db"

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sin caracteres ambiguos (0/O, 1/I)

function randomCode(length = 6): string {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export type WhatsAppReferralInput = {
  utmSource?: string | null
  utmCampaign?: string | null
  utmMedium?: string | null
  fbclid?: string | null
  gclid?: string | null
  ttclid?: string | null
  landingPage?: string | null
}

// Genera un codigo corto y único para identificar de que anuncio vino un
// visitante que despues contacta por WhatsApp. Reintenta en la rara
// colision de codigo (espacio de ~1000M combinaciones con 6 caracteres).
export async function createWhatsAppReferral(input: WhatsAppReferralInput): Promise<string> {
  await ensureDbSchema()
  const pool = getDbPool()

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    try {
      await pool.execute(
        `INSERT INTO app_whatsapp_referrals
           (code, utm_source, utm_campaign, utm_medium, fbclid, gclid, ttclid, landing_page)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          input.utmSource ?? null,
          input.utmCampaign ?? null,
          input.utmMedium ?? null,
          input.fbclid ?? null,
          input.gclid ?? null,
          input.ttclid ?? null,
          input.landingPage ?? null,
        ]
      )
      return code
    } catch (error) {
      const isDuplicate = error instanceof Error && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY"
      if (!isDuplicate) throw error
    }
  }

  throw new Error("No se pudo generar un codigo de referencia unico")
}

export type WhatsAppReferralRow = {
  code: string
  utm_source: string | null
  utm_campaign: string | null
  utm_medium: string | null
  fbclid: string | null
  gclid: string | null
  ttclid: string | null
  landing_page: string | null
  created_at: string
}

export async function getWhatsAppReferralByCode(code: string): Promise<WhatsAppReferralRow | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_whatsapp_referrals WHERE code = ? LIMIT 1`,
    [code.toUpperCase()]
  )

  return (rows[0] as WhatsAppReferralRow) ?? null
}

export type WhatsAppSaleChannel = "meta" | "google" | "tiktok" | "organico" | "otro"

export type WhatsAppSaleInput = {
  referralCode?: string | null
  channel: WhatsAppSaleChannel
  campaignName?: string | null
  amount: number
  customerName?: string | null
  note?: string | null
  saleDate: string
  createdBy?: string | null
}

export async function createWhatsAppSale(input: WhatsAppSaleInput): Promise<number> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
    `INSERT INTO app_whatsapp_sales
       (referral_code, channel, campaign_name, amount, customer_name, note, sale_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.referralCode?.toUpperCase() ?? null,
      input.channel,
      input.campaignName ?? null,
      input.amount,
      input.customerName ?? null,
      input.note ?? null,
      input.saleDate,
      input.createdBy ?? null,
    ]
  )

  return result.insertId
}

export type WhatsAppSaleRow = {
  id: number
  referral_code: string | null
  channel: WhatsAppSaleChannel
  campaign_name: string | null
  amount: number
  customer_name: string | null
  note: string | null
  sale_date: string
  created_by: string | null
  created_at: string
}

export type WhatsAppSalesStats = {
  count: number
  totalAmount: number
}

export async function listWhatsAppSales(
  channel: WhatsAppSaleChannel,
  since: string,
  until: string
): Promise<WhatsAppSaleRow[]> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_whatsapp_sales
     WHERE channel = ? AND sale_date BETWEEN ? AND ?
     ORDER BY sale_date DESC, id DESC`,
    [channel, since, until]
  )

  return rows as WhatsAppSaleRow[]
}

export async function getWhatsAppSalesStats(
  channel: WhatsAppSaleChannel,
  since: string,
  until: string
): Promise<WhatsAppSalesStats> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount
     FROM app_whatsapp_sales
     WHERE channel = ? AND sale_date BETWEEN ? AND ?`,
    [channel, since, until]
  )

  return {
    count: Number(rows[0]?.count ?? 0),
    totalAmount: Number(rows[0]?.total_amount ?? 0),
  }
}

export async function deleteWhatsAppSale(id: number): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
    `DELETE FROM app_whatsapp_sales WHERE id = ?`,
    [id]
  )

  return result.affectedRows > 0
}
