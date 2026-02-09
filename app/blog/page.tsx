"use client"

import Image from "next/image"
import Link from "next/link"
import { Clock, ArrowRight } from "lucide-react"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { NewsletterSection } from "@/components/newsletter-section"
import { blogPosts } from "@/lib/data"

function BlogContent() {
  const featured = blogPosts[0]
  const rest = blogPosts.slice(1)

  return (
    <>
      <Navbar />
      <CartSidebar />
      <main className="min-h-screen">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
              Historias, rutas y consejos
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl">
              {"Journal & Rutas"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-lg leading-relaxed">
              Cronicas de aventura, guias de empaque, mantenimiento de equipo y
              las mejores rutas de bikepacking en Colombia.
            </p>
          </div>
        </div>

        {/* Featured post */}
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
              <Image
                src={featured.image || "/placeholder.svg"}
                alt={featured.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {featured.category}
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-3">
                Articulo Destacado
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors md:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {featured.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{featured.readTime} lectura</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span>
                  {new Date(featured.date).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="mt-6">
                <span className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary">
                  Leer Articulo
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* More posts */}
        <div className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
            <h3 className="text-lg font-bold uppercase tracking-wider text-foreground mb-8">
              Mas Articulos
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                    <Image
                      src={post.image || "/placeholder.svg"}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <span className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 text-xs font-bold uppercase tracking-wider">
                      {post.category}
                    </span>
                  </div>
                  <div className="pt-4">
                    <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-wider">
                      {post.title}
                    </h4>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{post.readTime} lectura</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                      <span>
                        {new Date(post.date).toLocaleDateString("es-CO", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <NewsletterSection />
      </main>
      <Footer />
    </>
  )
}

export default function BlogPage() {
  return (
    <CartProvider>
      <BlogContent />
    </CartProvider>
  )
}
