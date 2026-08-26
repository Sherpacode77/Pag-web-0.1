import { JWT } from "google-auth-library"

const SHEET_TAB = "Hoja 1"

// Misma cuenta de servicio que ya usa lib/google-analytics-api.ts (mismo
// proyecto de Google Cloud) -- se le dio acceso de Editor a la hoja "Lista
// de clientes" compartiendola como "cualquiera con el enlace, editor", y se
// habilito la API de Sheets en ese proyecto. No se agrega `googleapis` como
// dependencia nueva: se llama el endpoint REST v4 directo usando
// google-auth-library (ya viene como transitiva de @google-analytics/data)
// como cliente HTTP autenticado.
export function isGoogleSheetsConfigured() {
  return Boolean(
    process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL &&
      process.env.GOOGLE_ANALYTICS_PRIVATE_KEY &&
      process.env.GOOGLE_SHEETS_LISTA_CLIENTES_ID
  )
}

let cachedClient: JWT | null = null

function getSheetsAuthClient(): JWT {
  if (cachedClient) return cachedClient

  const email = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL
  const key = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.split("\\n").join("\n")

  cachedClient = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return cachedClient
}

export type SheetRow = (string | number)[]

export async function appendRowsToLeadsSheet(rows: SheetRow[]): Promise<void> {
  if (rows.length === 0) return
  if (!isGoogleSheetsConfigured()) {
    console.error("appendRowsToLeadsSheet: Google Sheets no configurado, se omite")
    return
  }

  const sheetId = process.env.GOOGLE_SHEETS_LISTA_CLIENTES_ID
  const client = getSheetsAuthClient()

  await client.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
      SHEET_TAB
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    method: "POST",
    data: { values: rows },
  })
}
