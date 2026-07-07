import { ensureDbSchema, getDbPool } from "@/lib/db"

export async function subscribeToNewsletter(
  email: string,
  name?: string | null,
  source = "checkout"
): Promise<void> {
  await ensureDbSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO app_newsletter_subscribers (email, name, is_active, source, subscribed_at)
     VALUES (?, ?, 1, ?, NOW())
     ON DUPLICATE KEY UPDATE is_active = 1, name = COALESCE(VALUES(name), name)`,
    [email, name ?? null, source]
  )
}
