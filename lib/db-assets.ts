import type { RowDataPacket } from "mysql2/promise"
import { ensureDbSchema, getDbPool, hasDatabaseUrl } from "@/lib/db"

export type AssetKind = "image" | "video"

type SaveAssetInput = {
  assetPath: string
  fileName: string
  contentType: string
  kind: AssetKind
  sizeBytes: number
  durationSeconds?: number
  thumbnailPath?: string
}

export function isDbAssetStorageEnabled() {
  return hasDatabaseUrl() && process.env.DB_ASSET_STORAGE_ENABLED === "true"
}

export async function saveAssetInDb(input: SaveAssetInput) {
  await ensureDbSchema()
  const pool = getDbPool()

  await pool.execute(
    `INSERT INTO app_media_assets
       (asset_path, file_name, content_type, kind, size_bytes, duration_seconds, thumbnail_path, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       file_name        = VALUES(file_name),
       content_type     = VALUES(content_type),
       kind             = VALUES(kind),
       size_bytes       = VALUES(size_bytes),
       duration_seconds = VALUES(duration_seconds),
       thumbnail_path   = VALUES(thumbnail_path),
       updated_at       = NOW()`,
    [
      input.assetPath,
      input.fileName,
      input.contentType,
      input.kind,
      input.sizeBytes,
      input.durationSeconds ?? null,
      input.thumbnailPath ?? null,
    ]
  )

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, asset_path, file_name, content_type, kind, size_bytes,
            duration_seconds, thumbnail_path, created_at, updated_at
     FROM app_media_assets
     WHERE asset_path = ?`,
    [input.assetPath]
  )

  return rows[0]
}

export async function getAssetMetadataByPath(assetPath: string) {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, asset_path, file_name, content_type, kind, size_bytes,
            duration_seconds, thumbnail_path, created_at, updated_at
     FROM app_media_assets
     WHERE asset_path = ?`,
    [assetPath]
  )

  return rows[0] ?? null
}

export async function listAssets(kind: AssetKind, prefixPath: string) {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, asset_path, file_name, content_type, kind, size_bytes,
            duration_seconds, thumbnail_path, created_at, updated_at
     FROM app_media_assets
     WHERE kind = ? AND asset_path LIKE ?
     ORDER BY created_at DESC`,
    [kind, `${prefixPath}%`]
  )

  return rows
}

export async function deleteAssetByPath(assetPath: string) {
  await ensureDbSchema()
  const pool = getDbPool()

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, asset_path FROM app_media_assets WHERE asset_path = ?`,
    [assetPath]
  )

  const existing = rows[0] ?? null
  if (!existing) return null

  await pool.execute(`DELETE FROM app_media_assets WHERE asset_path = ?`, [assetPath])

  return existing
}
