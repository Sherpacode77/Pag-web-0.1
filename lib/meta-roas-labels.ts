// Separado de lib/meta-roas.ts para poder usarlo en componentes de cliente
// sin arrastrar el codigo de la base de datos al navegador.

export type ResultType = "conversations" | "landing_page_views" | "link_clicks" | "impressions" | "add_to_cart" | "leads"

export const RESULT_LABELS: Record<ResultType, { singular: string; plural: string; per: string }> = {
  conversations: { singular: "conversación", plural: "conversaciones", per: "por conversación" },
  landing_page_views: { singular: "vista de página", plural: "vistas de página", per: "por vista de página" },
  link_clicks: { singular: "clic", plural: "clics en el enlace", per: "por clic" },
  impressions: { singular: "1.000 impresiones", plural: "impresiones", per: "por 1.000 impresiones" },
  add_to_cart: { singular: "carrito", plural: "agregados al carrito", per: "por carrito" },
  leads: { singular: "cliente potencial", plural: "clientes potenciales", per: "por cliente potencial" },
}
