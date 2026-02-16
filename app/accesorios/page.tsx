"use client"

import { useState } from "react"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { useProducts } from "@/hooks/use-products"

const accCategories = [
  { id: "all", label: "Todos" },
  { id: "accesorios", label: "Accesorios" },
  { id: "ropa", label: "Ropa" },
  { id: "kits", label: "Kits" },
]

export default function AccesoriosPage() {
  const { products, loading } = useProducts()
  const [active, setActive] = useState("all")

  const nonAlforjas = products.filter((p) => p.category !== "alforjas")
  const filtered =
    active === "all"
      ? nonAlforjas
      : nonAlforjas.filter((p) => p.category === active)

  return (
    <CartProvider>
      <Navbar />
      <CartSidebar />
      <main>
        {/* Hero */}
        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-primary">
              Complementa tu setup
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Accesorios y Ropa
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed">
              Desde herramientas hasta ropa urbana. Todo lo que necesitas para
              completar tu equipo CERO.UNO con la misma calidad y resistencia de
              nuestras alforjas.
            </p>
          </div>
        </section>

        {/* Filter bar */}
        <section className="sticky top-[73px] z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-3">
              {accCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActive(cat.id)}
                  className={`whitespace-nowrap rounded-sm px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                    active === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Products grid */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            {loading ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">Cargando productos...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted-foreground">
                  No hay productos en esta categoria.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </CartProvider>
  )
}
