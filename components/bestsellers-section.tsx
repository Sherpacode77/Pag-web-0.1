"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { products } from "@/lib/data"
import { ProductCard } from "./product-card"

export function BestsellersSection() {
  const bestSellers = products.filter((p) => p.bestSeller)

  return (
    <section id="bestsellers" className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
              Favoritos de la comunidad
            </p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl">
              Mas Vendidos
            </h2>
          </div>
          <Link
            href="/tienda"
            className="hidden sm:flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            Ver Todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 sm:hidden flex justify-center">
          <Link
            href="/tienda"
            className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary"
          >
            Ver Todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
