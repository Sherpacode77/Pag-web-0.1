import type { Metadata } from "next"
import { notFound } from "next/navigation"
import fs from "fs"
import path from "path"
import { isDbProductsEnabled, getProductBySlugFromDb, readProductsFromDb } from "@/lib/db-products"
import { isDbInventoryEnabled, getInventoryFromDb } from "@/lib/db-inventory"
import { products as staticProducts } from "@/lib/data"
import { assetUrl } from "@/lib/assets"
import { ProductDetailClient } from "./product-detail-client"
import type { Product } from "@/lib/data"

const PRODUCTS_FILE = path.join(process.cwd(), "lib", "products.json")

async function getAllProducts(): Promise<Product[]> {
  if (isDbProductsEnabled()) {
    try {
      return await readProductsFromDb()
    } catch {
      // DB no disponible — fallback a JSON
    }
  }
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, "utf-8")
    return JSON.parse(data) as Product[]
  } catch {
    return staticProducts
  }
}

async function getProduct(slug: string): Promise<Product | null> {
  if (isDbProductsEnabled()) {
    try {
      return await getProductBySlugFromDb(slug)
    } catch {
      // DB no disponible — fallback a JSON
    }
  }
  const all = await getAllProducts()
  return all.find((p) => p.slug === slug) ?? null
}

export const revalidate = 0

export async function generateStaticParams() {
  try {
    const products = await getAllProducts()
    return products.map((p) => ({ slug: p.slug }))
  } catch {
    return staticProducts.map((p) => ({ slug: p.slug }))
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return { title: "Producto no encontrado" }
  }

  const description = product.shortDescription || product.description?.slice(0, 160) || ""
  const imageUrl = assetUrl(product.image || "")

  return {
    title: product.name,
    description,
    openGraph: {
      title: `${product.name} | CERO.UNO`,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | CERO.UNO`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [product, allProducts] = await Promise.all([getProduct(slug), getAllProducts()])

  if (!product) {
    notFound()
  }

  // Construir mapa de inventario por combinación color+talla. Clave: "<color>|<talla>",
  // usando "_" cuando el producto no tiene esa dimensión (ej. sin color: "_|m").
  let inventoryMap: Record<string, { stock: number; available: boolean }> = {}
  if (isDbInventoryEnabled()) {
    try {
      const rows = await getInventoryFromDb({ product_id: product.id, available_only: false })
      for (const row of rows) {
        const key = `${row.variant_color ?? "_"}|${row.variant_size ?? "_"}`
        inventoryMap[key] = { stock: row.stock_quantity, available: row.is_available }
      }
    } catch {
      // DB no disponible — usar inStock del JSON/producto
    }
  }

  // Producto oculto por completo: todas sus filas de inventario (SKU único
  // o variantes de color) están deshabilitadas.
  const hasInventoryRows = Object.keys(inventoryMap).length > 0
  if (hasInventoryRows && Object.values(inventoryMap).every((inv) => !inv.available)) {
    notFound()
  }

  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} inventoryMap={inventoryMap} />
}
