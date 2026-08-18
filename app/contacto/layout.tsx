import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacto — CERO.UNO",
  description:
    "Comunícate con CERO.UNO. Punto de fábrica y retiro en Carrera 38 # 3-03, Bogotá - Puente Aranda. También puedes escribirnos por WhatsApp al 311 475 5825 o a través del formulario de contacto.",
  openGraph: {
    title: "Contacto | CERO.UNO",
    description:
      "Estamos para ayudarte. Escríbenos, llámanos o visítanos en Bogotá, Colombia.",
  },
  alternates: {
    canonical: "/contacto",
  },
}

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
