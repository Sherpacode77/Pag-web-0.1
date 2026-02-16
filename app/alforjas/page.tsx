"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { useProducts } from "@/hooks/use-products"
import { bikePartFilters } from "@/lib/data"

const bikeParts = [
  {
    id: "manubrio",
    label: "Manubrio",
    y: 30,
    x: 18,
  },
  {
    id: "tubo-superior",
    label: "Tubo Superior",
    y: 38,
    x: 42,
  },
  {
    id: "marco",
    label: "Marco",
    y: 55,
    x: 38,
  },
  {
    id: "sillin",
    label: "Sillin",
    y: 28,
    x: 68,
  },
]

export default function AlforjasPage() {
  const { products, loading } = useProducts()
  const [activePart, setActivePart] = useState<string>("all")

  const alforjas = products.filter((p) => p.category === "alforjas")
  const filtered =
    activePart === "all"
      ? alforjas
      : alforjas.filter((p) => p.bikePart === activePart)

  return (
    <CartProvider>
      <Navbar />
      <CartSidebar />
      <main>
        {/* Hero */}
        <section className="border-b border-border py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-primary">
                  Equipo para bikepacking
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl text-balance">
                  Alforjas impermeables para cada parte de tu bici
                </h1>
                <p className="mt-4 max-w-lg text-base text-muted-foreground leading-relaxed">
                  Selecciona la parte de tu bicicleta y descubre los bolsos que
                  tenemos para ti. Todos 100% impermeables, fabricados con telas
                  de alto gramaje y filtro UV.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Image
                    src="/images/impermeable1.png"
                    alt="100% Impermeable"
                    width={64}
                    height={64}
                    className="h-14 w-auto"
                  />
                  <Image
                    src="/images/altogramaje1.png"
                    alt="Alto Gramaje con Filtro UV"
                    width={64}
                    height={64}
                    className="h-14 w-auto"
                  />
                  <Image
                    src="/images/100colombiano1.png"
                    alt="100% Hecho en Colombia"
                    width={64}
                    height={64}
                    className="h-14 w-auto"
                  />
                </div>
              </div>

              {/* Interactive bike diagram */}
              <div className="relative mx-auto aspect-square w-full max-w-md">
                <Image
                  src="/images/category-setup.jpg"
                  alt="Bicicleta de bikepacking completamente equipada"
                  fill
                  className="rounded-sm object-cover opacity-40"
                />
                {/* Interactive hotspots */}
                {bikeParts.map((part) => (
                  <button
                    type="button"
                    key={part.id}
                    onClick={() =>
                      setActivePart(activePart === part.id ? "all" : part.id)
                    }
                    className={`absolute z-10 flex flex-col items-center transition-all ${
                      activePart === part.id
                        ? "scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{
                      top: `${part.y}%`,
                      left: `${part.x}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                        activePart === part.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-foreground/60 bg-background/80 text-foreground"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                    </span>
                    <span
                      className={`mt-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        activePart === part.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-background/80 text-foreground"
                      }`}
                    >
                      {part.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Filter bar */}
        <section className="sticky top-[73px] z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-3">
              {bikePartFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  onClick={() => setActivePart(filter.id)}
                  className={`whitespace-nowrap rounded-sm px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                    activePart === filter.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter.label}
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
                  No hay alforjas disponibles para esta parte de la bicicleta.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
