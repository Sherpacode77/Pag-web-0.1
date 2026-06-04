import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Alforjas — Bolsos para Bikepacking CERO.UNO",
  description:
    "Alforjas impermeables para bikepacking: SaddleBag, FrontBag, FrameBag y TopTube. Diseñadas para ciclismo de aventura con materiales de alto gramaje y resistencia al arrastre.",
  openGraph: {
    title: "Alforjas de Bikepacking | CERO.UNO Colombia",
    description:
      "SaddleBag 12L, FrontBag 4L, FrontBag Roll Top 8L y más. Alforjas impermeables para tu bicicleta.",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630 }],
  },
  alternates: {
    canonical: "/alforjas",
  },
}

export default function AlforjasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
