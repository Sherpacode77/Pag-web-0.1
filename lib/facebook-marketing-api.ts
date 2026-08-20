const GRAPH_VERSION = "v21.0"

export type AdAccountOption = {
  id: string
  label: string
}

// Cuentas publicitarias configuradas para el dashboard de administracion.
// Ver memoria reference-meta-marketing-api para el detalle de cada una.
export function getConfiguredAdAccounts(): AdAccountOption[] {
  const accounts: AdAccountOption[] = []
  const primary = process.env.FACEBOOK_AD_ACCOUNT_ID
  const legacy = process.env.FACEBOOK_AD_ACCOUNT_ID_LEGACY

  if (primary) accounts.push({ id: primary, label: "Cerounobikes 2026" })
  if (legacy) accounts.push({ id: legacy, label: "CUENTA CERO UNO 2022 (histórica)" })

  return accounts
}

export function isMetaAdsConfigured() {
  return Boolean(process.env.FACEBOOK_MARKETING_ACCESS_TOKEN) && getConfiguredAdAccounts().length > 0
}

type FacebookActionValue = {
  action_type: string
  value: string
}

type RawInsightsRow = {
  campaign_id?: string
  campaign_name?: string
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  inline_link_clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  frequency?: string
  actions?: FacebookActionValue[]
  action_values?: FacebookActionValue[]
  purchase_roas?: FacebookActionValue[]
}

export type CampaignPerformance = {
  campaignId: string
  campaignName: string
  status: string | null
  objective: string | null
  spend: number
  impressions: number
  reach: number
  clicks: number
  linkClicks: number
  ctr: number
  cpc: number
  cpm: number
  addToCart: number
  initiateCheckout: number
  purchases: number
  purchaseValue: number
  costPerPurchase: number | null
  roas: number | null
}

export type AdsAccountSummary = {
  spend: number
  impressions: number
  reach: number
  clicks: number
  linkClicks: number
  ctr: number
  cpc: number
  cpm: number
  addToCart: number
  initiateCheckout: number
  purchases: number
  purchaseValue: number
  costPerPurchase: number | null
  roas: number | null
}

export type AdsReport = {
  accountId: string
  accountLabel: string
  since: string
  until: string
  summary: AdsAccountSummary
  campaigns: CampaignPerformance[]
}

function num(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

// Meta reporta variantes con y sin prefijo "omni_" segun el origen del
// evento (solo sitio vs. multicanal) -- se suman todas las que coincidan
// para no subestimar el conteo real.
function sumActions(actions: FacebookActionValue[] | undefined, matchTypes: string[]): number {
  if (!actions) return 0
  return actions
    .filter((a) => matchTypes.some((t) => a.action_type === t || a.action_type === `omni_${t}`))
    .reduce((sum, a) => sum + num(a.value), 0)
}

function buildSummary(rows: { row: RawInsightsRow; derived: Omit<CampaignPerformance, "campaignId" | "campaignName" | "status" | "objective"> }[]): AdsAccountSummary {
  const totals = rows.reduce(
    (acc, { derived }) => ({
      spend: acc.spend + derived.spend,
      impressions: acc.impressions + derived.impressions,
      reach: acc.reach + derived.reach,
      clicks: acc.clicks + derived.clicks,
      linkClicks: acc.linkClicks + derived.linkClicks,
      addToCart: acc.addToCart + derived.addToCart,
      initiateCheckout: acc.initiateCheckout + derived.initiateCheckout,
      purchases: acc.purchases + derived.purchases,
      purchaseValue: acc.purchaseValue + derived.purchaseValue,
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, addToCart: 0, initiateCheckout: 0, purchases: 0, purchaseValue: 0 }
  )

  return {
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    costPerPurchase: totals.purchases > 0 ? totals.spend / totals.purchases : null,
    roas: totals.spend > 0 && totals.purchaseValue > 0 ? totals.purchaseValue / totals.spend : null,
  }
}

function deriveRow(row: RawInsightsRow) {
  const spend = num(row.spend)
  const impressions = num(row.impressions)
  const clicks = num(row.clicks)
  const addToCart = sumActions(row.actions, ["add_to_cart"])
  const initiateCheckout = sumActions(row.actions, ["initiate_checkout", "initiated_checkout"])
  const purchases = sumActions(row.actions, ["purchase"])
  const purchaseValue = sumActions(row.action_values, ["purchase"])

  return {
    spend,
    impressions,
    reach: num(row.reach),
    clicks,
    linkClicks: num(row.inline_link_clicks),
    ctr: num(row.ctr),
    cpc: num(row.cpc),
    cpm: num(row.cpm),
    addToCart,
    initiateCheckout,
    purchases,
    purchaseValue,
    costPerPurchase: purchases > 0 ? spend / purchases : null,
    roas: spend > 0 && purchaseValue > 0 ? purchaseValue / spend : null,
  }
}

const INSIGHTS_FIELDS = [
  "campaign_id",
  "campaign_name",
  "spend",
  "impressions",
  "reach",
  "clicks",
  "inline_link_clicks",
  "ctr",
  "cpc",
  "cpm",
  "actions",
  "action_values",
].join(",")

async function fetchInsightsRows(accountId: string, since: string, until: string): Promise<RawInsightsRow[]> {
  const token = process.env.FACEBOOK_MARKETING_ACCESS_TOKEN
  if (!token) throw new Error("FACEBOOK_MARKETING_ACCESS_TOKEN no configurado")

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/insights`)
  url.searchParams.set("level", "campaign")
  url.searchParams.set("time_range", JSON.stringify({ since, until }))
  url.searchParams.set("fields", INSIGHTS_FIELDS)
  url.searchParams.set("limit", "200")
  url.searchParams.set("access_token", token)

  const res = await fetch(url.toString(), { cache: "no-store" })
  const data = (await res.json()) as { data?: RawInsightsRow[]; error?: { message: string } }

  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Meta Insights respondio ${res.status}`)
  }

  return data.data ?? []
}

type CampaignStatusInfo = { status: string; objective: string }

async function fetchCampaignStatuses(accountId: string): Promise<Map<string, CampaignStatusInfo>> {
  const token = process.env.FACEBOOK_MARKETING_ACCESS_TOKEN
  if (!token) return new Map()

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/campaigns`)
  url.searchParams.set("fields", "name,status,objective")
  url.searchParams.set("limit", "200")
  url.searchParams.set("access_token", token)

  const res = await fetch(url.toString(), { cache: "no-store" })
  const data = (await res.json()) as {
    data?: { id: string; status: string; objective: string }[]
    error?: { message: string }
  }

  if (!res.ok || data.error || !data.data) return new Map()

  return new Map(data.data.map((c) => [c.id, { status: c.status, objective: c.objective }]))
}

export async function getAdsReport(accountId: string, accountLabel: string, since: string, until: string): Promise<AdsReport> {
  const [rows, statusMap] = await Promise.all([
    fetchInsightsRows(accountId, since, until),
    fetchCampaignStatuses(accountId),
  ])

  const enriched = rows.map((row) => ({ row, derived: deriveRow(row) }))

  const campaigns: CampaignPerformance[] = enriched
    .map(({ row, derived }) => ({
      campaignId: row.campaign_id ?? "",
      campaignName: row.campaign_name ?? "(sin nombre)",
      status: statusMap.get(row.campaign_id ?? "")?.status ?? null,
      objective: statusMap.get(row.campaign_id ?? "")?.objective ?? null,
      ...derived,
    }))
    .sort((a, b) => b.spend - a.spend)

  return {
    accountId,
    accountLabel,
    since,
    until,
    summary: buildSummary(enriched),
    campaigns,
  }
}
