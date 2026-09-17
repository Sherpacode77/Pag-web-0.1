export const FREE_SHIPPING_THRESHOLD = 200000

// Tarifas por zona. La "sabana" (Bogotá y municipios aledaños de la planicie
// cundiboyacense) se cubre con transporte propio/local, por eso es más barata
// que el resto del país, que va por transportadora nacional.
export const SHIPPING_COST_SABANA = 9000
export const SHIPPING_COST_NACIONAL = 12500

// Recargo fijo por pagar al recibir: cubre el costo que cobra la transportadora
// por recaudar el dinero y devolverlo, más el riesgo de pedidos rechazados.
export const CASH_ON_DELIVERY_SURCHARGE = 5000

export type PaymentMethod = "mercadopago" | "contraentrega"
export type DeliveryMethod = "envio" | "retiro"
export type ShippingZone = "sabana" | "nacional"

// Bogotá + municipios de la sabana y planicie con influencia directa.
export const SABANA_CITIES = [
  "Bogotá",
  "Chía",
  "Zipaquirá",
  "Cajicá",
  "Sopó",
  "Tocancipá",
  "Cota",
  "Tabio",
  "Tenjo",
  "Facatativá",
  "Funza",
  "Madrid",
  "Mosquera",
  "El Rosal",
  "Subachoque",
  "Soacha",
  "Sibaté",
  "La Calera",
  "Guasca",
]

// Se compara sin tildes ni mayúsculas porque la ciudad puede llegar escrita a
// mano desde el formulario o desde el listado oficial de municipios, y ambas
// grafías ("Facatativá" / "facatativa") deben resolver a la misma zona.
function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
}

const SABANA_CITY_KEYS = new Set(SABANA_CITIES.map(normalizeCity))

export function getShippingZone(city?: string | null): ShippingZone {
  if (!city) return "nacional"
  return SABANA_CITY_KEYS.has(normalizeCity(city)) ? "sabana" : "nacional"
}

export function getShippingRate(city?: string | null): number {
  return getShippingZone(city) === "sabana" ? SHIPPING_COST_SABANA : SHIPPING_COST_NACIONAL
}

export const PICKUP_LOCATION = {
  address: "Carrera 38 # 3-03, Bogotá - Puente Aranda",
  mapsUrl: "https://maps.app.goo.gl/zvKC2qN7cVhxiyTu6",
  // Embed sin necesidad de API key — busca la dirección como texto.
  embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(
    "Carrera 38 # 3-03, Bogotá, Puente Aranda, Colombia"
  )}&output=embed`,
  hours: "Lunes a sábado de 8 am a 6 pm",
  note: "Atendemos a puerta cerrada — confirma tu visita antes de pasar.",
}

export function calculateShippingCost(
  subtotal: number,
  deliveryMethod: DeliveryMethod = "envio",
  freeShippingOverride = false,
  city?: string | null
): number {
  if (deliveryMethod === "retiro") return 0
  if (freeShippingOverride) return 0
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0
  return getShippingRate(city)
}

// El recargo es por el método de pago, no por el monto: se cobra aunque el
// envío haya quedado gratis por superar el umbral. La excepción es el retiro
// en tienda: ahí no hay transportadora recaudando el efectivo, así que pagar
// al recibir no cuesta nada extra.
export function calculateCodSurcharge(
  paymentMethod: PaymentMethod = "mercadopago",
  deliveryMethod: DeliveryMethod = "envio"
): number {
  if (deliveryMethod === "retiro") return 0
  return paymentMethod === "contraentrega" ? CASH_ON_DELIVERY_SURCHARGE : 0
}
