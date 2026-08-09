import { ensureDbSchema, getDbPool, hasDatabaseUrl } from "@/lib/db"

export function isContactDbEnabled() {
  return hasDatabaseUrl()
}

export type ContactMessageInput = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  ipAddress?: string | null
}

export async function saveContactMessage(data: ContactMessageInput): Promise<void> {
  await ensureDbSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO app_contact_messages (name, email, phone, subject, message, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.name, data.email, data.phone, data.subject, data.message, data.ipAddress ?? null]
  )
}
