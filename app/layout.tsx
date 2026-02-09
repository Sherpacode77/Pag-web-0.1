import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"

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
  title: "CERO.UNO | Bolsos de Bikepacking y Ciclismo de Aventura",
  description:
    "Equipo impermeable de alto rendimiento para bikepacking y ciclismo urbano. Hecho 100% en Colombia. Telas resistentes con filtro UV.",
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
    <html lang="es">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
