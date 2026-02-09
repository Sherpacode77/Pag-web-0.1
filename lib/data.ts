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
  category: string
  tags: string[]
  featured: boolean
  bestSeller: boolean
  specs: { label: string; value: string }[]
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  image: string
  date: string
  readTime: string
  category: string
}

export const products: Product[] = [
  {
    id: "1",
    name: "SaddleBag 12L",
    slug: "saddlebag-12l",
    price: 180000,
    description:
      "Bolso de sillin de 12 litros, 100% impermeable con cierre roll-top. Fabricado con telas de alto gramaje resistentes al arrastre y filtro UV. Ideal para bikepacking de larga distancia. Sistema de montaje universal compatible con cualquier sillin.",
    shortDescription: "Bolso de sillin impermeable 12L con cierre roll-top",
    image: "/images/products/saddlebag-12l.jpg",
    images: ["/images/products/saddlebag-12l.jpg"],
    category: "bikepacking",
    tags: ["impermeable", "roll-top", "sillin", "12L"],
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
    image: "/images/products/frontbag-4l.jpg",
    images: ["/images/products/frontbag-4l.jpg"],
    category: "bikepacking",
    tags: ["impermeable", "manubrio", "compacto", "4L"],
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
    image: "/images/products/frontbag-rolltop-8l.jpg",
    images: ["/images/products/frontbag-rolltop-8l.jpg"],
    category: "bikepacking",
    tags: ["impermeable", "roll-top", "manubrio", "8L"],
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
    id: "4",
    name: "Camiseta Oversize",
    slug: "camiseta-oversize",
    price: 65000,
    description:
      "Camiseta oversize CERO.UNO en algodon premium. Corte relajado ideal para uso urbano y casual despues de la ruta. Estampado con logo de la marca.",
    shortDescription: "Camiseta oversize algodon premium con logo",
    image: "/images/products/camiseta-oversize.jpg",
    images: ["/images/products/camiseta-oversize.jpg"],
    category: "ropa",
    tags: ["camiseta", "oversize", "urbano", "algodon"],
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
    id: "6",
    name: "Frame Bag 5L",
    slug: "frame-bag-5l",
    price: 120000,
    description:
      "Bolso de cuadro triangular de 5 litros. Aprovecha el espacio dentro del triangulo del cuadro. 100% impermeable, ideal para distribuir peso en rutas largas.",
    shortDescription: "Bolso de cuadro triangular impermeable 5L",
    image: "/images/products/frame-bag.jpg",
    images: ["/images/products/frame-bag.jpg"],
    category: "bikepacking",
    tags: ["impermeable", "cuadro", "triangular", "5L"],
    featured: false,
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
    category: "bikepacking",
    tags: ["tubo-superior", "aerodinamico", "acceso-rapido"],
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
    image: "/images/products/saddlebag-12l.jpg",
    images: [
      "/images/products/saddlebag-12l.jpg",
      "/images/products/frontbag-rolltop-8l.jpg",
      "/images/products/frame-bag.jpg",
      "/images/products/top-tube-bag.jpg",
    ],
    category: "kits",
    tags: ["kit", "completo", "descuento", "bikepacking"],
    featured: true,
    bestSeller: false,
    specs: [
      { label: "Incluye", value: "4 bolsos" },
      { label: "Capacidad Total", value: "26 Litros" },
      { label: "Ahorro", value: "$95.000 COP" },
    ],
  },
]

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    slug: "guia-empaque-minimalista",
    title: "Guia de empaque minimalista",
    excerpt:
      "Aprende a llevar solo lo esencial para tu commute diario sin sacrificar comodidad ni estilo.",
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
    image: "/images/blog/trans-andes.jpg",
    date: "2025-11-28",
    readTime: "8 min",
    category: "Expediciones",
  },
  {
    id: "3",
    slug: "mantenimiento-en-ruta",
    title: "Mantenimiento en ruta",
    excerpt:
      "Consejos rapidos para cuidar tu equipo impermeable y extender su vida util bajo el sol y lluvia colombiana.",
    image: "/images/blog/mantenimiento.jpg",
    date: "2025-11-10",
    readTime: "4 min",
    category: "Tips",
  },
]

export const categories = [
  { id: "all", label: "Todos" },
  { id: "bikepacking", label: "Bikepacking" },
  { id: "accesorios", label: "Accesorios" },
  { id: "ropa", label: "Ropa" },
  { id: "kits", label: "Kits" },
]

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}
