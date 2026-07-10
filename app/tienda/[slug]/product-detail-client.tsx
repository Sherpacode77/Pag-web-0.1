"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ShoppingBag,
  Shield,
  Droplets,
  Sun,
  Truck,
  Minus,
  Plus,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { VariantSelector } from "@/components/variant-selector"
import { SizeSelector } from "@/components/size-selector"
import { formatPrice } from "@/lib/data"
import { trackAddToCart, sendFacebookServerEvent } from "@/lib/tracking-client"
import type { Product } from "@/lib/data"
import { assetUrl } from "@/lib/assets"

type ProductVariant = NonNullable<Product["variants"]>[number]
type ProductSize = NonNullable<Product["sizes"]>[number]

interface Props {
  product: Product
  relatedProducts: Product[]
  inventoryMap?: Record<string, { stock: number; available: boolean }>
}

export function ProductDetailClient({ product, relatedProducts, inventoryMap = {} }: Props) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [activeMediaType, setActiveMediaType] = useState<"image" | "video">("image")
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null)

  const hasInventoryData = Object.keys(inventoryMap).length > 0

  // Variantes de color ajustadas según inventario real, agregando el stock/
  // disponibilidad de todas las tallas de cada color:
  // - ninguna talla disponible → color se oculta completamente
  // - stock total = 0 → inStock=false (aparece como agotado pero visible)
  const effectiveVariants = useMemo<ProductVariant[]>(() => {
    if (!product.hasVariants || !product.variants) return []
    return product.variants
      .filter((v) => {
        if (!hasInventoryData) return true
        const rows = Object.entries(inventoryMap).filter(([key]) => key.startsWith(`${v.color}|`))
        return rows.length === 0 || rows.some(([, inv]) => inv.available)
      })
      .map((v) => {
        if (!hasInventoryData) return v
        const rows = Object.entries(inventoryMap).filter(([key]) => key.startsWith(`${v.color}|`))
        if (rows.length === 0) return v
        const totalStock = rows.reduce((sum, [, inv]) => sum + inv.stock, 0)
        return { ...v, inStock: totalStock > 0 }
      })
  }, [product.hasVariants, product.variants, inventoryMap, hasInventoryData])

  useEffect(() => {
    if (!product.hasVariants || effectiveVariants.length === 0) return
    const negro = effectiveVariants.find((v) => v.color === "negro" && v.inStock)
    const first = effectiveVariants.find((v) => v.inStock)
    setSelectedVariant(negro ?? first ?? effectiveVariants[0] ?? null)
  }, [product.hasVariants, effectiveVariants])

  // Clave de color para consultar inventario de tallas: el color elegido,
  // o "_" si el producto no tiene variantes de color.
  const colorKey = product.hasVariants && selectedVariant ? selectedVariant.color : "_"
  const hasSizes = !!(product.sizes && product.sizes.length > 0)

  // Tallas ajustadas según inventario real para el color actualmente seleccionado
  const effectiveSizes = useMemo<ProductSize[]>(() => {
    if (!product.sizes || product.sizes.length === 0) return []
    return product.sizes
      .filter((s) => {
        if (!hasInventoryData) return true
        const inv = inventoryMap[`${colorKey}|${s.size}`]
        return !inv || inv.available
      })
      .map((s) => {
        if (!hasInventoryData) return s
        const inv = inventoryMap[`${colorKey}|${s.size}`]
        if (!inv) return s
        return { ...s, inStock: inv.stock > 0 }
      })
  }, [product.sizes, inventoryMap, hasInventoryData, colorKey])

  useEffect(() => {
    if (!product.sizes || effectiveSizes.length === 0) {
      setSelectedSize(null)
      return
    }
    const unica = effectiveSizes.find((s) => s.size === "unica" && s.inStock)
    const first = effectiveSizes.find((s) => s.inStock)
    setSelectedSize(unica ?? first ?? effectiveSizes[0] ?? null)
  }, [product.sizes, effectiveSizes])

  // ¿El producto/variante/talla actualmente seleccionado está agotado?
  const isOutOfStock = hasSizes
    ? selectedSize ? !selectedSize.inStock : false
    : product.hasVariants
      ? selectedVariant ? !selectedVariant.inStock : false
      : hasInventoryData
        ? (inventoryMap["_|_"]?.stock ?? 1) === 0
        : false

  // Sin tallas disponibles para el color elegido (todas ocultas/agotadas)
  const noSizeSelectable = hasSizes && !selectedSize
  const canAddToCart = !isOutOfStock && !noSizeSelectable

  const displayImages = selectedVariant
    ? selectedVariant.color === "negro"
      ? product.images || []
      : [selectedVariant.image]
    : product.images || []

  const shouldShowVideos = !selectedVariant || selectedVariant.color === "negro"
  const displayVideos = shouldShowVideos ? (product.videos || []) : []
  const currentVideo = displayVideos[activeVideoIndex] || ""

  useEffect(() => {
    if (displayVideos.length === 0 && activeMediaType === "video") {
      setActiveMediaType("image")
      setActiveImage(0)
    }
  }, [selectedVariant, displayVideos.length, activeMediaType])

  const handleAddToCart = () => {
    const variant = {
      variantColor: selectedVariant?.color,
      variantColorName: selectedVariant?.colorName,
      variantSize: selectedSize?.size,
      variantSizeName: selectedSize?.sizeName,
    }
    for (let i = 0; i < quantity; i++) {
      addItem(product, variant)
    }
    trackAddToCart({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity,
    })
    void sendFacebookServerEvent({
      eventName: "AddToCart",
      eventId: `add-${product.id}-${Date.now()}`,
      customData: {
        currency: "COP",
        value: product.price * quantity,
        content_type: "product",
        contents: [{ id: product.id, quantity, item_price: product.price }],
      },
    })
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
              <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
              <span>/</span>
              <Link href="/tienda" className="hover:text-primary transition-colors">Tienda</Link>
              <span>/</span>
              <span className="text-foreground">{product.name}</span>
            </div>
          </div>
        </div>

        {/* Product */}
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
            {/* Images & Videos */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-square overflow-hidden bg-secondary">
                {activeMediaType === "image" ? (
                  <Image
                    src={assetUrl(displayImages[activeImage] || product.image || "/placeholder.svg")}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <video
                    key={currentVideo}
                    src={assetUrl(currentVideo)}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    loop
                    playsInline
                  />
                )}
                {product.originalPrice && (
                  <span className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold uppercase tracking-wider">
                    Oferta
                  </span>
                )}
              </div>
              {(displayImages.length > 1 || displayVideos.length > 0) && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {displayImages.map((img, idx) => (
                    <button
                      key={`img-${img}`}
                      type="button"
                      onClick={() => { setActiveImage(idx); setActiveMediaType("image") }}
                      className={`relative h-20 w-20 flex-shrink-0 overflow-hidden border-2 transition-colors ${
                        activeMediaType === "image" && activeImage === idx
                          ? "border-primary"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <Image
                        src={assetUrl(img || "/placeholder.svg")}
                        alt={`${product.name} - vista ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                  {displayVideos.map((video, idx) => (
                    <button
                      key={`video-${video}`}
                      type="button"
                      onClick={() => { setActiveVideoIndex(idx); setActiveMediaType("video") }}
                      className={`relative h-20 w-20 flex-shrink-0 overflow-hidden border-2 transition-colors ${
                        activeMediaType === "video" && activeVideoIndex === idx
                          ? "border-primary"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <video src={assetUrl(video)} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="bg-white/90 rounded-full p-1.5">
                          <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
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
                <span className="text-2xl font-bold text-foreground">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              {product.hasVariants && effectiveVariants.length > 0 && (
                <VariantSelector
                  variants={effectiveVariants}
                  selectedVariant={selectedVariant}
                  onSelect={(variant) => { setSelectedVariant(variant); setActiveImage(0) }}
                />
              )}

              {hasSizes && (
                <SizeSelector
                  sizes={effectiveSizes}
                  selectedSize={selectedSize}
                  onSelect={setSelectedSize}
                />
              )}

              <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Droplets className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">100% Impermeable</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Sun className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">Filtro UV</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">Alto Gramaje</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary px-3 py-2.5">
                  <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground">{"Envio gratis >$200k"}</span>
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
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">{spec.label}</span>
                        <span className="text-xs font-medium text-foreground">{spec.value}</span>
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
                  onClick={canAddToCart ? handleAddToCart : undefined}
                  disabled={!canAddToCart}
                  className={`flex w-full items-center justify-center gap-3 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                    !canAddToCart
                      ? "bg-secondary text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  <ShoppingBag className="h-5 w-5" />
                  {isOutOfStock ? "Agotado" : noSizeSelectable ? "Sin tallas disponibles" : "Agregar al Carrito"}
                </button>

                <Link
                  href={`https://wa.me/573058287780?text=Hola! Me interesa el producto: ${product.name} (${formatPrice(product.price)})`}
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
