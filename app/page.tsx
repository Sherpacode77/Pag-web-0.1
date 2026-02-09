"use client"

import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { HeroSection } from "@/components/hero-section"
import { BusinessLinesSection } from "@/components/business-lines-section"
import { BestsellersSection } from "@/components/bestsellers-section"
import { VideoSection } from "@/components/video-section"
import { ReviewsSection } from "@/components/reviews-section"
import { BlogSection } from "@/components/blog-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <CartProvider>
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
    </CartProvider>
  )
}
