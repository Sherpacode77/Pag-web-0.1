import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "CERO.UNO Travel — Rutas y Eventos de Ciclismo",
  description:
    "Descubre los mejores eventos, travesías y rutas de ciclismo de aventura con CERO.UNO. Únete a la comunidad de bikepackers colombianos.",
  openGraph: {
    title: "CERO.UNO Travel | Rutas de Bikepacking",
    description:
      "Eventos, travesías y rutas de ciclismo de aventura. Únete a la comunidad CERO.UNO.",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630 }],
  },
  alternates: {
    canonical: "/travel",
  },
}

export default function TravelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
