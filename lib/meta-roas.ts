import type { RowDataPacket } from "mysql2/promise"
import { ensureDbSchema, getDbPool } from "@/lib/db"
import { RESULT_LABELS, type ResultType } from "@/lib/meta-roas-labels"

// ROAS real de Meta Ads: gasto de Meta (+ IVA) contra las ventas del Excel
// Mensajeria 2026, atribuidas por la letra del creativo (columna "Campaña").
// Nunca se usan las compras que reporta Meta: no coinciden con el Excel.

const GRAPH_VERSION = "v21.0"

// Meta entrega el gasto SIN el IVA del 19% que cobra en la factura.
export const IVA = 0.19
const withIva = (spend: number) => spend * (1 + IVA)

const META_SALES_CHANNEL = "Meta Ads"

// ---------------------------------------------------------------------------
// Reglas de alertas. Ventana actual = ultimos 7 dias completos (hasta ayer);
// se compara contra los 7 dias anteriores. Montos con IVA.
// ---------------------------------------------------------------------------
export const ALERT_RULES = {
  windowDays: 7,
  // Por debajo de este gasto semanal no hay datos suficientes para opinar.
  minSpend: 30_000,
  // PAUSAR: gasto alto sin ninguna venta, o ROAS por debajo de 1 (pierde plata).
  pauseNoSalesSpend: 80_000,
  pauseRoasBelow: 1,
  // PAUSAR por desempeno del mes: ROAS de 30 dias por debajo de 1,5x con gasto
  // suficiente (criterio de Ivan al pausar T con 1,39x en oct-2026).
  longWindowDays: 30,
  pauseLongRoasBelow: 1.5,
  pauseLongMinSpend: 100_000,
  // La alerta de una campana se omite si un solo creativo hace este % de su
  // gasto: diria lo mismo que la alerta del creativo.
  campaignDuplicateShare: 0.8,
  // LIMITAR: costo por resultado sube o ventas bajan.
  limitCostPerResultUpPct: 25,
  limitSalesDownPct: 30,
  minResultsToCompare: 5,
  minPrevSalesToCompare: 3,
  // ESCALAR: costo por resultado baja Y ventas suben, con ROAS sano.
  scaleCostPerResultDownPct: 15,
  scaleSalesUpPct: 20,
  scaleMinRoas: 2,
  scaleMinSales: 2,
  // Tope de aumento de presupuesto que Ivan pidio para no romper el aprendizaje.
  scaleBudgetStepPct: 30,
} as const

// ---------------------------------------------------------------------------
// Fechas en hora de Bogota (el servidor corre en UTC).
// ---------------------------------------------------------------------------
export function bogotaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date())
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Resultado segun el objetivo de optimizacion del conjunto
// ---------------------------------------------------------------------------
export type { ResultType } from "@/lib/meta-roas-labels"
export { RESULT_LABELS } from "@/lib/meta-roas-labels"

export function resultTypeFor(optimizationGoal: string | null): ResultType {
  switch (optimizationGoal) {
    case "REPLIES":
    case "CONVERSATIONS":
      return "conversations"
    case "LANDING_PAGE_VIEWS":
      return "landing_page_views"
    // El alcance no se puede sumar dia a dia (una persona cuenta en varios
    // dias), asi que para campanas de alcance se usa el costo por mil impresiones.
    case "REACH":
    case "IMPRESSIONS":
    case "AD_RECALL_LIFT":
      return "impressions"
    case "OFFSITE_CONVERSIONS":
      return "add_to_cart"
    case "LEAD_GENERATION":
    case "QUALITY_LEAD":
      return "leads"
    default:
      return "link_clicks"
  }
}

type FacebookAction = { action_type: string; value: string }

function actionCount(actions: FacebookAction[] | undefined, types: string[]): number {
  if (!actions) return 0
  for (const t of types) {
    const hit = actions.find((a) => a.action_type === t)
    if (hit) return Number(hit.value) || 0
  }
  return 0
}

function resultsFromActions(type: ResultType, actions: FacebookAction[] | undefined, impressions: number): number {
  switch (type) {
    case "conversations":
      return actionCount(actions, ["onsite_conversion.messaging_conversation_started_7d"])
    case "landing_page_views":
      return actionCount(actions, ["landing_page_view", "omni_landing_page_view"])
    case "impressions":
      return impressions
    case "add_to_cart":
      return actionCount(actions, ["offsite_conversion.fb_pixel_add_to_cart", "add_to_cart", "omni_add_to_cart"])
    case "leads":
      return actionCount(actions, ["lead", "onsite_conversion.lead_grouped"])
    default:
      return actionCount(actions, ["link_click"])
  }
}

// Costo por resultado (con IVA). Para impresiones se expresa por cada 1.000.
export function costPerResult(spendWithIva: number, results: number, type: ResultType): number | null {
  if (results <= 0) return null
  return type === "impressions" ? (spendWithIva / results) * 1000 : spendWithIva / results
}

// ---------------------------------------------------------------------------
// Cuentas publicitarias. El gasto real esta en la de Salva Vias, que tiene
// su propio token; las otras dos se revisan por si vuelven a gastar.
// ---------------------------------------------------------------------------
type AccountConfig = { id: string; token: string }

function configuredAccounts(): AccountConfig[] {
  const list: AccountConfig[] = []
  const add = (id: string | undefined, token: string | undefined) => {
    if (id && token && !list.some((a) => a.id === id)) list.push({ id, token })
  }
  add(process.env.FACEBOOK_SALVAVIAS_AD_ACCOUNT_ID, process.env.FACEBOOK_SALVAVIAS_ACCESS_TOKEN)
  add(process.env.FACEBOOK_AD_ACCOUNT_ID, process.env.FACEBOOK_MARKETING_ACCESS_TOKEN)
  add(process.env.FACEBOOK_AD_ACCOUNT_ID_LEGACY, process.env.FACEBOOK_MARKETING_ACCESS_TOKEN)
  return list
}

type RawAdDay = {
  date_start: string
  ad_id: string
  ad_name: string
  adset_name?: string
  campaign_id: string
  campaign_name: string
  objective?: string
  optimization_goal?: string
  spend?: string
  impressions?: string
  inline_link_clicks?: string
  actions?: FacebookAction[]
}

async function graphGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  const data = (await res.json()) as T & { error?: { message: string; error_user_msg?: string } }
  if (!res.ok || data.error) {
    throw new Error(data.error?.error_user_msg || data.error?.message || `Meta respondio ${res.status}`)
  }
  return data
}

async function fetchAdDays(account: AccountConfig, since: string, until: string): Promise<RawAdDay[]> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${account.id}/insights`)
  url.searchParams.set("level", "ad")
  url.searchParams.set("time_increment", "1")
  url.searchParams.set("time_range", JSON.stringify({ since, until }))
  url.searchParams.set(
    "fields",
    "ad_id,ad_name,adset_name,campaign_id,campaign_name,objective,optimization_goal,spend,impressions,inline_link_clicks,actions"
  )
  url.searchParams.set("limit", "500")
  url.searchParams.set("access_token", account.token)

  const rows: RawAdDay[] = []
  let next: string | undefined = url.toString()
  while (next) {
    const page: { data?: RawAdDay[]; paging?: { next?: string } } = await graphGet(next)
    rows.push(...(page.data ?? []))
    next = page.paging?.next
  }
  return rows
}

// account_status 1 = activa. Cualquier otro (3 = pago pendiente, 9 = periodo
// de gracia, 2 = deshabilitada) deja los anuncios sin entregar.
const ACCOUNT_STATUS_LABELS: Record<number, string> = {
  2: "deshabilitada",
  3: "con un pago pendiente",
  7: "en revisión de riesgo",
  8: "pendiente de liquidación",
  9: "en periodo de gracia por un pago pendiente",
  100: "pendiente de cierre",
  101: "cerrada",
}

type AccountHealth = { id: string; name: string; status: number; balance: number }

async function fetchAccountHealth(account: AccountConfig): Promise<AccountHealth> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${account.id}?fields=name,account_status,balance&access_token=${encodeURIComponent(account.token)}`
  const data: { name: string; account_status: number; balance?: string } = await graphGet(url)
  return { id: account.id, name: data.name, status: data.account_status, balance: Number(data.balance ?? 0) }
}

// Copia a la BD el gasto y los resultados diarios por anuncio. Meta sigue
// ajustando las conversiones de los ultimos dias, por eso cada corrida
// reescribe una ventana completa en vez de solo el dia anterior.
export async function syncMetaAdDays(since: string, until: string): Promise<{ rows: number; accounts: AccountHealth[] }> {
  await ensureDbSchema()
  const pool = getDbPool()
  const accounts = configuredAccounts()
  if (accounts.length === 0) throw new Error("No hay cuentas de Meta configuradas (FACEBOOK_SALVAVIAS_ACCESS_TOKEN / FACEBOOK_SALVAVIAS_AD_ACCOUNT_ID)")

  let total = 0
  const health: AccountHealth[] = []
  for (const account of accounts) {
    health.push(await fetchAccountHealth(account))
    const rows = await fetchAdDays(account, since, until)
    for (const r of rows) {
      const impressions = Number(r.impressions ?? 0)
      const goal = r.optimization_goal ?? null
      const results = resultsFromActions(resultTypeFor(goal), r.actions, impressions)
      await pool.execute(
        `INSERT INTO app_meta_ad_daily
           (date, ad_id, account_id, ad_name, adset_name, campaign_id, campaign_name, objective, optimization_goal,
            spend, impressions, link_clicks, results)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           ad_name = VALUES(ad_name), adset_name = VALUES(adset_name), campaign_id = VALUES(campaign_id),
           campaign_name = VALUES(campaign_name), objective = VALUES(objective),
           optimization_goal = VALUES(optimization_goal), spend = VALUES(spend),
           impressions = VALUES(impressions), link_clicks = VALUES(link_clicks), results = VALUES(results)`,
        [
          r.date_start,
          r.ad_id,
          account.id,
          r.ad_name.slice(0, 255),
          r.adset_name?.slice(0, 255) ?? null,
          r.campaign_id,
          r.campaign_name.slice(0, 255),
          r.objective ?? null,
          goal,
          Number(r.spend ?? 0),
          impressions,
          Number(r.inline_link_clicks ?? 0),
          results,
        ]
      )
      total++
    }
  }
  return { rows: total, accounts: health }
}

// ---------------------------------------------------------------------------
// Informe: ROAS por creativo y por campana en un rango
// ---------------------------------------------------------------------------
export type RoasRow = {
  key: string
  label: string
  letter: string | null
  campaignName: string | null
  resultType: ResultType
  spend: number // con IVA
  spendMeta: number // sin IVA, como lo muestra Meta
  results: number
  costPerResult: number | null
  sales: number
  revenue: number
  roas: number | null
  costPerSale: number | null
  lastSpendDate: string | null
  hasSalesTracking: boolean
  // Utilidad aproximada = ingreso - costo de compra de lo vendido - gasto con IVA
  productCost: number | null
  profit: number | null
  unitsWithoutCost: number
  references: string[]
}

export type UnattributedSale = { customerName: string | null; contactDate: string; letter: string | null; amount: number }

export type RoasReport = {
  since: string
  until: string
  totals: {
    spend: number
    spendMeta: number
    sales: number
    revenue: number
    roas: number | null
    productCost: number
    profit: number
  }
  campaigns: RoasRow[]
  creatives: RoasRow[]
  unattributed: UnattributedSale[]
}

type AdAgg = {
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  optimization_goal: string | null
  spend: number
  results: number
  last_spend_date: string | null
  letter: string | null
  creative_label: string | null
}

async function loadAdAggregates(since: string, until: string): Promise<AdAgg[]> {
  const [rows] = await getDbPool().execute<RowDataPacket[]>(
    `SELECT d.ad_id,
            MAX(d.ad_name)                 AS ad_name,
            MAX(d.campaign_id)             AS campaign_id,
            MAX(d.campaign_name)           AS campaign_name,
            MAX(d.optimization_goal)       AS optimization_goal,
            SUM(d.spend)                   AS spend,
            SUM(d.results)                 AS results,
            DATE_FORMAT(MAX(CASE WHEN d.spend > 0 THEN d.date END), '%Y-%m-%d') AS last_spend_date,
            MAX(c.letter)                  AS letter,
            MAX(c.label)                   AS creative_label
     FROM app_meta_ad_daily d
     LEFT JOIN app_ad_creatives c ON c.ad_id = d.ad_id
     WHERE d.date BETWEEN ? AND ?
     GROUP BY d.ad_id
     HAVING SUM(d.spend) > 0 OR SUM(d.results) > 0`,
    [since, until]
  )
  return rows.map((r) => ({
    ad_id: String(r.ad_id),
    ad_name: String(r.ad_name),
    campaign_id: String(r.campaign_id),
    campaign_name: String(r.campaign_name),
    optimization_goal: r.optimization_goal ? String(r.optimization_goal) : null,
    spend: Number(r.spend),
    results: Number(r.results),
    last_spend_date: r.last_spend_date ? String(r.last_spend_date) : null,
    letter: r.letter ? String(r.letter).toUpperCase() : null,
    creative_label: r.creative_label ? String(r.creative_label) : null,
  }))
}

type SaleAgg = {
  letter: string | null
  customerName: string | null
  contactDate: string
  amount: number
  productCode: string | null
  quantity: number
}

// Ventas de Meta Ads fechadas por el contacto (si falta, por la compra).
async function loadMetaSales(since: string, until: string): Promise<SaleAgg[]> {
  const [rows] = await getDbPool().execute<RowDataPacket[]>(
    `SELECT UPPER(TRIM(creative_letter)) AS letter, customer_name,
            DATE_FORMAT(COALESCE(contact_date, sale_date), '%Y-%m-%d') AS contact_date,
            net_amount, LOWER(TRIM(product_code)) AS product_code, quantity
     FROM app_sales_log
     WHERE is_return = 0 AND channel = ? AND COALESCE(contact_date, sale_date) BETWEEN ? AND ?`,
    [META_SALES_CHANNEL, since, until]
  )
  return rows.map((r) => ({
    letter: r.letter ? String(r.letter) : null,
    customerName: r.customer_name ? String(r.customer_name) : null,
    contactDate: String(r.contact_date),
    amount: Number(r.net_amount),
    productCode: r.product_code ? String(r.product_code) : null,
    quantity: Number(r.quantity) || 1,
  }))
}

// ---------------------------------------------------------------------------
// Costos de compra por referencia y referencias de cada creativo
// ---------------------------------------------------------------------------
export type ProductCost = { code: string; name: string; unitCost: number }

export async function listProductCosts(): Promise<ProductCost[]> {
  await ensureDbSchema()
  const [rows] = await getDbPool().execute<RowDataPacket[]>(`SELECT code, name, unit_cost FROM app_product_costs ORDER BY name`)
  return rows.map((r) => ({ code: String(r.code), name: String(r.name), unitCost: Number(r.unit_cost) }))
}

export async function setProductCost(code: string, name: string, unitCost: number) {
  await ensureDbSchema()
  await getDbPool().execute(
    `INSERT INTO app_product_costs (code, name, unit_cost) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), unit_cost = VALUES(unit_cost)`,
    [code.trim().toLowerCase(), name.trim(), unitCost]
  )
}

export async function listLetterReferences(): Promise<Map<string, string[]>> {
  await ensureDbSchema()
  const [rows] = await getDbPool().execute<RowDataPacket[]>(`SELECT letter, product_codes FROM app_creative_letters`)
  return new Map(
    rows.map((r) => [
      String(r.letter).toUpperCase(),
      String(r.product_codes)
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
    ])
  )
}

export async function setLetterReferences(letter: string, codes: string[]) {
  await ensureDbSchema()
  await getDbPool().execute(
    `INSERT INTO app_creative_letters (letter, product_codes) VALUES (?,?)
     ON DUPLICATE KEY UPDATE product_codes = VALUES(product_codes)`,
    [letter.toUpperCase(), codes.map((c) => c.trim().toLowerCase()).filter(Boolean).join(",")]
  )
}

type CostMap = Map<string, number>

function productCostOf(sales: { productCode: string | null; quantity: number }[], costs: CostMap) {
  let cost = 0
  let missing = 0
  for (const s of sales) {
    const unit = s.productCode ? costs.get(s.productCode) : undefined
    if (unit === undefined) missing += s.quantity
    else cost += unit * s.quantity
  }
  return { cost, missing }
}

// Un cliente con varios productos ocupa varias filas del Excel; para contar
// "ventas" se agrupan por cliente + dia de contacto.
function countOrders(sales: SaleAgg[]): number {
  return new Set(sales.map((s) => `${(s.customerName ?? "").trim().toLowerCase()}|${s.contactDate}`)).size
}

function finishRow(
  row: Omit<RoasRow, "costPerResult" | "roas" | "costPerSale" | "profit" | "productCost" | "unitsWithoutCost" | "references">,
  salesRows: SaleAgg[],
  costs: CostMap,
  references: string[] = []
): RoasRow {
  const { cost, missing } = productCostOf(salesRows, costs)
  return {
    ...row,
    references,
    productCost: row.hasSalesTracking ? cost : null,
    unitsWithoutCost: row.hasSalesTracking ? missing : 0,
    profit: row.hasSalesTracking ? row.revenue - cost - row.spend : null,
    costPerResult: costPerResult(row.spend, row.results, row.resultType),
    roas: row.hasSalesTracking && row.spend > 0 ? row.revenue / row.spend : null,
    costPerSale: row.hasSalesTracking && row.sales > 0 ? row.spend / row.sales : null,
  }
}

function dominantResultType(ads: AdAgg[]): ResultType {
  const bySpend = new Map<ResultType, number>()
  for (const a of ads) {
    const t = resultTypeFor(a.optimization_goal)
    bySpend.set(t, (bySpend.get(t) ?? 0) + a.spend)
  }
  return [...bySpend.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "link_clicks"
}

export async function getRoasReport(since: string, until: string): Promise<RoasReport> {
  await ensureDbSchema()
  const [ads, sales, costList, letterRefs] = await Promise.all([
    loadAdAggregates(since, until),
    loadMetaSales(since, until),
    listProductCosts(),
    listLetterReferences(),
  ])
  const costs: CostMap = new Map(costList.map((c) => [c.code, c.unitCost]))

  const salesByLetter = new Map<string, SaleAgg[]>()
  for (const s of sales) {
    if (!s.letter) continue
    salesByLetter.set(s.letter, [...(salesByLetter.get(s.letter) ?? []), s])
  }

  // Creativos: los anuncios con letra se agrupan por letra; los que no tienen
  // letra se muestran solos (sin ventas que atribuirles).
  const creativeGroups = new Map<string, AdAgg[]>()
  for (const a of ads) {
    const key = a.letter ? `L:${a.letter}` : `A:${a.ad_id}`
    creativeGroups.set(key, [...(creativeGroups.get(key) ?? []), a])
  }

  const creatives: RoasRow[] = [...creativeGroups.entries()].map(([key, group]) => {
    const letter = group[0].letter
    const letterSales = letter ? salesByLetter.get(letter) ?? [] : []
    const spendMeta = group.reduce((s, a) => s + a.spend, 0)
    const campaigns = [...new Set(group.map((a) => a.campaign_name))]
    const lastSpend = group.map((a) => a.last_spend_date).filter(Boolean).sort().pop() ?? null
    return finishRow({
      key,
      label: group[0].creative_label || group[0].ad_name,
      letter,
      campaignName: campaigns.join(" · "),
      resultType: dominantResultType(group),
      spendMeta,
      spend: withIva(spendMeta),
      results: group.reduce((s, a) => s + a.results, 0),
      sales: countOrders(letterSales),
      revenue: letterSales.reduce((s, x) => s + x.amount, 0),
      lastSpendDate: lastSpend,
      hasSalesTracking: Boolean(letter),
    }, letterSales, costs, letter ? letterRefs.get(letter) ?? [] : [])
  })

  // Campanas: las ventas de cada letra van a la campana donde ese creativo
  // gasto mas en el rango (una letra casi siempre vive en una sola campana).
  const letterHome = new Map<string, string>()
  for (const letter of new Set(ads.map((a) => a.letter).filter((l): l is string => Boolean(l)))) {
    const spendByCampaign = new Map<string, number>()
    for (const a of ads.filter((x) => x.letter === letter)) {
      spendByCampaign.set(a.campaign_id, (spendByCampaign.get(a.campaign_id) ?? 0) + a.spend)
    }
    letterHome.set(letter, [...spendByCampaign.entries()].sort((a, b) => b[1] - a[1])[0][0])
  }

  const campaignGroups = new Map<string, AdAgg[]>()
  for (const a of ads) campaignGroups.set(a.campaign_id, [...(campaignGroups.get(a.campaign_id) ?? []), a])

  const campaigns: RoasRow[] = [...campaignGroups.entries()].map(([campaignId, group]) => {
    const letters = [...letterHome.entries()].filter(([, home]) => home === campaignId).map(([l]) => l).sort()
    const campaignSales = letters.flatMap((l) => salesByLetter.get(l) ?? [])
    const spendMeta = group.reduce((s, a) => s + a.spend, 0)
    return finishRow({
      key: campaignId,
      label: group[0].campaign_name,
      letter: letters.length ? letters.join(" + ") : null,
      campaignName: null,
      resultType: dominantResultType(group),
      spendMeta,
      spend: withIva(spendMeta),
      results: group.reduce((s, a) => s + a.results, 0),
      sales: countOrders(campaignSales),
      revenue: campaignSales.reduce((s, x) => s + x.amount, 0),
      lastSpendDate: group.map((a) => a.last_spend_date).filter(Boolean).sort().pop() ?? null,
      hasSalesTracking: letters.length > 0,
    }, campaignSales, costs, [...new Set(letters.flatMap((l) => letterRefs.get(l) ?? []))])
  })

  const knownLetters = new Set(letterHome.keys())
  const unattributed = sales
    .filter((s) => !s.letter || !knownLetters.has(s.letter))
    .map((s) => ({ customerName: s.customerName, contactDate: s.contactDate, letter: s.letter, amount: s.amount }))

  const spendMeta = ads.reduce((s, a) => s + a.spend, 0)
  const attributed = sales.filter((s) => s.letter && knownLetters.has(s.letter))
  const revenue = attributed.reduce((s, x) => s + x.amount, 0)
  const attributedCost = productCostOf(attributed, costs).cost

  const bySpend = (a: RoasRow, b: RoasRow) => b.spend - a.spend
  return {
    since,
    until,
    totals: {
      spendMeta,
      spend: withIva(spendMeta),
      sales: countOrders(attributed),
      revenue,
      roas: spendMeta > 0 ? revenue / withIva(spendMeta) : null,
      productCost: attributedCost,
      profit: revenue - attributedCost - withIva(spendMeta),
    },
    campaigns: campaigns.sort(bySpend),
    creatives: creatives.sort(bySpend),
    unattributed,
  }
}

// ---------------------------------------------------------------------------
// Utilidad aproximada del negocio en un rango: TODAS las ventas del Excel
// (cualquier canal, por fecha de compra, como el informe de Ventas) menos su
// costo de compra y menos toda la pauta de Meta con IVA. No incluye empaques,
// comisiones ni costos fijos.
// ---------------------------------------------------------------------------
export type BusinessChannelProfit = {
  channel: string
  sales: number
  units: number
  revenue: number
  productCost: number
  grossProfit: number
}

export type BusinessProfit = {
  revenue: number
  productCost: number
  grossProfit: number
  metaSpend: number // con IVA
  metaSpendProducts: number // anuncios con letra (producto)
  metaSpendOther: number // anuncios sin letra (servicios u otros)
  profit: number
  margin: number | null
  units: number
  unitsWithoutCost: number
  unknownCodes: string[]
  byChannel: BusinessChannelProfit[]
}

export async function getBusinessProfit(since: string, until: string): Promise<BusinessProfit> {
  await ensureDbSchema()
  const pool = getDbPool()
  const [[salesRows], [spendRows], costList] = await Promise.all([
    pool.execute<RowDataPacket[]>(
      `SELECT channel, LOWER(TRIM(product_code)) AS product_code, quantity, net_amount, customer_name,
              DATE_FORMAT(sale_date, '%Y-%m-%d') AS sale_date
       FROM app_sales_log
       WHERE is_return = 0 AND sale_date BETWEEN ? AND ?`,
      [since, until]
    ),
    pool.execute<RowDataPacket[]>(
      `SELECT SUM(d.spend) AS spend, SUM(CASE WHEN c.letter IS NOT NULL THEN d.spend ELSE 0 END) AS product_spend
       FROM app_meta_ad_daily d LEFT JOIN app_ad_creatives c ON c.ad_id = d.ad_id
       WHERE d.date BETWEEN ? AND ?`,
      [since, until]
    ),
    listProductCosts(),
  ])
  const costs: CostMap = new Map(costList.map((c) => [c.code, c.unitCost]))

  const channels = new Map<string, { orders: Set<string>; units: number; revenue: number; cost: number }>()
  let unitsWithoutCost = 0
  const unknown = new Set<string>()
  for (const r of salesRows) {
    const code = r.product_code ? String(r.product_code) : null
    const qty = Number(r.quantity) || 1
    const unit = code ? costs.get(code) : undefined
    if (unit === undefined) {
      unitsWithoutCost += qty
      unknown.add(code ?? "(vacío)")
    }
    const ch = channels.get(String(r.channel)) ?? { orders: new Set<string>(), units: 0, revenue: 0, cost: 0 }
    ch.orders.add(`${String(r.customer_name ?? "").trim().toLowerCase()}|${r.sale_date}`)
    ch.units += qty
    ch.revenue += Number(r.net_amount)
    ch.cost += (unit ?? 0) * qty
    channels.set(String(r.channel), ch)
  }

  const byChannel = [...channels.entries()]
    .map(([channel, c]) => ({
      channel,
      sales: c.orders.size,
      units: c.units,
      revenue: c.revenue,
      productCost: c.cost,
      grossProfit: c.revenue - c.cost,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const revenue = byChannel.reduce((s, c) => s + c.revenue, 0)
  const productCost = byChannel.reduce((s, c) => s + c.productCost, 0)
  const metaSpend = withIva(Number(spendRows[0]?.spend ?? 0))
  const metaSpendProducts = withIva(Number(spendRows[0]?.product_spend ?? 0))
  const profit = revenue - productCost - metaSpend
  return {
    revenue,
    productCost,
    grossProfit: revenue - productCost,
    metaSpend,
    metaSpendProducts,
    metaSpendOther: metaSpend - metaSpendProducts,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : null,
    units: byChannel.reduce((s, c) => s + c.units, 0),
    unitsWithoutCost,
    unknownCodes: [...unknown].sort(),
    byChannel,
  }
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------
export type AlertKind = "pause" | "limit" | "scale" | "account"

export type AdsAlert = {
  scope: "campaign" | "creative" | "account"
  scopeKey: string
  scopeLabel: string
  kind: AlertKind
  title: string
  detail: string
  metrics: Record<string, number | string | null>
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return ((current - previous) / previous) * 100
}

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
const pct = (n: number) => `${Math.abs(n).toFixed(0)}%`
const roasFmt = (n: number) => `${n.toFixed(2).replace(".", ",")}x`

function scopeName(scope: "campaign" | "creative", row: RoasRow): string {
  if (scope === "creative") return row.letter ? `Creativo ${row.letter} (${row.label})` : `Anuncio "${row.label}"`
  return `Campaña "${row.label}"`
}

function evaluateLong(scope: "campaign" | "creative", long: RoasRow): AdsAlert | null {
  const R = ALERT_RULES
  if (!long.hasSalesTracking || long.roas === null || long.spend < R.pauseLongMinSpend) return null
  if (long.roas >= R.pauseLongRoasBelow) return null
  return {
    scope,
    scopeKey: long.key,
    scopeLabel: scopeName(scope, long),
    kind: "pause",
    title: `Pausar: ROAS de ${roasFmt(long.roas)} en los últimos ${R.longWindowDays} días (mínimo esperado ${roasFmt(R.pauseLongRoasBelow)})`,
    detail:
      `En ${R.longWindowDays} días gastó ${cop(long.spend)} (con IVA) y vendió ${cop(long.revenue)} en ${long.sales} venta${long.sales === 1 ? "" : "s"}` +
      `${long.costPerSale !== null ? `: cada venta costó ${cop(long.costPerSale)}` : ""}. ` +
      `${long.costPerResult !== null ? `Costo ${RESULT_LABELS[long.resultType].per}: ${cop(long.costPerResult)}. ` : ""}` +
      `Sugerencia: pausarlo y pasar ese presupuesto a los creativos más rentables.`,
    metrics: {
      gasto30d: Math.round(long.spend),
      ventas30d: long.sales,
      ingreso30d: long.revenue,
      roas30d: Number(long.roas.toFixed(2)),
    },
  }
}

function evaluateRow(
  scope: "campaign" | "creative",
  cur: RoasRow | undefined,
  prev: RoasRow | undefined,
  long: RoasRow | undefined
): AdsAlert | null {
  const R = ALERT_RULES
  // Lo mas grave primero: si el mes completo no rinde, se pausa aunque la
  // ultima semana haya gastado poco (p. ej. con la cuenta bloqueada).
  const longAlert = long ? evaluateLong(scope, long) : null
  if (longAlert) return longAlert
  if (!cur || cur.spend < R.minSpend) return null

  const label = RESULT_LABELS[cur.resultType]
  const cprChange = pctChange(cur.costPerResult, prev?.costPerResult ?? null)
  const cprComparable = cur.results >= R.minResultsToCompare && (prev?.results ?? 0) >= R.minResultsToCompare
  const prevSales = prev?.sales ?? 0
  const salesChange = prevSales > 0 ? ((cur.sales - prevSales) / prevSales) * 100 : null

  const metrics = {
    gasto7d: Math.round(cur.spend),
    resultados7d: cur.results,
    costoPorResultado7d: cur.costPerResult && Math.round(cur.costPerResult),
    costoPorResultadoAnterior: prev?.costPerResult ? Math.round(prev.costPerResult) : null,
    cambioCostoPct: cprChange !== null ? Math.round(cprChange) : null,
    ventas7d: cur.hasSalesTracking ? cur.sales : null,
    ventasAnterior: cur.hasSalesTracking ? prevSales : null,
    roas7d: cur.roas !== null ? Number(cur.roas.toFixed(2)) : null,
    tipoResultado: cur.resultType,
  }
  const base = { scope, scopeKey: cur.key, scopeLabel: scopeName(scope, cur), metrics }
  const cprText =
    cur.costPerResult !== null
      ? `${cop(cur.costPerResult)} ${label.per}` +
        (prev?.costPerResult ? ` (la semana anterior: ${cop(prev.costPerResult)})` : "")
      : `sin ${label.plural}`

  // 1. PAUSAR
  if (cur.hasSalesTracking && cur.sales === 0 && cur.spend >= R.pauseNoSalesSpend) {
    return {
      ...base,
      kind: "pause",
      title: `Pausar: ${cop(cur.spend)} gastados en 7 días sin ninguna venta`,
      detail: `En los últimos 7 días gastó ${cop(cur.spend)} (con IVA), generó ${cur.results} ${label.plural} y ninguna venta. Costo: ${cprText}.`,
    }
  }
  if (cur.roas !== null && cur.sales > 0 && cur.roas < R.pauseRoasBelow) {
    return {
      ...base,
      kind: "pause",
      title: `Pausar: ROAS de ${roasFmt(cur.roas)}, cada peso invertido regresa menos de un peso`,
      detail: `Gastó ${cop(cur.spend)} y vendió ${cop(cur.revenue)} (${cur.sales} venta${cur.sales === 1 ? "" : "s"}) en los últimos 7 días.`,
    }
  }

  // 2. LIMITAR
  const reasons: string[] = []
  if (cprComparable && cprChange !== null && cprChange >= R.limitCostPerResultUpPct) {
    reasons.push(`el costo ${label.per} subió ${pct(cprChange)}: ${cprText}`)
  }
  if (cur.hasSalesTracking && prevSales >= R.minPrevSalesToCompare && salesChange !== null && salesChange <= -R.limitSalesDownPct) {
    reasons.push(`las ventas bajaron ${pct(salesChange)}: ${cur.sales} contra ${prevSales} la semana anterior`)
  }
  if (reasons.length) {
    return {
      ...base,
      kind: "limit",
      title: `Limitar gasto: ${reasons.length === 2 ? "sube el costo y bajan las ventas" : reasons[0].split(":")[0]}`,
      detail: `En los últimos 7 días ${reasons.join("; y ")}. Gasto de la semana: ${cop(cur.spend)} (con IVA)${cur.roas !== null ? `, ROAS ${roasFmt(cur.roas)}` : ""}. Sugerencia: bajar el presupuesto diario o revisar el creativo.`,
    }
  }

  // 3. ESCALAR (necesita ventas: solo aplica a creativos y campanas con letra)
  const salesUp =
    cur.hasSalesTracking &&
    cur.sales >= R.scaleMinSales &&
    (prevSales === 0 ? true : salesChange !== null && salesChange >= R.scaleSalesUpPct)
  if (
    salesUp &&
    cprComparable &&
    cprChange !== null &&
    cprChange <= -R.scaleCostPerResultDownPct &&
    cur.roas !== null &&
    cur.roas >= R.scaleMinRoas
  ) {
    return {
      ...base,
      kind: "scale",
      title: `Escalar: el costo bajó ${pct(cprChange)} y las ventas subieron ${prevSales === 0 ? `(${cur.sales} nuevas)` : pct(salesChange!)}`,
      detail: `Últimos 7 días: ${cprText}; ${cur.sales} ventas contra ${prevSales} la semana anterior; ROAS ${roasFmt(cur.roas)}. Sugerencia: subir el presupuesto diario hasta un ${R.scaleBudgetStepPct}% y revisar de nuevo en 3 o 4 días.`,
    }
  }

  return null
}

async function accountsWithSpendSince(since: string): Promise<Set<string>> {
  const [rows] = await getDbPool().execute<RowDataPacket[]>(
    `SELECT DISTINCT account_id FROM app_meta_ad_daily WHERE date >= ? AND spend > 0`,
    [since]
  )
  return new Set(rows.map((r) => String(r.account_id)))
}

export async function computeAlerts(runDate: string, accounts: AccountHealth[] = []): Promise<AdsAlert[]> {
  const W = ALERT_RULES.windowDays
  const curUntil = addDays(runDate, -1) // dias completos: hasta ayer
  const curSince = addDays(curUntil, -(W - 1))
  const prevUntil = addDays(curSince, -1)
  const prevSince = addDays(prevUntil, -(W - 1))

  const longSince = addDays(curUntil, -(ALERT_RULES.longWindowDays - 1))

  const [cur, prev, long] = await Promise.all([
    getRoasReport(curSince, curUntil),
    getRoasReport(prevSince, prevUntil),
    getRoasReport(longSince, curUntil),
  ])
  const alerts: AdsAlert[] = []

  const recentlyActive = await accountsWithSpendSince(addDays(runDate, -30))
  for (const a of accounts) {
    // Una cuenta vieja con deuda pero sin pauta no detiene nada: no se alerta.
    if (a.status !== 1 && recentlyActive.has(a.id)) {
      alerts.push({
        scope: "account",
        scopeKey: a.id,
        scopeLabel: `Cuenta publicitaria ${a.name} (${a.id})`,
        kind: "account",
        title: `La cuenta está ${ACCOUNT_STATUS_LABELS[a.status] ?? `en estado ${a.status}`}: los anuncios no se están mostrando`,
        detail: `Saldo pendiente: ${cop(a.balance)}. Mientras no se resuelva en Facturación de Meta no se entrega ningún anuncio y tampoco se pueden hacer cambios por API.`,
        metrics: { estado: a.status, saldo: a.balance },
      })
    }
  }

  const byKey = (rows: RoasRow[]) => new Map(rows.map((r) => [r.key, r]))
  const keysOf = (...lists: RoasRow[][]) => [...new Set(lists.flat().map((r) => r.key))]

  const [curCre, prevCre, longCre] = [byKey(cur.creatives), byKey(prev.creatives), byKey(long.creatives)]
  const creativeAlerts = new Map<string, AdsAlert>()
  for (const key of keysOf(cur.creatives, long.creatives)) {
    const alert = evaluateRow("creative", curCre.get(key), prevCre.get(key), longCre.get(key))
    if (alert) creativeAlerts.set(key, alert)
  }
  alerts.push(...creativeAlerts.values())

  const [curCam, prevCam, longCam] = [byKey(cur.campaigns), byKey(prev.campaigns), byKey(long.campaigns)]
  for (const key of keysOf(cur.campaigns, long.campaigns)) {
    const alert = evaluateRow("campaign", curCam.get(key), prevCam.get(key), longCam.get(key))
    if (!alert) continue
    // Si la campana es practicamente un solo creativo que ya tiene alerta,
    // la de la campana repetiria lo mismo.
    const isLong = alert.metrics.roas30d !== undefined
    const campaign = (isLong ? longCam : curCam).get(key)
    const dominant = (isLong ? long : cur).creatives.find(
      (c) =>
        campaign &&
        c.campaignName === campaign.label &&
        campaign.spend > 0 &&
        c.spend / campaign.spend >= ALERT_RULES.campaignDuplicateShare
    )
    if (dominant && creativeAlerts.has(dominant.key)) continue
    alerts.push(alert)
  }
  return alerts
}

// Guarda las alertas del dia. Devuelve solo las que no existian (para no
// enviar dos veces el mismo correo si la corrida se repite).
export async function saveAlerts(runDate: string, alerts: AdsAlert[]): Promise<AdsAlert[]> {
  const pool = getDbPool()
  const fresh: AdsAlert[] = []
  // Si se repite la corrida el mismo dia, las alertas de hoy que ya no aplican
  // (datos corregidos o reglas nuevas) se retiran.
  const current = new Set(alerts.map((a) => `${a.scope}|${a.scopeKey}|${a.kind}`))
  const [today] = await pool.execute<RowDataPacket[]>(
    `SELECT id, scope, scope_key, kind FROM app_ads_alerts WHERE run_date = ?`,
    [runDate]
  )
  const stale = today.filter((r) => !current.has(`${r.scope}|${r.scope_key}|${r.kind}`)).map((r) => Number(r.id))
  if (stale.length) {
    await pool.execute(`DELETE FROM app_ads_alerts WHERE id IN (${stale.map(() => "?").join(",")})`, stale)
  }
  for (const a of alerts) {
    const [res] = await pool.execute(
      `INSERT IGNORE INTO app_ads_alerts (run_date, scope, scope_key, scope_label, kind, title, detail, metrics)
       VALUES (?,?,?,?,?,?,?,?)`,
      [runDate, a.scope, a.scopeKey, a.scopeLabel.slice(0, 255), a.kind, a.title.slice(0, 255), a.detail, JSON.stringify(a.metrics)]
    )
    if ((res as { affectedRows?: number }).affectedRows) fresh.push(a)
  }
  return fresh
}

export async function markAlertsEmailed(runDate: string) {
  await getDbPool().execute(`UPDATE app_ads_alerts SET emailed_at = NOW() WHERE run_date = ? AND emailed_at IS NULL`, [runDate])
}

export type StoredAlert = AdsAlert & { id: number; runDate: string; seenAt: string | null; createdAt: string }

export async function listRecentAlerts(days = 14): Promise<StoredAlert[]> {
  await ensureDbSchema()
  const [rows] = await getDbPool().execute<RowDataPacket[]>(
    `SELECT id, DATE_FORMAT(run_date, '%Y-%m-%d') AS run_date, scope, scope_key, scope_label, kind, title, detail,
            metrics, seen_at, created_at
     FROM app_ads_alerts
     WHERE run_date >= ?
     ORDER BY run_date DESC, FIELD(kind, 'account', 'pause', 'limit', 'scale'), id`,
    [addDays(bogotaToday(), -days)]
  )
  return rows.map((r) => ({
    id: Number(r.id),
    runDate: String(r.run_date),
    scope: r.scope,
    scopeKey: String(r.scope_key),
    scopeLabel: String(r.scope_label),
    kind: r.kind,
    title: String(r.title),
    detail: String(r.detail),
    metrics: typeof r.metrics === "string" ? JSON.parse(r.metrics) : r.metrics ?? {},
    seenAt: r.seen_at ? new Date(r.seen_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
  }))
}

export async function markAlertsSeen(ids: number[]) {
  if (ids.length === 0) return
  await getDbPool().execute(
    `UPDATE app_ads_alerts SET seen_at = NOW() WHERE seen_at IS NULL AND id IN (${ids.map(() => "?").join(",")})`,
    ids
  )
}

// ---------------------------------------------------------------------------
// Letras de creativos
// ---------------------------------------------------------------------------
export type CreativeAssignment = { adId: string; letter: string; label: string | null }
export type KnownAd = { adId: string; adName: string; campaignName: string; lastDate: string; letter: string | null }

export async function listKnownAds(): Promise<KnownAd[]> {
  await ensureDbSchema()
  const [rows] = await getDbPool().execute<RowDataPacket[]>(
    `SELECT d.ad_id, MAX(d.ad_name) AS ad_name, MAX(d.campaign_name) AS campaign_name,
            DATE_FORMAT(MAX(d.date), '%Y-%m-%d') AS last_date, MAX(c.letter) AS letter
     FROM app_meta_ad_daily d
     LEFT JOIN app_ad_creatives c ON c.ad_id = d.ad_id
     GROUP BY d.ad_id
     ORDER BY last_date DESC, ad_name`
  )
  return rows.map((r) => ({
    adId: String(r.ad_id),
    adName: String(r.ad_name),
    campaignName: String(r.campaign_name),
    lastDate: String(r.last_date),
    letter: r.letter ? String(r.letter) : null,
  }))
}

export async function setCreativeLetter(adId: string, letter: string | null, label: string | null) {
  await ensureDbSchema()
  const pool = getDbPool()
  if (!letter) {
    await pool.execute(`DELETE FROM app_ad_creatives WHERE ad_id = ?`, [adId])
    return
  }
  await pool.execute(
    `INSERT INTO app_ad_creatives (ad_id, letter, label) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE letter = VALUES(letter), label = VALUES(label)`,
    [adId, letter.toUpperCase(), label]
  )
  // La letra queda lista para registrarle sus referencias en el panel.
  await pool.execute(`INSERT IGNORE INTO app_creative_letters (letter, product_codes) VALUES (?, '')`, [letter.toUpperCase()])
}

// ---------------------------------------------------------------------------
// Corridas
// ---------------------------------------------------------------------------
export async function recordRun(ok: boolean, adsSynced: number, alerts: number, message: string | null) {
  await getDbPool().execute(
    // ran_at desde Node: el reloj de MySQL en Hostinger va ~5 h desfasado
    `INSERT INTO app_meta_roas_runs (ran_at, ok, ads_synced, alerts, message) VALUES (?,?,?,?,?)`,
    [new Date(), ok ? 1 : 0, adsSynced, alerts, message]
  )
}

export async function getLastRun(): Promise<{ ranAt: string; ok: boolean; message: string | null } | null> {
  await ensureDbSchema()
  const [rows] = await getDbPool().execute<RowDataPacket[]>(
    `SELECT ran_at, ok, message FROM app_meta_roas_runs ORDER BY id DESC LIMIT 1`
  )
  const r = rows[0]
  return r ? { ranAt: new Date(r.ran_at).toISOString(), ok: Boolean(r.ok), message: r.message ? String(r.message) : null } : null
}

export async function hasAnyAdDays(): Promise<boolean> {
  const [rows] = await getDbPool().execute<RowDataPacket[]>(`SELECT 1 FROM app_meta_ad_daily LIMIT 1`)
  return rows.length > 0
}
