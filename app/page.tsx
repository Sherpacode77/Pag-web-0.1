"use client"

import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { HeroSection } from "@/components/hero-section"
import { BestsellersSection } from "@/components/bestsellers-section"
import { CategoriesSection } from "@/components/categories-section"
import { LogisticsSection } from "@/components/logistics-section"
import { BlogSection } from "@/components/blog-section"
import { NewsletterSection } from "@/components/newsletter-section"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <CartProvider>
      <Navbar />
      <CartSidebar />
      <main>
        <HeroSection />
        <BestsellersSection />
        <CategoriesSection />
        <LogisticsSection />
        <BlogSection />
        <NewsletterSection />
      </main>
      <Footer />
    </CartProvider>
  )
}
