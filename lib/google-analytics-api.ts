import { BetaAnalyticsDataClient } from "@google-analytics/data"
import { getSalesStatsForDateRange } from "@/lib/db-orders"

export function isGoogleAnalyticsConfigured() {
  return Boolean(
    process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL &&
      process.env.GOOGLE_ANALYTICS_PRIVATE_KEY &&
      process.env.GOOGLE_ANALYTICS_PROPERTY_ID
  )
}

let cachedClient: BetaAnalyticsDataClient | null = null

function getClient(): BetaAnalyticsDataClient {
  if (cachedClient) return cachedClient

  const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.split("\\n").join("\n")

  cachedClient = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })
  return cachedClient
}

function getPropertyPath(): string {
  return `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`
}

// Excluye el panel de administracion de todos los reportes -- solo interesa
// el comportamiento real de clientes en la tienda, no el trafico del equipo
// gestionando el catalogo/pedidos.
const EXCLUDE_ADMIN_FILTER = {
  notExpression: {
    filter: {
      fieldName: "pagePath",
      stringFilter: { matchType: "BEGINS_WITH" as const, value: "/admin" },
    },
  },
}

export type TrafficSummary = {
  activeUsers: number
  newUsers: number
  sessions: number
  screenPageViews: number
  averageSessionDuration: number
  bounceRate: number
  engagementRate: number
  eventCount: number
  cartsStarted: number
}

export type ChannelRow = {
  channel: string
  sessions: number
  activeUsers: number
  bounceRate: number
  averageSessionDuration: number
}

export type PageRow = {
  path: string
  title: string
  views: number
  averageSessionDuration: number
}

export type TrafficReport = {
  since: string
  until: string
  summary: TrafficSummary
  channels: ChannelRow[]
  topPages: PageRow[]
  sales: {
    salesCount: number
    unitsSold: number
    revenue: number
  }
}

function num(value: string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const SUMMARY_METRICS = [
  { name: "activeUsers" },
  { name: "newUsers" },
  { name: "sessions" },
  { name: "screenPageViews" },
  { name: "averageSessionDuration" },
  { name: "bounceRate" },
  { name: "engagementRate" },
  { name: "eventCount" },
]

export async function getTrafficReport(since: string, until: string): Promise<TrafficReport> {
  const client = getClient()
  const property = getPropertyPath()
  const dateRanges = [{ startDate: since, endDate: until }]

  const [summaryResp, channelResp, pagesResp, cartsResp, sales] = await Promise.all([
    client.runReport({ property, dateRanges, metrics: SUMMARY_METRICS, dimensionFilter: EXCLUDE_ADMIN_FILTER }),
    client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      dimensionFilter: EXCLUDE_ADMIN_FILTER,
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      dimensionFilter: EXCLUDE_ADMIN_FILTER,
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges,
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "add_to_cart" } },
      },
    }),
    getSalesStatsForDateRange(since, until),
  ])

  const summaryValues = summaryResp[0].rows?.[0]?.metricValues ?? []
  const summary: TrafficSummary = {
    activeUsers: num(summaryValues[0]?.value),
    newUsers: num(summaryValues[1]?.value),
    sessions: num(summaryValues[2]?.value),
    screenPageViews: num(summaryValues[3]?.value),
    averageSessionDuration: num(summaryValues[4]?.value),
    bounceRate: num(summaryValues[5]?.value),
    engagementRate: num(summaryValues[6]?.value),
    eventCount: num(summaryValues[7]?.value),
    cartsStarted: num(cartsResp[0].rows?.[0]?.metricValues?.[0]?.value),
  }

  const channels: ChannelRow[] = (channelResp[0].rows ?? []).map((row) => ({
    channel: row.dimensionValues?.[0]?.value ?? "(sin datos)",
    sessions: num(row.metricValues?.[0]?.value),
    activeUsers: num(row.metricValues?.[1]?.value),
    bounceRate: num(row.metricValues?.[2]?.value),
    averageSessionDuration: num(row.metricValues?.[3]?.value),
  }))

  const topPages: PageRow[] = (pagesResp[0].rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "",
    title: row.dimensionValues?.[1]?.value ?? "",
    views: num(row.metricValues?.[0]?.value),
    averageSessionDuration: num(row.metricValues?.[1]?.value),
  }))

  return { since, until, summary, channels, topPages, sales }
}
