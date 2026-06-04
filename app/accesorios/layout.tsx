import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Accesorios y Ropa — CERO.UNO",
  description:
    "Accesorios de ciclismo y ropa CERO.UNO: porta herramientas, hip packs, soportes para celular, camisetas y gorras. Complementa tu setup de bikepacking.",
  openGraph: {
    title: "Accesorios de Ciclismo | CERO.UNO Colombia",
    description:
      "Porta herramientas, canguros, soportes para celular, camisetas y más. Completa tu equipo CERO.UNO.",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630 }],
  },
  alternates: {
    canonical: "/accesorios",
  },
}

export default function AccesoriosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
