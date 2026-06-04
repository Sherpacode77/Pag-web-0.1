import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { HeroSection } from "@/components/hero-section"
import { BusinessLinesSection } from "@/components/business-lines-section"
import { BestsellersSection } from "@/components/bestsellers-section"
import { VideoSection } from "@/components/video-section"
import { ReviewsSection } from "@/components/reviews-section"
import { BlogSection } from "@/components/blog-section"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "CERO.UNO | Bolsos de Bikepacking y Ciclismo de Aventura",
  description:
    "Equipo impermeable de alto rendimiento para bikepacking y ciclismo urbano. Alforjas, bolsos de manubrio y accesorios. Hecho 100% en Colombia con telas resistentes y filtro UV.",
  openGraph: {
    title: "CERO.UNO | Bolsos de Bikepacking Colombia",
    description:
      "Equipate para tu próxima aventura. Alforjas impermeables, bolsos de manubrio y accesorios de ciclismo. 100% Colombia.",
    images: [{ url: "/images/og-image.jpg", width: 1200, height: 630 }],
  },
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <CartSidebar />
      <main>
        <HeroSection />
        <BusinessLinesSection />
        <BestsellersSection />
        <VideoSection />
        <ReviewsSection />
        <BlogSection />
      </main>
      <Footer />
    </>
  )
}
