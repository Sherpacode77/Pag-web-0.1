"use client"

import { use, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  ShoppingBag,
  Shield,
  Droplets,
  Sun,
  Truck,
  Minus,
  Plus,
} from "lucide-react"
import { CartProvider, useCart } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { products, formatPrice } from "@/lib/data"

function ProductDetailContent({ slug }: { slug: string }) {
  const product = products.find((p) => p.slug === slug)
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)

  if (!product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Producto no encontrado
          </h1>
          <Link
            href="/tienda"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Volver a la Tienda
          </Link>
        </div>
      </div>
    )
  }

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product)
    }
  }

  return (
    <>
      <Navbar />
      <CartSidebar />
      <main className="min-h-screen">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">
                Inicio
              </Link>
              <span>/</span>
              <Link
                href="/tienda"
                className="hover:text-primary transition-colors"
              >
                Tienda
              </Link>
              <span>/</span>
              <span className="text-foreground">{product.name}</span>
            </div>
          </div>
        </div>

        {/* Product */}
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
            {/* Images */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-square overflow-hidden bg-secondary">
                <Image
                  src={product.images[activeImage] || product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                {product.originalPrice && (
                  <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    Oferta
                  </span>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      className={`relative h-20 w-20 overflow-hidden border-2 transition-colors ${
                        activeImage === idx
                          ? "border-primary"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <Image
                        src={img || "/placeholder.svg"}
                        alt={`${product.name} - vista ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex flex-col">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
                {product.category}
              </p>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl">
                {product.name}
              </h1>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-2xl font-bold text-foreground">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Droplets className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    100% Impermeable
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Sun className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    Filtro UV
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    Alto Gramaje
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">
                    {"Envio gratis >$200k"}
                  </span>
                </div>
              </div>

              {/* Specs */}
              {product.specs.length > 0 && (
                <div className="mt-6 border-t border-border pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">
                    Especificaciones
                  </h3>
                  <div className="flex flex-col gap-2">
                    {product.specs.map((spec) => (
                      <div
                        key={spec.label}
                        className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                      >
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          {spec.label}
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity + Add to cart */}
              <div className="mt-8 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cantidad
                  </span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex h-10 w-10 items-center justify-center border border-border text-foreground hover:bg-secondary transition-colors"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex h-10 w-12 items-center justify-center border-y border-border text-sm font-medium text-foreground">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex h-10 w-10 items-center justify-center border border-border text-foreground hover:bg-secondary transition-colors"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex w-full items-center justify-center gap-3 bg-primary text-primary-foreground py-4 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Agregar al Carrito
                </button>

                <Link
                  href={`https://wa.me/573001234567?text=Hola! Me interesa el producto: ${product.name} (${formatPrice(product.price)})`}
                  target="_blank"
                  className="flex w-full items-center justify-center gap-3 border border-border text-foreground py-4 text-sm font-bold uppercase tracking-widest hover:bg-secondary transition-colors"
                >
                  Consultar por WhatsApp
                </Link>
              </div>
            </div>
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 border-t border-border pt-12">
              <h2 className="text-lg font-bold uppercase tracking-wider text-foreground mb-8">
                Tambien te puede interesar
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  return (
    <CartProvider>
      <ProductDetailContent slug={slug} />
    </CartProvider>
  )
}
