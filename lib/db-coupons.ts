import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"
import { ensureDbSchema, getDbPool } from "@/lib/db"

export type CouponDiscountType = "percentage" | "fixed"

export type Coupon = {
  id: number
  code: string
  description: string | null
  discount_type: CouponDiscountType
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  max_uses: number | null
  uses_count: number
  is_active: boolean
  valid_from: string
  valid_until: string | null
  created_at: string
  updated_at: string
}

export type CreateCouponInput = {
  code: string
  description?: string | null
  discount_type: CouponDiscountType
  discount_value: number
  min_order_amount?: number
  max_discount_amount?: number | null
  max_uses?: number | null
  valid_until?: string | null
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

export async function listCoupons(): Promise<Coupon[]> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_coupons ORDER BY created_at DESC`
  )
  return rows as Coupon[]
}

export async function createCoupon(input: CreateCouponInput): Promise<Coupon> {
  await ensureDbSchema()
  const pool = getDbPool()

  const code = normalizeCode(input.code)

  await pool.execute(
    `INSERT INTO app_coupons
       (code, description, discount_type, discount_value, min_order_amount,
        max_discount_amount, max_uses, applies_to, valid_until, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'all', ?, 1, NOW(), NOW())`,
    [
      code,
      input.description ?? null,
      input.discount_type,
      input.discount_value,
      input.min_order_amount ?? 0,
      input.max_discount_amount ?? null,
      input.max_uses ?? null,
      input.valid_until ?? null,
    ]
  )

  const coupon = await getCouponByCode(code)
  if (!coupon) throw new Error("No se pudo crear el cupón")
  return coupon
}

export async function setCouponActive(id: number, isActive: boolean): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE app_coupons SET is_active = ?, updated_at = NOW() WHERE id = ?`,
    [isActive ? 1 : 0, id]
  )
  return result.affectedRows > 0
}

export async function deleteCoupon(id: number): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM app_coupons WHERE id = ?`, [id])
  return result.affectedRows > 0
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_coupons WHERE code = ? LIMIT 1`,
    [normalizeCode(code)]
  )
  return (rows[0] as Coupon) ?? null
}

// Trae el cupón junto con la hora actual DEL SERVIDOR DE BASE DE DATOS — el
// reloj del servidor MySQL puede estar desfasado respecto al del proceso de
// Node (visto en producción: ~5h de diferencia), así que las comparaciones de
// vigencia deben hacerse contra el mismo reloj con el que se guardó valid_from.
async function getCouponWithServerTime(
  code: string
): Promise<{ coupon: Coupon; serverNow: Date } | null> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT *, NOW() AS __server_now FROM app_coupons WHERE code = ? LIMIT 1`,
    [normalizeCode(code)]
  )
  const row = rows[0]
  if (!row) return null

  const { __server_now, ...coupon } = row
  return { coupon: coupon as Coupon, serverNow: new Date(__server_now) }
}

export async function incrementCouponUsage(id: number): Promise<void> {
  await ensureDbSchema()
  const pool = getDbPool()
  await pool.execute(`UPDATE app_coupons SET uses_count = uses_count + 1 WHERE id = ?`, [id])
}

export type ValidateCouponResult =
  | { valid: true; coupon: Coupon; discountAmount: number }
  | { valid: false; reason: string }

export async function validateCoupon(code: string, subtotal: number): Promise<ValidateCouponResult> {
  const found = await getCouponWithServerTime(code)
  if (!found) return { valid: false, reason: "Código no encontrado" }
  const { coupon, serverNow } = found

  if (!coupon.is_active) return { valid: false, reason: "Este cupón ya no está activo" }

  if (new Date(coupon.valid_from) > serverNow) {
    return { valid: false, reason: "Este cupón todavía no está vigente" }
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < serverNow) {
    return { valid: false, reason: "Este cupón ya expiró" }
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { valid: false, reason: "Este cupón alcanzó su límite de usos" }
  }
  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      reason: `Este cupón requiere una compra mínima de ${coupon.min_order_amount}`,
    }
  }

  let discountAmount =
    coupon.discount_type === "percentage"
      ? subtotal * (Number(coupon.discount_value) / 100)
      : Number(coupon.discount_value)

  if (coupon.max_discount_amount != null) {
    discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount))
  }
  discountAmount = Math.min(Math.max(0, discountAmount), subtotal)

  return { valid: true, coupon, discountAmount: Math.round(discountAmount) }
}
