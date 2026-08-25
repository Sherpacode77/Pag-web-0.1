import crypto from "crypto"
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"
import { ensureDbSchema, getDbPool } from "@/lib/db"
import { createCoupon, generateUniqueCouponCode, setCouponActive, type Coupon } from "@/lib/db-coupons"

const WELCOME_COUPON_PERCENT = 10
const COUPON_CODE_PREFIX = "BIENVENIDA"

export type WelcomeCouponLead = {
  id: number
  email: string
  document: string | null
  full_name: string | null
  whatsapp: string | null
  data_consent_at: string | null
  coupon_id: number
  activation_token: string
  activated_at: string | null
  created_at: string
}

export async function getLeadByEmail(email: string): Promise<WelcomeCouponLead | null> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_welcome_coupon_leads WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()]
  )
  return (rows[0] as WelcomeCouponLead) ?? null
}

export async function getLeadByToken(token: string): Promise<WelcomeCouponLead | null> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_welcome_coupon_leads WHERE activation_token = ? LIMIT 1`,
    [token]
  )
  return (rows[0] as WelcomeCouponLead) ?? null
}

export async function getCouponCodeForLead(couponId: number): Promise<string | null> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT code FROM app_coupons WHERE id = ? LIMIT 1`,
    [couponId]
  )
  return (rows[0] as { code: string } | undefined)?.code ?? null
}

async function isDocumentTaken(document: string, excludeLeadId: number): Promise<boolean> {
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM app_welcome_coupon_leads WHERE document = ? AND id != ? LIMIT 1`,
    [document, excludeLeadId]
  )
  return rows.length > 0
}

export async function createPendingLead(
  email: string
): Promise<{ lead: WelcomeCouponLead; coupon: Coupon }> {
  await ensureDbSchema()
  const pool = getDbPool()
  const normalizedEmail = email.trim().toLowerCase()

  const code = await generateUniqueCouponCode(COUPON_CODE_PREFIX)
  const coupon = await createCoupon({
    code,
    description: "Cupón de bienvenida por suscripción",
    discount_type: "percentage",
    discount_value: WELCOME_COUPON_PERCENT,
    max_uses: 1,
    is_active: false,
  })

  const activationToken = crypto.randomBytes(32).toString("hex")

  await pool.execute(
    `INSERT INTO app_welcome_coupon_leads (email, coupon_id, activation_token, created_at)
     VALUES (?, ?, ?, NOW())`,
    [normalizedEmail, coupon.id, activationToken]
  )

  const lead = await getLeadByEmail(normalizedEmail)
  if (!lead) throw new Error("No se pudo crear el lead del cupón de bienvenida")
  return { lead, coupon }
}

export type ActivateLeadInput = {
  full_name: string
  document: string
  whatsapp: string
}

export type ActivateLeadResult =
  | { ok: true; couponCode: string; alreadyActivated: boolean }
  | { ok: false; reason: "not_found" | "document_taken" }

export async function activateLead(
  token: string,
  input: ActivateLeadInput
): Promise<ActivateLeadResult> {
  await ensureDbSchema()
  const pool = getDbPool()

  const lead = await getLeadByToken(token)
  if (!lead) return { ok: false, reason: "not_found" }

  const couponCode = await getCouponCodeForLead(lead.coupon_id)
  if (!couponCode) return { ok: false, reason: "not_found" }

  if (lead.activated_at) {
    return { ok: true, couponCode, alreadyActivated: true }
  }

  const document = input.document.trim()
  if (await isDocumentTaken(document, lead.id)) {
    return { ok: false, reason: "document_taken" }
  }

  await pool.execute<ResultSetHeader>(
    `UPDATE app_welcome_coupon_leads
     SET full_name = ?, document = ?, whatsapp = ?, data_consent_at = NOW(), activated_at = NOW()
     WHERE id = ?`,
    [input.full_name.trim(), document, input.whatsapp.trim(), lead.id]
  )
  await setCouponActive(lead.coupon_id, true)

  return { ok: true, couponCode, alreadyActivated: false }
}
