import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"
import { ensureDbSchema, getDbPool } from "@/lib/db"
import type { OrderWithItems } from "@/lib/db-orders"
import {
  GIRO_DE_RIGO_SERVICES,
  TRAVEL_LISTS,
  buildTravelSku,
  getListCapacity,
  getListsForRoute,
  getTravelServicePrice,
  isTravelServiceId,
  type TravelBikeKey,
  type TravelListKey,
  type TravelRouteKey,
} from "@/lib/travel-services"

export type TravelPassengerInput = {
  listKey: TravelListKey
  serviceSku?: string | null
  groupNumber?: number | null
  isGroupLeader?: boolean
  fullName: string
  phone?: string | null
  pickupPoint?: string | null
  deposit?: number
  balance?: number
  paymentChannel?: string | null
  depositDate?: string | null
  withBike?: boolean
  source?: "web" | "manual"
  orderNumber?: string | null
  seatIndex?: number
  notes?: string | null
}

export type TravelPassengerRow = {
  id: number
  list_key: TravelListKey
  service_sku: string | null
  group_number: number | null
  is_group_leader: number
  full_name: string
  phone: string | null
  pickup_point: string | null
  deposit: number
  balance: number
  payment_channel: string | null
  deposit_date: string | null
  with_bike: number
  source: string
  order_number: string | null
  seat_index: number
  notes: string | null
  created_at: string
}

function mapRow(r: RowDataPacket): TravelPassengerRow {
  return {
    ...(r as unknown as TravelPassengerRow),
    deposit: Number(r.deposit),
    balance: Number(r.balance),
    is_group_leader: Number(r.is_group_leader),
    with_bike: Number(r.with_bike),
    group_number: r.group_number === null ? null : Number(r.group_number),
  }
}

export async function listTravelPassengers(listKey?: TravelListKey): Promise<TravelPassengerRow[]> {
  await ensureDbSchema()
  const pool = getDbPool()
  const where = listKey ? "WHERE list_key = ?" : ""
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, list_key, service_sku, group_number, is_group_leader, full_name, phone, pickup_point,
            deposit, balance, payment_channel, DATE_FORMAT(deposit_date, '%Y-%m-%d') AS deposit_date,
            with_bike, source, order_number, seat_index, notes,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
     FROM app_travel_passengers ${where}
     ORDER BY list_key ASC, group_number IS NULL, group_number ASC, id ASC`,
    listKey ? [listKey] : []
  )
  return rows.map(mapRow)
}

export async function createTravelPassenger(input: TravelPassengerInput): Promise<number> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO app_travel_passengers
       (list_key, service_sku, group_number, is_group_leader, full_name, phone, pickup_point,
        deposit, balance, payment_channel, deposit_date, with_bike, source, order_number, seat_index, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.listKey,
      input.serviceSku ?? null,
      input.groupNumber ?? null,
      input.isGroupLeader ? 1 : 0,
      input.fullName,
      input.phone ?? null,
      input.pickupPoint ?? null,
      input.deposit ?? 0,
      input.balance ?? 0,
      input.paymentChannel ?? null,
      input.depositDate ?? null,
      input.withBike ? 1 : 0,
      input.source ?? "manual",
      input.orderNumber ?? null,
      input.seatIndex ?? 1,
      input.notes ?? null,
    ]
  )
  return result.insertId
}

export async function deleteTravelPassenger(id: number): Promise<boolean> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM app_travel_passengers WHERE id = ?`,
    [id]
  )
  return result.affectedRows > 0
}

export type TravelListStats = {
  key: TravelListKey
  label: string
  capacity: number
  booked: number
  occupancy: number
}

export type TravelServiceStats = {
  sku: string
  serviceKey: string
  serviceName: string
  vehicle: string
  route: TravelRouteKey
  routeLabel: string
  bike: TravelBikeKey
  bikeLabel: string
  price: number
  deposit: number
  lists: TravelListKey[]
  passengers: number
  occupancy: number
  atCapacity: boolean
}

const ROUTE_LABELS: Record<TravelRouteKey, string> = {
  ida: "Bogotá → Cali (30 oct)",
  regreso: "Cali → Bogotá (2 nov)",
  "ida-vuelta": "Ida 30 oct y regreso 2 nov",
}

export type TravelStats = {
  lists: TravelListStats[]
  services: TravelServiceStats[]
  totalPassengers: number
}

// El catalogo de servicios y las capacidades son fijos: con los contadores en
// cero, el panel igual muestra las 12 filas. El indicador de un cupo de ida y
// regreso es el promedio de la ocupacion de sus dos listas.
export function buildTravelStats(
  byList: Map<string, number>,
  bySku: Map<string, number>
): TravelStats {
  const lists: TravelListStats[] = TRAVEL_LISTS.map((l) => {
    const booked = byList.get(l.key) ?? 0
    return {
      key: l.key,
      label: l.label,
      capacity: l.capacity,
      booked,
      occupancy: l.capacity > 0 ? booked / l.capacity : 0,
    }
  })

  const occupancyOf = (key: TravelListKey) => lists.find((l) => l.key === key)!.occupancy

  const services: TravelServiceStats[] = []
  for (const service of GIRO_DE_RIGO_SERVICES) {
    for (const route of ["ida", "regreso", "ida-vuelta"] as TravelRouteKey[]) {
      for (const bike of ["con-bici", "sin-bici"] as TravelBikeKey[]) {
        const sku = buildTravelSku(service.key, route, bike)
        const used = getListsForRoute(service.key, route)
        const occupancy = used.reduce((sum, l) => sum + occupancyOf(l), 0) / used.length
        const price = getTravelServicePrice(service, route, bike)
        services.push({
          sku,
          serviceKey: service.key,
          serviceName: service.name,
          vehicle: service.vehicle,
          route,
          routeLabel: ROUTE_LABELS[route],
          bike,
          bikeLabel: bike === "con-bici" ? "Con bicicleta" : "Sin bicicleta",
          price,
          deposit: Math.round(price / 2),
          lists: used,
          passengers: bySku.get(sku) ?? 0,
          occupancy,
          atCapacity: used.some((l) => (byList.get(l) ?? 0) >= getListCapacity(l)),
        })
      }
    }
  }

  return {
    lists,
    services,
    totalPassengers: lists.reduce((sum, l) => sum + l.booked, 0),
  }
}

export async function getTravelStats(): Promise<TravelStats> {
  await ensureDbSchema()
  const pool = getDbPool()

  const [listRows] = await pool.execute<RowDataPacket[]>(
    `SELECT list_key, COUNT(*) AS total FROM app_travel_passengers GROUP BY list_key`
  )
  const [skuRows] = await pool.execute<RowDataPacket[]>(
    `SELECT service_sku, COUNT(DISTINCT CONCAT(COALESCE(order_number, CONCAT('m', id)), '-', seat_index)) AS total
     FROM app_travel_passengers
     WHERE service_sku IS NOT NULL
     GROUP BY service_sku`
  )

  return buildTravelStats(
    new Map(listRows.map((r) => [String(r.list_key), Number(r.total)])),
    new Map(skuRows.map((r) => [String(r.service_sku), Number(r.total)]))
  )
}

// Un pedido pagado alimenta las listas: cada cupo genera una fila por lista que
// ocupa (ida y regreso son dos listas distintas). Se llama desde el webhook de
// MercadoPago, cuando el abono ya esta confirmado.
export async function syncOrderToTravelLists(order: OrderWithItems): Promise<number> {
  const serviceItems = order.items.filter((item) => isTravelServiceId(item.product_id))
  if (serviceItems.length === 0) return 0

  const passengerNames = parsePassengerNames(order.notes)
  let created = 0
  let seat = 0

  for (const item of serviceItems) {
    const parsed = parseServiceId(item.product_id)
    if (!parsed) continue
    const service = GIRO_DE_RIGO_SERVICES.find((s) => s.key === parsed.vehicle)
    if (!service) continue

    const sku = buildTravelSku(parsed.vehicle, parsed.route, parsed.bike)
    const lists = getListsForRoute(parsed.vehicle, parsed.route)
    const total = getTravelServicePrice(service, parsed.route, parsed.bike)
    const deposit = Math.round(total / 2)

    for (let unit = 0; unit < item.quantity; unit++) {
      seat++
      const pax = passengerNames[seat - 1]
      for (const listKey of lists) {
        try {
          await createTravelPassenger({
            listKey,
            serviceSku: sku,
            fullName: pax?.name ?? order.customer_name ?? "Sin nombre",
            phone: pax?.phone ?? order.customer_phone ?? null,
            deposit,
            balance: total - deposit,
            paymentChannel: "WEB",
            depositDate: new Date().toISOString().slice(0, 10),
            withBike: parsed.bike === "con-bici",
            source: "web",
            orderNumber: order.order_number,
            seatIndex: seat,
            // Quien paga por todo el grupo es el titular del pedido.
            isGroupLeader: seat === 1 && item.quantity > 1,
            notes: pax?.document ? `CC: ${pax.document}` : null,
          })
          created++
        } catch (err) {
          const code = (err as { code?: string }).code
          // ER_DUP_ENTRY: el webhook ya habia registrado este cupo.
          if (code !== "ER_DUP_ENTRY") throw err
        }
      }
    }
  }

  return created
}

function parseServiceId(
  productId: string
): { vehicle: string; route: TravelRouteKey; bike: TravelBikeKey } | null {
  const m = productId.match(/^travel-giro-de-rigo-(bus|van)-(ida-vuelta|ida|regreso)-(con-bici|sin-bici)$/)
  if (!m) return null
  return { vehicle: m[1], route: m[2] as TravelRouteKey, bike: m[3] as TravelBikeKey }
}

// Las notas del pedido traen los pasajeros en el formato que arma /api/orders.
function parsePassengerNames(
  notes: string | null
): { name: string; phone?: string; document?: string }[] {
  if (!notes) return []
  return notes
    .split("\n")
    .map((line) => line.match(/^\s*\d+\.\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => {
      const parts = m[1].split("·").map((p) => p.trim())
      const phone = parts.find((p) => p.startsWith("Tel:"))?.replace("Tel:", "").trim()
      const document = parts.find((p) => p.startsWith("CC:"))?.replace("CC:", "").trim()
      return { name: parts[0], phone, document }
    })
}
