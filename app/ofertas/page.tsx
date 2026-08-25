import type { Metadata } from "next"
import fs from "fs"
import path from "path"
import Link from "next/link"
import Image from "next/image"
import { Tag, Package } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { products as staticProducts } from "@/lib/data"
import { isDbProductsEnabled, readProductsFromDb } from "@/lib/db-products"
import { filterProductsByAvailability } from "@/lib/db-inventory"
import { applyActiveOffers, getActiveBundleOffers } from "@/lib/db-offers"
import type { Product } from "@/lib/data"
import { SectionDivider } from "@/components/section-divider"
import { assetUrl } from "@/lib/assets"
import { formatPrice } from "@/lib/data"

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
  const availableProducts = await filterProductsByAvailability(await getAllProducts())
  const allProducts = await applyActiveOffers(availableProducts)
  const offers = allProducts.filter((p) => (p.originalPrice && p.originalPrice > p.price) || p.freeShipping)
  const productsById = new Map(allProducts.map((p) => [p.id, p]))
  const bundles = await getActiveBundleOffers()

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
              {offers.length > 0 || bundles.length > 0
                ? "Aprovecha mientras dure el stock"
                : "Pronto tendremos nuevas promociones para ti"}
            </p>
          </div>
        </div>

        <div className="section-light relative bg-background px-4 py-12 lg:px-8">
          <SectionDivider />
          <div className="mx-auto max-w-7xl">
          {offers.length === 0 && bundles.length === 0 ? (
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
              {/* Combos */}
              {bundles.length > 0 && (
                <div className="mb-14">
                  <h2 className="text-lg font-bold uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Combos
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {bundles.map((bundle) => {
                      const includedProducts = bundle.products
                        .map((entry) => ({ entry, product: productsById.get(entry.productId) }))
                        .filter((x): x is { entry: typeof bundle.products[number]; product: Product } => !!x.product)

                      return (
                        <div key={bundle.id} className="bg-card border border-border rounded-lg overflow-hidden">
                          <div className="relative aspect-video bg-secondary">
                            <Image
                              src={assetUrl(bundle.cover_image || "/placeholder.svg")}
                              alt={bundle.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                            <span className="absolute top-3 right-3 bg-foreground text-background px-2 py-1 text-xs font-black uppercase">
                              {bundle.discount_type === "free_shipping"
                                ? "Envío gratis"
                                : `-${Math.round(Number(bundle.discount_value))}%`}
                            </span>
                          </div>
                          <div className="p-5">
                            <h3 className="font-bold uppercase tracking-wider">{bundle.name}</h3>
                            {bundle.description && (
                              <p className="text-sm text-muted-foreground mt-1">{bundle.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-4">
                              {includedProducts.map(({ entry, product }) => (
                                <Link
                                  key={`${bundle.id}-${entry.productId}`}
                                  href={`/tienda/${product.slug}`}
                                  className="flex items-center gap-2 pr-3 bg-secondary/50 hover:bg-secondary rounded-md transition-colors"
                                >
                                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md">
                                    <Image
                                      src={assetUrl(product.image || "/placeholder.svg")}
                                      alt={product.name}
                                      fill
                                      className="object-cover"
                                      sizes="48px"
                                    />
                                  </div>
                                  <div className="py-1.5">
                                    <p className="text-xs font-medium">
                                      {product.name}
                                      {entry.quantity && entry.quantity > 1 ? ` x${entry.quantity}` : ""}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatPrice(product.price)}</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Agrega cada producto del combo a tu carrito por separado para aprovechar la promoción.
                  </p>
                </div>
              )}

              {/* Grid de ofertas individuales */}
              {offers.length > 0 && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                  {offers.map((product) => {
                    const discount = product.originalPrice
                      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                      : null
                    return (
                      <div key={product.id} className="relative">
                        {/* Badge de descuento/envío gratis en esquina superior derecha */}
                        <span className="absolute top-3 right-3 z-10 bg-foreground text-background px-2 py-1 text-xs font-black uppercase">
                          {discount !== null ? `-${discount}%` : "Envío gratis"}
                        </span>
                        <ProductCard product={product} />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Footer de sección */}
              <p className="text-center text-xs text-muted-foreground mt-10">
                Las ofertas están sujetas a disponibilidad de stock. Los precios pueden cambiar sin previo aviso.
              </p>
            </>
          )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
