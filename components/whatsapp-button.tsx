"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getWhatsAppReferralCode } from "@/lib/whatsapp-attribution"

const WHATSAPP_NUMBER = "573114515672"

// Etiqueta legible por sección, para que el mensaje que llega a WhatsApp diga
// de dónde salió el cliente. Sin esto todos los chats del sitio llegan como
// "¡Hola! Quiero más información" y no hay forma de saber qué estaba mirando.
const SECTION_LABELS: Record<string, string> = {
  "/": "la página de inicio",
  "/tienda": "la tienda",
  "/ofertas": "la sección de ofertas",
  "/travel": "la sección Travel",
  "/nosotros": "la página Nosotros",
  "/contacto": "la página de contacto",
  "/blog": "el blog",
}

// Solo a partir de la ruta: se ejecuta igual en el servidor y en el cliente, sin
// tocar document ni localStorage. Es lo que garantiza que el enlace ya salga con
// contexto en el primer HTML — si esto dependiera de un efecto, quien toca el
// botón antes de que hidrate React manda el mensaje generico y se pierde la
// atribución (fue exactamente el bug de los chats sin origen).
function buildBaseMessage(pathname: string): string {
  let where: string
  if (pathname.startsWith("/tienda/")) {
    const slug = pathname.slice("/tienda/".length).replace(/\/$/, "")
    where = slug ? `el producto ${slug.replace(/-/g, " ")}` : "una ficha de producto"
  } else if (pathname.startsWith("/blog/")) {
    where = "un artículo del blog"
  } else {
    where = SECTION_LABELS[pathname] ?? `la página ${pathname}`
  }
  return `¡Hola! Quiero más información sobre ${where}`
}

export function WhatsAppButton() {
  const pathname = usePathname() || "/"
  const base = buildBaseMessage(pathname)

  // Mejora opcional que sí necesita el navegador: el nombre real del producto
  // (el <h1>, mejor que el slug) y el código de referido guardado. Se recuerda
  // junto a su ruta para no arrastrar el mensaje de la página anterior al
  // navegar.
  const [extra, setExtra] = useState<{ path: string; text: string } | null>(null)

  useEffect(() => {
    const heading = pathname.startsWith("/tienda/")
      ? document.querySelector("h1")?.textContent?.trim()
      : undefined
    const referralCode = getWhatsAppReferralCode()

    if (!heading && !referralCode) {
      setExtra(null)
      return
    }

    let text = heading ? `¡Hola! Quiero más información sobre el producto ${heading}` : base
    if (referralCode) text += ` (código: ${referralCode})`
    setExtra({ path: pathname, text })
  }, [pathname, base])

  const message = extra && extra.path === pathname ? extra.text : base
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

  return (
    <Link
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
      aria-label="Contactar por WhatsApp"
      title={`Contactarnos por WhatsApp: +${WHATSAPP_NUMBER}`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </Link>
  )
}
