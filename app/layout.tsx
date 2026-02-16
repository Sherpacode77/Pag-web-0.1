import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { OrganizationSchema } from "@/components/product-schema"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cero.uno'), // Cambiar por tu dominio real
  title: {
    default: "CERO.UNO | Bolsos de Bikepacking y Ciclismo de Aventura",
    template: "%s | CERO.UNO"
  },
  description:
    "Equipo impermeable de alto rendimiento para bikepacking y ciclismo urbano. Hecho 100% en Colombia. Telas resistentes con filtro UV.",
  keywords: [
    "bikepacking",
    "alforjas",
    "bolsos bicicleta",
    "ciclismo colombia",
    "impermeables",
    "frame bag",
    "saddlebag",
    "accesorios ciclismo",
    "bikepacking colombia",
    "touring"
  ],
  authors: [{ name: "CERO.UNO" }],
  creator: "CERO.UNO",
  publisher: "CERO.UNO",
  
  // Open Graph (Facebook, WhatsApp, LinkedIn)
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://www.cero.uno",
    siteName: "CERO.UNO",
    title: "CERO.UNO | Bolsos de Bikepacking y Ciclismo de Aventura",
    description:
      "Equipo impermeable de alto rendimiento para bikepacking y ciclismo urbano. Hecho 100% en Colombia. Telas resistentes con filtro UV.",
    images: [
      {
        url: "/images/og-image.jpg", // Crear esta imagen (1200x630px)
        width: 1200,
        height: 630,
        alt: "CERO.UNO - Bolsos de Bikepacking Colombia",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "CERO.UNO | Bolsos de Bikepacking y Ciclismo de Aventura",
    description:
      "Equipo impermeable de alto rendimiento para bikepacking y ciclismo urbano. Hecho 100% en Colombia.",
    images: ["/images/og-image.jpg"],
    creator: "@cerouno", // Cambiar por tu usuario de Twitter
  },
  
  // Verificación de propiedad (agregar cuando tengas las cuentas)
  // verification: {
  //   google: "tu-codigo-de-verificacion",
  //   yandex: "tu-codigo-yandex",
  // },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <OrganizationSchema />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        {children}
        <WhatsAppButton />
      </body>
    </html>
  )
}
