export const FREE_SHIPPING_THRESHOLD = 200000
export const FLAT_SHIPPING_COST = 10000

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
  deliveryMethod: "envio" | "retiro" = "envio"
): number {
  if (deliveryMethod === "retiro") return 0
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST
}
