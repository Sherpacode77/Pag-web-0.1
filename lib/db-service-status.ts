import type { RowDataPacket } from "mysql2/promise"
import { ensureDbSchema, getDbPool, hasDatabaseUrl } from "@/lib/db"

export function isServiceStatusDbEnabled() {
  return hasDatabaseUrl()
}

export type ServiceStatusValue = "ok" | "degraded" | "failing" | "unknown"

export type ServiceStatusRow = {
  service_id: string
  service_name: string
  status: ServiceStatusValue
  last_checked_at: string | null
  last_ok_at: string | null
  last_failure_at: string | null
  error_type: string | null
  error_message: string | null
  response_time_ms: number | null
  consecutive_failures: number
  updated_at: string
}

export async function listServiceStatus(): Promise<ServiceStatusRow[]> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_service_status ORDER BY service_name ASC`
  )

  return rows as ServiceStatusRow[]
}

export async function getServiceStatusById(
  serviceId: string
): Promise<ServiceStatusRow | null> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM app_service_status WHERE service_id = ? LIMIT 1`,
    [serviceId]
  )

  return (rows[0] as ServiceStatusRow) ?? null
}

export type ServiceStatusUpsert = {
  serviceId: string
  serviceName: string
  status: ServiceStatusValue
  lastOkAt: Date | null
  lastFailureAt: Date | null
  errorType: string | null
  errorMessage: string | null
  responseTimeMs: number | null
  consecutiveFailures: number
}

export async function upsertServiceStatus(data: ServiceStatusUpsert): Promise<void> {
  await ensureDbSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO app_service_status
       (service_id, service_name, status, last_checked_at, last_ok_at, last_failure_at,
        error_type, error_message, response_time_ms, consecutive_failures)
     VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       service_name = VALUES(service_name),
       status = VALUES(status),
       last_checked_at = NOW(),
       last_ok_at = VALUES(last_ok_at),
       last_failure_at = VALUES(last_failure_at),
       error_type = VALUES(error_type),
       error_message = VALUES(error_message),
       response_time_ms = VALUES(response_time_ms),
       consecutive_failures = VALUES(consecutive_failures)`,
    [
      data.serviceId,
      data.serviceName,
      data.status,
      data.lastOkAt,
      data.lastFailureAt,
      data.errorType,
      data.errorMessage,
      data.responseTimeMs,
      data.consecutiveFailures,
    ]
  )
}
