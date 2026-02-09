"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { products, categories } from "@/lib/data"

function StoreContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") || "all"
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState("featured")

  const filteredProducts = useMemo(() => {
    let filtered =
      activeCategory === "all"
        ? products
        : products.filter((p) => p.category === activeCategory)

    switch (sortBy) {
      case "price-asc":
        filtered = [...filtered].sort((a, b) => a.price - b.price)
        break
      case "price-desc":
        filtered = [...filtered].sort((a, b) => b.price - a.price)
        break
      case "name":
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        filtered = [...filtered].sort(
          (a, b) => Number(b.featured) - Number(a.featured)
        )
    }

    return filtered
  }, [activeCategory, sortBy])

  return (
    <>
      <Navbar />
      <CartSidebar />
      <main className="min-h-screen">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
              Coleccion completa
            </p>
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl">
              Tienda
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-lg leading-relaxed">
              Equipo impermeable de alto rendimiento para bikepacking y ciclismo
              urbano. Cada producto esta disenado para resistir las condiciones
              mas exigentes.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
              {/* Category tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`whitespace-nowrap px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-background border border-input px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase tracking-wider"
                >
                  <option value="featured">Destacados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="name">Nombre A-Z</option>
                </select>
                <span className="text-xs text-muted-foreground">
                  {filteredProducts.length} productos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-muted-foreground">
                No hay productos en esta categoria por el momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function TiendaPage() {
  return (
    <CartProvider>
      <StoreContent />
    </CartProvider>
  )
}
