"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatPrice, type Product } from "@/lib/data"

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  return (
    <div className="group relative flex flex-col">
      <Link
        href={`/tienda/${product.slug}`}
        className="relative aspect-square overflow-hidden bg-secondary"
      >
        <Image
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.originalPrice && (
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 text-xs font-bold uppercase tracking-wider">
            Oferta
          </span>
        )}
        {product.bestSeller && !product.originalPrice && (
          <span className="absolute top-3 left-3 bg-foreground text-background px-2 py-1 text-xs font-bold uppercase tracking-wider">
            Top Ventas
          </span>
        )}
      </Link>

      <div className="flex flex-col gap-1.5 pt-4">
        <Link href={`/tienda/${product.slug}`}>
          <h3 className="text-sm font-medium text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {product.shortDescription}
        </p>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              addItem(product)
            }}
            className="flex h-8 w-8 items-center justify-center bg-foreground text-background hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label={`Agregar ${product.name} al carrito`}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
