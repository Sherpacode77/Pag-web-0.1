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

// Porcentaje de cambio contra el periodo anterior, por metrica. null en una
// metrica puntual significa que no se puede calcular (el valor anterior era
// cero), no que haya empeorado o mejorado.
export type PeriodComparison = {
  spend: number | null
  impressions: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  addToCart: number | null
  initiateCheckout: number | null
  purchases: number | null
  purchaseValue: number | null
  costPerPurchase: number | null
  roas: number | null
}

export type ActiveCampaignOption = {
  id: string
  name: string
}

export type AdsReport = {
  accountId: string
  accountLabel: string
  since: string
  until: string
  previousSince: string
  previousUntil: string
  selectedCampaignId: string | null
  summary: AdsAccountSummary
  previousSummary: AdsAccountSummary | null
  comparison: PeriodComparison | null
  campaigns: CampaignPerformance[]
  activeCampaigns: ActiveCampaignOption[]
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

type DerivedRow = Omit<CampaignPerformance, "campaignId" | "campaignName" | "status" | "objective">

function buildSummary(derivedRows: DerivedRow[]): AdsAccountSummary {
  const totals = derivedRows.reduce(
    (acc, derived) => ({
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

function deriveRow(row: RawInsightsRow): DerivedRow {
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

// null cuando el valor anterior es 0 -- no tiene sentido reportar un
// porcentaje de cambio contra una base de cero (seria +Infinity%).
function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

function buildComparison(current: AdsAccountSummary, previous: AdsAccountSummary): PeriodComparison {
  return {
    spend: percentChange(current.spend, previous.spend),
    impressions: percentChange(current.impressions, previous.impressions),
    clicks: percentChange(current.clicks, previous.clicks),
    ctr: percentChange(current.ctr, previous.ctr),
    cpc: percentChange(current.cpc, previous.cpc),
    addToCart: percentChange(current.addToCart, previous.addToCart),
    initiateCheckout: percentChange(current.initiateCheckout, previous.initiateCheckout),
    purchases: percentChange(current.purchases, previous.purchases),
    purchaseValue: percentChange(current.purchaseValue, previous.purchaseValue),
    costPerPurchase:
      current.costPerPurchase !== null && previous.costPerPurchase !== null
        ? percentChange(current.costPerPurchase, previous.costPerPurchase)
        : null,
    roas: current.roas !== null && previous.roas !== null ? percentChange(current.roas, previous.roas) : null,
  }
}

// Rango de igual longitud inmediatamente anterior a [since, until].
function getPreviousPeriod(since: string, until: string): { previousSince: string; previousUntil: string } {
  const sinceDate = new Date(`${since}T00:00:00Z`)
  const untilDate = new Date(`${until}T00:00:00Z`)
  const daysInRange = Math.round((untilDate.getTime() - sinceDate.getTime()) / 86400000) + 1

  const previousUntilDate = new Date(sinceDate.getTime() - 86400000)
  const previousSinceDate = new Date(previousUntilDate.getTime() - (daysInRange - 1) * 86400000)

  const toISO = (d: Date) => d.toISOString().slice(0, 10)
  return { previousSince: toISO(previousSinceDate), previousUntil: toISO(previousUntilDate) }
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

type CampaignStatusInfo = { name: string; status: string; objective: string }

async function fetchCampaignStatuses(accountId: string): Promise<Map<string, CampaignStatusInfo>> {
  const token = process.env.FACEBOOK_MARKETING_ACCESS_TOKEN
  if (!token) return new Map()

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/campaigns`)
  url.searchParams.set("fields", "name,status,objective")
  url.searchParams.set("limit", "200")
  url.searchParams.set("access_token", token)

  const res = await fetch(url.toString(), { cache: "no-store" })
  const data = (await res.json()) as {
    data?: { id: string; name: string; status: string; objective: string }[]
    error?: { message: string }
  }

  if (!res.ok || data.error || !data.data) return new Map()

  return new Map(data.data.map((c) => [c.id, { name: c.name, status: c.status, objective: c.objective }]))
}

export async function getAdsReport(
  accountId: string,
  accountLabel: string,
  since: string,
  until: string,
  campaignId?: string | null
): Promise<AdsReport> {
  const { previousSince, previousUntil } = getPreviousPeriod(since, until)

  const [rows, previousRows, statusMap] = await Promise.all([
    fetchInsightsRows(accountId, since, until),
    fetchInsightsRows(accountId, previousSince, previousUntil),
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

  const activeCampaigns: ActiveCampaignOption[] = Array.from(statusMap.entries())
    .filter(([, info]) => info.status === "ACTIVE")
    .map(([id, info]) => ({ id, name: info.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Si se selecciono una campana especifica, el resumen refleja solo esa
  // campana (no el total de la cuenta) -- tanto para el periodo actual como
  // el anterior, para que la comparacion siga siendo correcta.
  const currentDerived = campaignId
    ? enriched.filter(({ row }) => row.campaign_id === campaignId).map(({ derived }) => derived)
    : enriched.map(({ derived }) => derived)

  const previousDerived = (
    campaignId ? previousRows.filter((row) => row.campaign_id === campaignId) : previousRows
  ).map(deriveRow)

  const summary = buildSummary(currentDerived)
  const previousSummary = previousRows.length > 0 ? buildSummary(previousDerived) : null

  return {
    accountId,
    accountLabel,
    since,
    until,
    previousSince,
    previousUntil,
    selectedCampaignId: campaignId ?? null,
    summary,
    previousSummary,
    comparison: previousSummary ? buildComparison(summary, previousSummary) : null,
    campaigns,
    activeCampaigns,
  }
}
