import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tienda — Bolsos de Bikepacking y Accesorios CERO.UNO",
  description:
    "Catálogo completo de alforjas, bolsos de manubrio, frame bags y accesorios de ciclismo impermeables. Fabricados 100% en Colombia con materiales de alto gramaje y filtro UV.",
  openGraph: {
    title: "Tienda CERO.UNO | Bolsos de Bikepacking Colombia",
    description:
      "Alforjas impermeables, bolsos de manubrio y accesorios de ciclismo. Alta resistencia, 100% Colombia.",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630 }],
  },
  alternates: {
    canonical: "/tienda",
  },
}

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
