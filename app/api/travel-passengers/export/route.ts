import { NextRequest, NextResponse } from "next/server"
import { ensureAdminSession } from "@/lib/auth"
import { hasDatabaseUrl } from "@/lib/db"
import { listTravelPassengers } from "@/lib/db-travel"
import { TRAVEL_LISTS } from "@/lib/travel-services"
import { buildXlsx, type SheetData } from "@/lib/xlsx-writer"

export const runtime = "nodejs"

const HEADERS = [
  "Pasajeros",
  "Grupos",
  "Nombre",
  "Numero",
  "Direccion",
  "Abono",
  "Pago",
  "Fecha abono",
  "Saldo",
  "Bicicleta",
  "Origen",
  "Pedido",
  "SKU",
  "Notas",
]

// Descarga las 4 listas de abordaje en un solo libro, una hoja por lista y con
// el mismo orden de columnas que ya usa el equipo en su Excel.
export async function GET(request: NextRequest) {
  const unauthorized = ensureAdminSession(request)
  if (unauthorized) return unauthorized
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 })
  }

  try {
    const passengers = await listTravelPassengers()

    const sheets: SheetData[] = TRAVEL_LISTS.map((list) => {
      const rows: SheetData["rows"] = [[list.label.toUpperCase()], HEADERS]
      passengers
        .filter((p) => p.list_key === list.key)
        .forEach((p, i) => {
          rows.push([
            i + 1,
            p.group_number ?? "",
            p.is_group_leader ? `${p.full_name} (separó el grupo)` : p.full_name,
            p.phone ?? "",
            p.pickup_point ?? "",
            p.deposit,
            p.payment_channel ?? "",
            p.deposit_date ?? "",
            p.balance,
            p.with_bike ? "Si" : "No",
            p.source === "web" ? "WEB" : "Manual",
            p.order_number ?? "",
            p.service_sku ?? "",
            p.notes ?? "",
          ])
        })
      rows.push([])
      rows.push(["Ocupacion", `${passengers.filter((p) => p.list_key === list.key).length} de ${list.capacity}`])
      return { name: list.sheet, rows }
    })

    const buffer = buildXlsx(sheets)
    const today = new Date().toISOString().slice(0, 10)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="listas-transporte-giro-de-rigo-${today}.xlsx"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("GET /api/travel-passengers/export:", error)
    return NextResponse.json({ error: "Error generando el archivo" }, { status: 500 })
  }
}
