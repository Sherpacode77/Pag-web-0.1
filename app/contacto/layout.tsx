import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contacto — CERO.UNO",
  description:
    "Comunícate con CERO.UNO. Tienda ubicada en Calle 3 No 38-03. También puedes escribirnos por WhatsApp al 316 762 1692 o a través del formulario de contacto.",
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
