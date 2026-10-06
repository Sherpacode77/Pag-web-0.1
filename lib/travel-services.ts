import type { Product } from "@/lib/data"

function formatCop(value: number): string {
  return "$" + value.toLocaleString("es-CO")
}

// Los servicios de CERO.UNO Travel se venden por el mismo carrito que los
// productos fisicos, pero no existen en la base de datos de productos: cada
// combinacion de vehiculo + trayecto + bicicleta se arma aqui como un Product
// sintetico con su propio id y precio. El prefijo del id es lo que permite
// reconocerlos despues en el checkout (no se despachan ni pagan envio).
export const TRAVEL_SERVICE_ID_PREFIX = "travel-"

export function isTravelServiceId(productId: string): boolean {
  return productId.startsWith(TRAVEL_SERVICE_ID_PREFIX)
}

export type TravelRouteKey = "ida" | "regreso" | "ida-vuelta"
export type TravelBikeKey = "con-bici" | "sin-bici"

export type TravelRoute = {
  key: TravelRouteKey
  label: string
  short: string
  detail: string
}

export type TravelBikeOption = {
  key: TravelBikeKey
  label: string
  detail: string
}

export const TRAVEL_ROUTES: TravelRoute[] = [
  {
    key: "ida",
    label: "Bogotá → Cali",
    short: "Solo ida",
    detail: "Salida de Bogotá el viernes 30 de octubre en la noche.",
  },
  {
    key: "regreso",
    label: "Cali → Bogotá",
    short: "Solo regreso",
    detail: "Regreso desde Cali el lunes 2 de noviembre.",
  },
  {
    key: "ida-vuelta",
    label: "Bogotá → Cali → Bogotá",
    short: "Ida y regreso",
    detail: "Los dos trayectos en un solo cupo, al mejor precio.",
  },
]

export const TRAVEL_BIKE_OPTIONS: TravelBikeOption[] = [
  { key: "con-bici", label: "Con bicicleta", detail: "Incluye el cupo para tu bici." },
  { key: "sin-bici", label: "Sin bicicleta", detail: "Solo pasajero." },
]

// Listas de abordaje: un cupo de ida y regreso ocupa un puesto en DOS listas.
export type TravelListKey = "ida-bus" | "ida-van" | "regreso-bus" | "regreso-van"

export const TRAVEL_LISTS: { key: TravelListKey; label: string; sheet: string; capacity: number }[] = [
  { key: "ida-bus", label: "Ida · Bus", sheet: "Ida Bus", capacity: 40 },
  { key: "ida-van", label: "Ida · Van", sheet: "Ida Van", capacity: 12 },
  { key: "regreso-bus", label: "Regreso · Bus", sheet: "Regreso Bus", capacity: 40 },
  { key: "regreso-van", label: "Regreso · Van", sheet: "Regreso Van", capacity: 12 },
]

export function getListCapacity(list: TravelListKey): number {
  return TRAVEL_LISTS.find((l) => l.key === list)!.capacity
}

export function getListsForRoute(vehicle: string, route: TravelRouteKey): TravelListKey[] {
  const v = vehicle === "bus" ? "bus" : "van"
  if (route === "ida") return [`ida-${v}` as TravelListKey]
  if (route === "regreso") return [`regreso-${v}` as TravelListKey]
  return [`ida-${v}` as TravelListKey, `regreso-${v}` as TravelListKey]
}

// SKU legible para el panel y para cruzar con las listas de abordaje.
export function buildTravelSku(vehicleKey: string, route: TravelRouteKey, bike: TravelBikeKey): string {
  const r = route === "ida" ? "IDA" : route === "regreso" ? "REG" : "IDAREG"
  const b = bike === "con-bici" ? "CB" : "SB"
  return `TRV-GDR-${vehicleKey.toUpperCase()}-${r}-${b}`
}

export type TravelService = {
  key: string
  name: string
  vehicle: string
  tagline: string
  description: string
  image: string
  highlights: string[]
  // La cobertura cambia segun como viaja la bicicleta en cada vehiculo, y es
  // una promesa comercial: tiene que verse antes de comprar, no despues.
  warranty: { covers: string; excludes?: string; why: string }
  prices: Record<TravelRouteKey, Record<TravelBikeKey, number>>
}

export const GIRO_DE_RIGO_SERVICES: TravelService[] = [
  {
    key: "bus",
    name: "Cupo en BUS",
    vehicle: "Bus último modelo · 40 pasajeros",
    tagline: "La opción más económica, con bodegas amplias para las bicicletas.",
    description:
      "Viajas en un bus último modelo de 40 pasajeros. Las bicicletas viajan sin ruedas en las bodegas del bus: nuestro equipo las desmonta, las acomoda y las asegura para todo el trayecto, y te ayuda a montarlas de nuevo al llegar.",
    image: "/images/travel-bus-cerouno.jpg",
    highlights: [
      "Bus último modelo de 40 pasajeros",
      "Bodegas amplias para acomodar todas las bicicletas",
      "La bicicleta viaja sin ruedas: las desmontamos y las acomodamos aparte",
      "Asistencia mecánica: desmontamos y volvemos a montar tus ruedas",
    ],
    warranty: {
      covers: "Defectos funcionales ocasionados durante el transporte.",
      excludes: "No cubre afectaciones de pintura.",
      why: "La bicicleta viaja sin ruedas y en bodega compartida con las demás.",
    },
    prices: {
      ida: { "con-bici": 140000, "sin-bici": 100000 },
      regreso: { "con-bici": 140000, "sin-bici": 100000 },
      "ida-vuelta": { "con-bici": 270000, "sin-bici": 190000 },
    },
  },
  {
    key: "van",
    name: "Cupo en VAN",
    vehicle: "Van con soportes especializados",
    tagline: "Grupo pequeño y soportes diseñados para transportar bicicletas.",
    description:
      "Viajas en van con soportes especializados para bicicleta: cada bici va completa y anclada en su propio soporte, sin desmontar nada y sin contacto entre marcos. Grupo reducido y trato cercano durante todo el trayecto.",
    image: "/images/travel-van-cerouno.jpg",
    highlights: [
      "Soportes especializados: una bicicleta por soporte, sin roces entre marcos",
      "Tu bicicleta viaja completa: no se desmontan las ruedas",
      "Grupo reducido y salida más ágil",
      "Asistencia mecánica durante el viaje",
    ],
    warranty: {
      covers: "Cualquier defecto funcional y también las afectaciones de pintura ocasionadas durante el transporte.",
      why: "Cada bicicleta va completa y anclada en su propio soporte, sin contacto con las demás.",
    },
    prices: {
      ida: { "con-bici": 200000, "sin-bici": 150000 },
      regreso: { "con-bici": 200000, "sin-bici": 150000 },
      "ida-vuelta": { "con-bici": 480000, "sin-bici": 370000 },
    },
  },
]

export const GIRO_DE_RIGO_EVENT = {
  name: "Giro de Rigo 2026",
  edition: "Edición La Sucursal · Cali",
  banner: "/images/event-giro-de-rigo-banner.png",
  departure: "Viernes 30 de octubre de 2026, en la noche",
  returnTrip: "Lunes 2 de noviembre de 2026",
}

// El cupo se aparta con la mitad del valor; la otra mitad se paga al equipo
// logistico al tomar el transporte. Lo que cobra el checkout es el abono.
export const TRAVEL_DEPOSIT_RATE = 0.5

export function getTravelServiceDeposit(
  service: TravelService,
  route: TravelRouteKey,
  bike: TravelBikeKey
): number {
  return Math.round(getTravelServicePrice(service, route, bike) * TRAVEL_DEPOSIT_RATE)
}

export function getTravelServiceBalance(
  service: TravelService,
  route: TravelRouteKey,
  bike: TravelBikeKey
): number {
  return getTravelServicePrice(service, route, bike) - getTravelServiceDeposit(service, route, bike)
}

export const TRAVEL_POLICIES = {
  deposit:
    "Apartas tu cupo con un abono del 50% del valor del servicio. El 50% restante lo pagas directamente al equipo logístico de CERO.UNO Bikes al momento de tomar el transporte.",
  cancellation: [
    "Cancelación con 48 horas o más de anticipación: no se cobran cargos adicionales.",
    "Cancelación con menos de 48 horas de anticipación: se pierde el abono y no se cobran sobrecostos adicionales.",
  ],
  transfer: [
    "Puedes ceder tu cupo a otra persona sin costo, siempre que el cambio se haga con más de 48 horas de anticipación.",
    "El cambio de nombre con menos de 48 horas de anticipación tiene un costo de $15.000 por pasajero.",
  ],
}

export function getTravelServicePrice(
  service: TravelService,
  route: TravelRouteKey,
  bike: TravelBikeKey
): number {
  return service.prices[route][bike]
}

// El carrito y el pedido identifican cada linea por product.id, asi que la
// combinacion elegida tiene que ir dentro del id: dos cupos distintos del mismo
// servicio nunca deben fusionarse en una sola linea.
export function buildTravelServiceProduct(
  service: TravelService,
  route: TravelRouteKey,
  bike: TravelBikeKey
): Product {
  const routeInfo = TRAVEL_ROUTES.find((r) => r.key === route)!
  const bikeInfo = TRAVEL_BIKE_OPTIONS.find((b) => b.key === bike)!
  const total = getTravelServicePrice(service, route, bike)
  const deposit = getTravelServiceDeposit(service, route, bike)
  const balance = total - deposit

  return {
    id: `${TRAVEL_SERVICE_ID_PREFIX}giro-de-rigo-${service.key}-${route}-${bike}`,
    sku: buildTravelSku(service.key, route, bike),
    // El nombre lleva "abono 50%" porque es lo que se cobra: sin eso, el carrito,
    // el correo y el pedido mostrarian la mitad del valor sin explicacion.
    name: `${service.name} · Giro de Rigo 2026 (abono 50%)`,
    slug: "travel",
    price: deposit,
    description: `${service.description} Trayecto ${routeInfo.label}. ${bikeInfo.label}. Valor total del servicio ${formatCop(total)}: abonas ${formatCop(deposit)} para apartar el cupo y pagas ${formatCop(balance)} al equipo logístico al tomar el transporte.`,
    shortDescription: `${routeInfo.label} · ${bikeInfo.label} · abono 50%`,
    image: service.image,
    images: [service.image],
    category: "servicios",
    tags: ["travel", "giro-de-rigo", service.key],
    featured: false,
    bestSeller: false,
    specs: [
      { label: "Evento", value: GIRO_DE_RIGO_EVENT.name },
      { label: "Vehículo", value: service.vehicle },
      { label: "Trayecto", value: routeInfo.label },
      { label: "Bicicleta", value: bikeInfo.label },
      { label: "Valor total del servicio", value: formatCop(total) },
      { label: "Abono para apartar (50%)", value: formatCop(deposit) },
      { label: "Saldo al tomar el transporte", value: formatCop(balance) },
    ],
  }
}

export type TravelCartVariant = {
  variantColor: string
  variantColorName: string
  variantSize: string
  variantSizeName: string
}

// Se reutilizan los campos de variante del carrito para que el trayecto y la
// bicicleta se vean en el carrito, el resumen del pedido y el correo, que ya
// muestran "color / talla / diseño" concatenados.
export function buildTravelServiceVariant(
  route: TravelRouteKey,
  bike: TravelBikeKey
): TravelCartVariant {
  const routeInfo = TRAVEL_ROUTES.find((r) => r.key === route)!
  const bikeInfo = TRAVEL_BIKE_OPTIONS.find((b) => b.key === bike)!
  return {
    variantColor: route,
    variantColorName: routeInfo.label,
    variantSize: bike,
    variantSizeName: bikeInfo.label,
  }
}
