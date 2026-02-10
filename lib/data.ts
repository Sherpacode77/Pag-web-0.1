export interface Product {
  id: string
  name: string
  slug: string
  price: number
  originalPrice?: number
  description: string
  shortDescription: string
  image: string
  images: string[]
  category: "alforjas" | "accesorios" | "ropa" | "kits"
  bikePart?: "manubrio" | "sillin" | "marco" | "tubo-superior"
  tags: string[]
  colors?: string[]
  featured: boolean
  bestSeller: boolean
  specs: { label: string; value: string }[]
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content?: string
  image: string
  date: string
  readTime: string
  category: string
}

export interface Review {
  id: string
  name: string
  location: string
  rating: number
  text: string
  product: string
}

export interface CyclingEvent {
  id: string
  name: string
  location: string
  date: string
  distance: string
  description: string
}

// --- PRODUCTS ---

export const products: Product[] = [
  // ALFORJAS
  {
    id: "1",
    name: "SaddleBag 12L",
    slug: "saddlebag-12l",
    price: 180000,
    description:
      "Bolso de sillin de 12 litros, 100% impermeable con cierre roll-top. Fabricado con telas de alto gramaje resistentes al arrastre y filtro UV. Ideal para bikepacking de larga distancia. Sistema de montaje universal compatible con cualquier sillin.",
    shortDescription: "Bolso de sillin impermeable 12L con cierre roll-top",
    image: "/images/products/saddlebag-urban.jpg",
    images: [
      "/images/products/saddlebag-urban.jpg",
      "/images/products/saddlebag-studio.jpg",
      "/images/products/saddlebag-azul.jpg",
      "/images/products/saddlebag-morado.jpg",
      "/images/products/saddlebag-dimensiones.jpg",
      "/images/products/saddlebag-agarres.jpg",
    ],
    category: "alforjas",
    bikePart: "sillin",
    tags: ["impermeable", "roll-top", "sillin", "12L"],
    colors: ["Negro", "Azul", "Morado"],
    featured: true,
    bestSeller: true,
    specs: [
      { label: "Capacidad", value: "12 Litros" },
      { label: "Material", value: "Nylon 420D con recubrimiento TPU" },
      { label: "Impermeabilidad", value: "100% IPX6" },
      { label: "Peso", value: "320g" },
      { label: "Cierre", value: "Roll-top con hebilla" },
    ],
  },
  {
    id: "2",
    name: "FrontBag 4L",
    slug: "frontbag-4l",
    price: 75000,
    description:
      "Bolso de manubrio compacto de 4 litros. Acceso rapido a tus esenciales durante la ruta. Tela impermeable de alto gramaje con proteccion UV. Montaje con correas ajustables.",
    shortDescription: "Bolso de manubrio compacto 4L acceso rapido",
    image: "/images/products/frontbag-lifestyle.jpg",
    images: [
      "/images/products/frontbag-lifestyle.jpg",
      "/images/products/frontbag-4l.jpg",
    ],
    category: "alforjas",
    bikePart: "manubrio",
    tags: ["impermeable", "manubrio", "compacto", "4L"],
    colors: ["Negro"],
    featured: true,
    bestSeller: true,
    specs: [
      { label: "Capacidad", value: "4 Litros" },
      { label: "Material", value: "Nylon 420D con recubrimiento TPU" },
      { label: "Impermeabilidad", value: "100% IPX6" },
      { label: "Peso", value: "180g" },
      { label: "Montaje", value: "Correas ajustables universales" },
    ],
  },
  {
    id: "3",
    name: "FrontBag Roll Top 8L",
    slug: "frontbag-rolltop-8l",
    price: 95000,
    description:
      "Bolso de manubrio roll-top de 8 litros. Capacidad expandible y cierre hermetico. Perfecto para llevar ropa y suministros en rutas largas. Fabricado con telas resistentes al arrastre.",
    shortDescription: "Bolso manubrio roll-top impermeable 8L expandible",
    image: "/images/products/rolltop-lifestyle.jpg",
    images: [
      "/images/products/rolltop-lifestyle.jpg",
      "/images/products/frontbag-rolltop-8l.jpg",
    ],
    category: "alforjas",
    bikePart: "manubrio",
    tags: ["impermeable", "roll-top", "manubrio", "8L"],
    colors: ["Negro", "Verde Oliva"],
    featured: true,
    bestSeller: true,
    specs: [
      { label: "Capacidad", value: "8 Litros (expandible)" },
      { label: "Material", value: "Nylon 420D con recubrimiento TPU" },
      { label: "Impermeabilidad", value: "100% IPX6" },
      { label: "Peso", value: "250g" },
      { label: "Cierre", value: "Roll-top hermetico" },
    ],
  },
  {
    id: "6",
    name: "Frame Bag 5L",
    slug: "frame-bag-5l",
    price: 120000,
    description:
      "Bolso de cuadro triangular de 5 litros. Aprovecha el espacio dentro del triangulo del cuadro. 100% impermeable, ideal para distribuir peso en rutas largas.",
    shortDescription: "Bolso de cuadro triangular impermeable 5L",
    image: "/images/products/frame-bag.jpg",
    images: ["/images/products/frame-bag.jpg"],
    category: "alforjas",
    bikePart: "marco",
    tags: ["impermeable", "cuadro", "triangular", "5L"],
    colors: ["Negro"],
    featured: true,
    bestSeller: false,
    specs: [
      { label: "Capacidad", value: "5 Litros" },
      { label: "Material", value: "Nylon 420D con recubrimiento TPU" },
      { label: "Impermeabilidad", value: "100% IPX6" },
      { label: "Peso", value: "210g" },
      { label: "Compatibilidad", value: "Cuadros talla 52-58cm" },
    ],
  },
  {
    id: "7",
    name: "Top Tube Bag",
    slug: "top-tube-bag",
    price: 55000,
    description:
      "Bolso de tubo superior aerodinamico. Acceso rapido a snacks, telefono y esenciales sin parar. Cierre con cremallera resistente al agua.",
    shortDescription: "Bolso de tubo superior aerodinamico acceso rapido",
    image: "/images/products/top-tube-bag.jpg",
    images: ["/images/products/top-tube-bag.jpg"],
    category: "alforjas",
    bikePart: "tubo-superior",
    tags: ["tubo-superior", "aerodinamico", "acceso-rapido"],
    colors: ["Negro"],
    featured: false,
    bestSeller: false,
    specs: [
      { label: "Capacidad", value: "1 Litro" },
      { label: "Material", value: "Nylon 420D resistente al agua" },
      { label: "Peso", value: "95g" },
      { label: "Cierre", value: "Cremallera YKK resistente al agua" },
    ],
  },
  {
    id: "8",
    name: "Kit Completo Bikepacking",
    slug: "kit-completo-bikepacking",
    price: 420000,
    originalPrice: 515000,
    description:
      "Set completo de bikepacking que incluye SaddleBag 12L, FrontBag Roll Top 8L, Frame Bag 5L y Top Tube Bag. Todo lo que necesitas para tu aventura en un solo paquete con descuento.",
    shortDescription: "Set completo: SaddleBag + FrontBag + FrameBag + TopTube",
    image: "/images/products/saddlebag-studio.jpg",
    images: [
      "/images/products/saddlebag-studio.jpg",
      "/images/products/rolltop-lifestyle.jpg",
      "/images/products/frontbag-lifestyle.jpg",
      "/images/products/frame-bag.jpg",
    ],
    category: "kits",
    tags: ["kit", "completo", "descuento", "bikepacking"],
    colors: ["Negro"],
    featured: true,
    bestSeller: true,
    specs: [
      { label: "Incluye", value: "4 bolsos" },
      { label: "Capacidad Total", value: "26 Litros" },
      { label: "Ahorro", value: "$95.000 COP" },
    ],
  },
  // ACCESORIOS
  {
    id: "5",
    name: "Porta Herramientas",
    slug: "porta-herramientas",
    price: 45000,
    description:
      "Bolso porta herramientas compacto para cuadro de bicicleta. Mantiene tus herramientas organizadas y accesibles. Material impermeable de alta resistencia.",
    shortDescription: "Bolso porta herramientas compacto para cuadro",
    image: "/images/products/porta-herramientas.jpg",
    images: ["/images/products/porta-herramientas.jpg"],
    category: "accesorios",
    tags: ["herramientas", "cuadro", "compacto"],
    colors: ["Negro"],
    featured: true,
    bestSeller: true,
    specs: [
      { label: "Capacidad", value: "0.8 Litros" },
      { label: "Material", value: "Nylon 420D impermeable" },
      { label: "Montaje", value: "Velcro de alta resistencia" },
      { label: "Peso", value: "85g" },
    ],
  },
  {
    id: "9",
    name: "Messenger Bag 15L",
    slug: "messenger-bag-15l",
    price: 135000,
    description:
      "Bolso tipo mensajero de 15 litros para uso urbano. Correa ajustable con sistema antideslizante. Interior con compartimento para laptop hasta 14 pulgadas. 100% impermeable.",
    shortDescription: "Bolso mensajero urbano impermeable 15L con portaPC",
    image: "/images/products/messenger-bag.jpg",
    images: ["/images/products/messenger-bag.jpg"],
    category: "accesorios",
    tags: ["urbano", "mensajero", "laptop", "15L"],
    colors: ["Negro", "Gris Carbon"],
    featured: true,
    bestSeller: false,
    specs: [
      { label: "Capacidad", value: "15 Litros" },
      { label: "Material", value: "Nylon 1000D con TPU" },
      { label: "Laptop", value: "Hasta 14 pulgadas" },
      { label: "Peso", value: "450g" },
      { label: "Cierre", value: "Hebilla magnetica" },
    ],
  },
  {
    id: "10",
    name: "Hip Pack 2L",
    slug: "hip-pack-2l",
    price: 68000,
    description:
      "Canguro deportivo de 2 litros con diseno ergonomico para ciclismo. Compartimento principal con cierre impermeable. Bolsillo trasero para celular con acceso rapido.",
    shortDescription: "Canguro deportivo impermeable 2L ergonomico",
    image: "/images/products/hippack-lifestyle.jpg",
    images: [
      "/images/products/hippack-lifestyle.jpg",
      "/images/products/hip-pack.jpg",
    ],
    category: "accesorios",
    tags: ["canguro", "ergonomico", "deportivo", "2L"],
    colors: ["Negro", "Negro/Naranja"],
    featured: false,
    bestSeller: false,
    specs: [
      { label: "Capacidad", value: "2 Litros" },
      { label: "Material", value: "Nylon 420D impermeable" },
      { label: "Peso", value: "150g" },
      { label: "Cinturon", value: "Ajustable 60-120cm" },
    ],
  },
  {
    id: "11",
    name: "Porta Botellas Stem",
    slug: "porta-botellas-stem",
    price: 38000,
    description:
      "Porta botellas con bolso auxiliar para stem. Permite llevar hidratacion adicional sin perder aerodinamica. Compatible con la mayoria de stems y potencias del mercado.",
    shortDescription: "Porta botellas con bolso para stem de bicicleta",
    image: "/images/products/portabotellas.jpg",
    images: ["/images/products/portabotellas.jpg"],
    category: "accesorios",
    tags: ["hidratacion", "stem", "botellas"],
    colors: ["Negro"],
    featured: false,
    bestSeller: false,
    specs: [
      { label: "Compatibilidad", value: "Botellas hasta 750ml" },
      { label: "Material", value: "Nylon reforzado" },
      { label: "Peso", value: "65g" },
      { label: "Montaje", value: "Correas de velcro" },
    ],
  },
  {
    id: "12",
    name: "Phone Mount Impermeable",
    slug: "phone-mount-impermeable",
    price: 52000,
    description:
      "Soporte para celular 100% impermeable con touchscreen compatible. Montaje en manubrio con sistema de giro de 360 grados. Compatible con celulares de hasta 6.7 pulgadas.",
    shortDescription: "Soporte celular impermeable touchscreen para manubrio",
    image: "/images/products/phone-mount.jpg",
    images: ["/images/products/phone-mount.jpg"],
    category: "accesorios",
    tags: ["celular", "soporte", "manubrio", "touchscreen"],
    colors: ["Negro"],
    featured: true,
    bestSeller: false,
    specs: [
      { label: "Compatibilidad", value: "Hasta 6.7 pulgadas" },
      { label: "Material", value: "TPU + ABS reforzado" },
      { label: "Rotacion", value: "360 grados" },
      { label: "Impermeabilidad", value: "IPX6" },
    ],
  },
  // ROPA
  {
    id: "4",
    name: "Camiseta Oversize CERO.UNO",
    slug: "camiseta-oversize",
    price: 65000,
    description:
      "Camiseta oversize CERO.UNO en algodon premium. Corte relajado ideal para uso urbano y casual despues de la ruta. Estampado con logo de la marca.",
    shortDescription: "Camiseta oversize algodon premium con logo",
    image: "/images/products/camiseta-oversize.jpg",
    images: ["/images/products/camiseta-oversize.jpg"],
    category: "ropa",
    tags: ["camiseta", "oversize", "urbano", "algodon"],
    colors: ["Negro", "Blanco", "Gris"],
    featured: true,
    bestSeller: true,
    specs: [
      { label: "Material", value: "Algodon 100% peinado 180g" },
      { label: "Corte", value: "Oversize / Relaxed fit" },
      { label: "Tallas", value: "S - M - L - XL" },
      { label: "Color", value: "Negro" },
    ],
  },
  {
    id: "13",
    name: "Cycling Cap CERO.UNO",
    slug: "cycling-cap",
    price: 35000,
    description:
      "Gorra de ciclismo clasica con logo bordado CERO.UNO. Tejido transpirable de secado rapido. Visera flexible que se adapta al casco. Ideal para proteccion solar.",
    shortDescription: "Gorra de ciclismo clasica con logo bordado",
    image: "/images/products/cycling-cap.jpg",
    images: ["/images/products/cycling-cap.jpg"],
    category: "ropa",
    tags: ["gorra", "ciclismo", "transpirable"],
    colors: ["Negro", "Negro/Naranja"],
    featured: false,
    bestSeller: false,
    specs: [
      { label: "Material", value: "Poliester transpirable" },
      { label: "Talla", value: "Unica (ajustable)" },
      { label: "Secado", value: "Rapido" },
      { label: "Proteccion", value: "UV 50+" },
    ],
  },
]

// --- REVIEWS ---

export const reviews: Review[] = [
  {
    id: "1",
    name: "Carlos M.",
    location: "Bogota",
    rating: 5,
    text: "El SaddleBag 12L aguanto 3 dias de lluvia en la ruta Bogota-Villavicencio sin filtrar ni una gota. Calidad colombiana de verdad.",
    product: "SaddleBag 12L",
  },
  {
    id: "2",
    name: "Valentina R.",
    location: "Medellin",
    rating: 5,
    text: "Uso el FrontBag 4L para mi commute diario. Es compacto, cabe mi almuerzo y el celular queda accesible. Lo mejor: aguanta los aguaceros paisas.",
    product: "FrontBag 4L",
  },
  {
    id: "3",
    name: "Andres F.",
    location: "Cali",
    rating: 5,
    text: "Compre el kit completo para la Trans-Andes y no me arrepiento. La distribucion del peso es perfecta y todo queda seco.",
    product: "Kit Completo Bikepacking",
  },
  {
    id: "4",
    name: "Laura G.",
    location: "Bucaramanga",
    rating: 5,
    text: "El Frame Bag es exacto para mi cuadro talla 54. Las costuras son impecables y el material se siente muy resistente. Super recomendado.",
    product: "Frame Bag 5L",
  },
  {
    id: "5",
    name: "Miguel A.",
    location: "Pereira",
    rating: 5,
    text: "La logistica de CERO.UNO Travel para el retorno de la Vuelta al Tolima fue impecable. Bus comodo y bicicleta intacta.",
    product: "CERO.UNO Travel",
  },
  {
    id: "6",
    name: "Diana P.",
    location: "Bogota",
    rating: 5,
    text: "Llevo 8 meses usando la camiseta oversize y sigue como nueva. La calidad del algodon es excelente, no se deforma ni descolora.",
    product: "Camiseta Oversize",
  },
]

// --- CYCLING EVENTS ---

export const cyclingEvents: CyclingEvent[] = [
  {
    id: "1",
    name: "Cierre Vial Bogota - Villavicencio",
    location: "Cundinamarca - Meta",
    date: "Enero 2026",
    distance: "120 km",
    description:
      "El evento ciclistico mas grande de Colombia. Acompanamos a mas de 500 ciclistas con servicio de retorno en bus y camion de carga.",
  },
  {
    id: "2",
    name: "Gran Fondo Boyaca",
    location: "Tunja - Villa de Leyva",
    date: "Marzo 2026",
    distance: "85 km",
    description:
      "Ruta por los paisajes boyacenses con ascensos exigentes. Servicio de asistencia mecanica y transporte de regreso.",
  },
  {
    id: "3",
    name: "Vuelta al Tolima",
    location: "Ibague - Armero - Honda",
    date: "Junio 2026",
    distance: "160 km",
    description:
      "Recorrido por el departamento del Tolima con paradas estrategicas. Logistica completa para grupos de 30 a 200 ciclistas.",
  },
  {
    id: "4",
    name: "Trans-Andes Colombia",
    location: "Bogota - Manizales",
    date: "Noviembre 2026",
    distance: "450 km (5 etapas)",
    description:
      "La aventura definitiva de bikepacking por los Andes colombianos. Soporte vehicular, puntos de hidratacion y campamento.",
  },
]

// --- BLOG POSTS ---

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    slug: "guia-empaque-minimalista",
    title: "Guia de empaque minimalista para bikepacking",
    excerpt:
      "Aprende a llevar solo lo esencial para tu aventura en bicicleta sin sacrificar comodidad ni seguridad. Tips de ciclistas experimentados.",
    content:
      "El bikepacking es el arte de llevar lo justo y necesario. En esta guia te ensenamos como optimizar cada gramo de tu equipo para que tu experiencia sea ligera y eficiente. Desde la eleccion de la ropa hasta los kits de supervivencia, cubrimos todo lo que necesitas saber para tu proxima aventura.",
    image: "/images/blog/guia-empaque.jpg",
    date: "2025-12-15",
    readTime: "5 min",
    category: "Guias",
  },
  {
    id: "2",
    slug: "trans-andes-cronica-visual",
    title: "Trans-Andes: Cronica Visual",
    excerpt:
      "1.200km de desnivel, lluvia y paisajes inolvidables. Revive nuestra ultima expedicion por los Andes colombianos.",
    content:
      "Cinco dias, tres departamentos y un sinfin de historias. La Trans-Andes 2025 fue nuestra expedicion mas ambiciosa hasta la fecha. Con un equipo de 12 ciclistas y soporte vehicular completo, cruzamos los Andes desde Bogota hasta Manizales, enfrentando paramos a 3.800m, descensos tecnicos y la hospitalidad de los pueblos cafeteros.",
    image: "/images/blog/trans-andes.jpg",
    date: "2025-11-28",
    readTime: "8 min",
    category: "Expediciones",
  },
  {
    id: "3",
    slug: "mantenimiento-en-ruta",
    title: "Mantenimiento de equipo impermeable en ruta",
    excerpt:
      "Consejos rapidos para cuidar tu equipo impermeable y extender su vida util bajo el sol y lluvia colombiana.",
    content:
      "Tus bolsos impermeables estan disenados para resistir las condiciones mas duras, pero un buen mantenimiento puede duplicar su vida util. Te compartimos las mejores practicas para limpiar, secar y almacenar tu equipo CERO.UNO despues de cada salida.",
    image: "/images/blog/mantenimiento.jpg",
    date: "2025-11-10",
    readTime: "4 min",
    category: "Tips",
  },
]

// --- CATEGORIES ---

export const categories = [
  { id: "all", label: "Todos" },
  { id: "alforjas", label: "Alforjas" },
  { id: "accesorios", label: "Accesorios" },
  { id: "ropa", label: "Ropa" },
  { id: "kits", label: "Kits" },
]

export const bikePartFilters = [
  { id: "all", label: "Todas las partes" },
  { id: "manubrio", label: "Manubrio" },
  { id: "sillin", label: "Sillin" },
  { id: "marco", label: "Marco" },
  { id: "tubo-superior", label: "Tubo Superior" },
]

// --- UTILITIES ---

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}
