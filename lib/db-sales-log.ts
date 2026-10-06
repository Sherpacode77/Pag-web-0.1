import type { RowDataPacket } from "mysql2/promise"
import { ensureDbSchema, getDbPool, withTransaction } from "@/lib/db"

export type SalesLogInputRow = {
  rowKey: string
  saleDate: string
  channel: string
  channelRaw?: string | null
  customerName?: string | null
  productCode?: string | null
  quantity: number
  grossAmount: number
  shipping: number
  netAmount: number
  isReturn: boolean
}

export type SalesLogRow = {
  id: number
  sheet: string
  sale_date: string
  channel: string
  channel_raw: string | null
  customer_name: string | null
  product_code: string | null
  quantity: number
  gross_amount: number
  shipping: number
  net_amount: number
}

export type SalesLogChannelStats = {
  channel: string
  count: number
  units: number
  grossAmount: number
  netAmount: number
}

export type SalesLogStats = {
  total: Omit<SalesLogChannelStats, "channel">
  byChannel: SalesLogChannelStats[]
  returnsExcluded: number
  lastSyncAt: string | null
}

const CHUNK = 200

// El Excel es la fuente de verdad: cada sincronizacion reemplaza por completo
// lo que habia de esa hoja, asi las correcciones y borrados llegan solos.
export async function replaceSalesLogForSheet(sheet: string, rows: SalesLogInputRow[]): Promise<number> {
  await ensureDbSchema()

  await withTransaction(async (conn) => {
    await conn.execute(`DELETE FROM app_sales_log WHERE sheet = ?`, [sheet])

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const placeholders = chunk.map(() => "(?,?,?,?,?,?,?,?,?,?,?,?)").join(",")
      const params = chunk.flatMap((r) => [
        sheet,
        r.rowKey,
        r.saleDate,
        r.channel,
        r.channelRaw ?? null,
        r.customerName ?? null,
        r.productCode ?? null,
        r.quantity,
        r.grossAmount,
        r.shipping,
        r.netAmount,
        r.isReturn ? 1 : 0,
      ])
      await conn.execute(
        `INSERT INTO app_sales_log
           (sheet, row_key, sale_date, channel, channel_raw, customer_name, product_code, quantity, gross_amount, shipping, net_amount, is_return)
         VALUES ${placeholders}`,
        params
      )
    }
  })

  return rows.length
}

export async function getSalesLogStats(since: string, until: string): Promise<SalesLogStats> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [byChannelRows] = await pool.execute<RowDataPacket[]>(
    `SELECT channel,
            COUNT(*)                        AS count,
            COALESCE(SUM(quantity), 0)      AS units,
            COALESCE(SUM(gross_amount), 0)  AS gross_amount,
            COALESCE(SUM(net_amount), 0)    AS net_amount
     FROM app_sales_log
     WHERE is_return = 0 AND sale_date BETWEEN ? AND ?
     GROUP BY channel
     ORDER BY net_amount DESC`,
    [since, until]
  )

  const [metaRows] = await pool.execute<RowDataPacket[]>(
    `SELECT SUM(is_return = 1 AND sale_date BETWEEN ? AND ?) AS returns_excluded,
            MAX(synced_at) AS last_sync
     FROM app_sales_log`,
    [since, until]
  )

  const byChannel: SalesLogChannelStats[] = byChannelRows.map((r) => ({
    channel: String(r.channel),
    count: Number(r.count),
    units: Number(r.units),
    grossAmount: Number(r.gross_amount),
    netAmount: Number(r.net_amount),
  }))

  const total = byChannel.reduce(
    (acc, c) => ({
      count: acc.count + c.count,
      units: acc.units + c.units,
      grossAmount: acc.grossAmount + c.grossAmount,
      netAmount: acc.netAmount + c.netAmount,
    }),
    { count: 0, units: 0, grossAmount: 0, netAmount: 0 }
  )

  const lastSync = metaRows[0]?.last_sync
  return {
    total,
    byChannel,
    returnsExcluded: Number(metaRows[0]?.returns_excluded ?? 0),
    lastSyncAt: lastSync ? new Date(lastSync).toISOString() : null,
  }
}

export async function listSalesLog(channel: string | null, since: string, until: string): Promise<SalesLogRow[]> {
  await ensureDbSchema()
  const pool = getDbPool()

  const params: (string | number)[] = [since, until]
  let channelClause = ""
  if (channel) {
    channelClause = "AND channel = ?"
    params.push(channel)
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, sheet, DATE_FORMAT(sale_date, '%Y-%m-%d') AS sale_date, channel, channel_raw, customer_name,
            product_code, quantity, gross_amount, shipping, net_amount
     FROM app_sales_log
     WHERE is_return = 0 AND sale_date BETWEEN ? AND ? ${channelClause}
     ORDER BY sale_date DESC, id DESC
     LIMIT 500`,
    params
  )

  return rows.map((r) => ({
    ...(r as unknown as SalesLogRow),
    quantity: Number(r.quantity),
    gross_amount: Number(r.gross_amount),
    shipping: Number(r.shipping),
    net_amount: Number(r.net_amount),
  }))
}
