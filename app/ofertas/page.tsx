import type { Metadata } from "next"
import fs from "fs"
import path from "path"
import Link from "next/link"
import { Tag } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { products as staticProducts } from "@/lib/data"
import { isDbProductsEnabled, readProductsFromDb } from "@/lib/db-products"
import type { Product } from "@/lib/data"

export const metadata: Metadata = {
  title: "Ofertas | CERO.UNO",
  description: "Los mejores precios en productos de bikepacking CERO.UNO. Ofertas por tiempo limitado.",
}

export const revalidate = 0

const PRODUCTS_FILE = path.join(process.cwd(), "lib", "products.json")

async function getAllProducts(): Promise<Product[]> {
  if (isDbProductsEnabled()) {
    try {
      return await readProductsFromDb()
    } catch {}
  }
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, "utf-8")
    return JSON.parse(data) as Product[]
  } catch {
    return staticProducts
  }
}

export default async function OfertasPage() {
  const allProducts = await getAllProducts()
  const offers = allProducts.filter((p) => p.originalPrice && p.originalPrice > p.price)

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero banner */}
        <div className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.5em] mb-3 opacity-75">
              Tiempo limitado
            </p>
            <h1 className="text-5xl font-black uppercase tracking-tight md:text-7xl">
              Ofertas
            </h1>
            <p className="mt-4 text-sm opacity-80 max-w-md mx-auto">
              {offers.length > 0
                ? `${offers.length} producto${offers.length > 1 ? "s" : ""} con descuento — aprovecha mientras dure el stock`
                : "Pronto tendremos nuevas promociones para ti"}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          {offers.length === 0 ? (
            /* Estado vacío */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="p-4 bg-secondary rounded-full mb-5">
                <Tag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-wider">Sin ofertas activas</h2>
              <p className="text-muted-foreground mt-2 text-sm max-w-sm">
                En este momento no hay descuentos disponibles. ¡Vuelve pronto o visita nuestra tienda completa!
              </p>
              <Link
                href="/tienda"
                className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                Ver tienda completa
              </Link>
            </div>
          ) : (
            <>
              {/* Grid de ofertas */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                {offers.map((product) => {
                  const discount = Math.round(
                    ((product.originalPrice! - product.price) / product.originalPrice!) * 100
                  )
                  return (
                    <div key={product.id} className="relative">
                      {/* Badge de descuento en esquina superior derecha */}
                      <span className="absolute top-3 right-3 z-10 bg-foreground text-background px-2 py-1 text-xs font-black">
                        -{discount}%
                      </span>
                      <ProductCard product={product} />
                    </div>
                  )
                })}
              </div>

              {/* Footer de sección */}
              <p className="text-center text-xs text-muted-foreground mt-10">
                Las ofertas están sujetas a disponibilidad de stock. Los precios pueden cambiar sin previo aviso.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
