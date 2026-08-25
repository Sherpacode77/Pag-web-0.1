import { NextRequest, NextResponse } from "next/server"
import type { Product, ProductVariant, ProductSizeVariant } from "@/lib/data"
import { getCatalogItemId } from "@/lib/data"
import { getAllProductsWithFallback } from "@/lib/db-products"
import { isDbInventoryEnabled, getInventoryFromDb } from "@/lib/db-inventory"
import { applyActiveOffers } from "@/lib/db-offers"

export const runtime = "nodejs"

const SITE_URL = (process.env.SITE_URL || "https://cerounobikes.com").replace(/\/+$/, "")
const BRAND = "CERO.UNO"

const FEED_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "item_group_id",
  "color",
  "size",
  "sale_price",
  "quantity_to_sell_on_facebook",
] as const

// Cantidad a reportar cuando no hay inventario reconciliado para esa fila
// (producto/variante disponible por defecto, pero sin conteo real todavia).
// Meta exige un numero >= 1 para que el item se pueda mostrar/vender.
const DEFAULT_QUANTITY = 999

type InventoryRowLite = { color: string; size: string; available: boolean; quantity: number }
type InventoryByProduct = Map<string, InventoryRowLite[]>

// Agrupa el inventario real por producto. Un producto sin ninguna fila
// registrada se asume disponible (mismo criterio laxo que
// filterProductsByAvailability en lib/db-inventory.ts) — nunca se oculta
// por falta de reconciliación de inventario.
async function getInventoryByProduct(): Promise<InventoryByProduct> {
  const map: InventoryByProduct = new Map()
  if (!isDbInventoryEnabled()) return map

  try {
    const rows = await getInventoryFromDb()
    for (const row of rows) {
      const list = map.get(row.product_id) ?? []
      list.push({
        color: row.variant_color ?? "",
        size: row.variant_size ?? "",
        available: row.is_available && row.stock_quantity > 0,
        quantity: row.stock_quantity,
      })
      map.set(row.product_id, list)
    }
  } catch (err) {
    console.error("facebook-catalog: fallo leyendo inventario, se asume todo disponible", err)
  }

  return map
}

// Disponibilidad de una combinación color/talla concreta dentro de un
// producto con variantes reales expuestas en la tienda: busca la fila
// exacta; si el producto no tiene inventario reconciliado, asume disponible.
function isVariantAvailable(
  productRows: InventoryRowLite[] | undefined,
  color: string,
  size: string
): boolean {
  if (!productRows || productRows.length === 0) return true
  const match = productRows.find((r) => r.color === color && r.size === size)
  return match ? match.available : true
}

// Disponibilidad de un producto SIN variantes expuestas en la tienda: el
// inventario puede seguir existiendo bajo una llave de color implícita
// (ver app_inventory) aunque la ficha del producto no muestre selector de
// color. Disponible si tiene al menos una fila utilizable, o si no tiene
// ninguna fila registrada todavia.
function isProductAvailable(productRows: InventoryRowLite[] | undefined): boolean {
  if (!productRows || productRows.length === 0) return true
  return productRows.some((r) => r.available)
}

// Cantidad vendible para una variante concreta — la fila exacta si existe,
// o el valor por defecto si esa variante no tiene inventario reconciliado.
function getVariantQuantity(
  productRows: InventoryRowLite[] | undefined,
  color: string,
  size: string
): number {
  const match = productRows?.find((r) => r.color === color && r.size === size)
  return match ? match.quantity : DEFAULT_QUANTITY
}

// Cantidad vendible para un producto sin variantes expuestas: suma el stock
// de todas sus filas de inventario (pueden vivir bajo una llave de color
// implícita), o el valor por defecto si no tiene ninguna fila registrada.
function getProductQuantity(productRows: InventoryRowLite[] | undefined): number {
  if (!productRows || productRows.length === 0) return DEFAULT_QUANTITY
  return productRows.reduce((sum, r) => sum + r.quantity, 0)
}

function tsvSafe(value: string | number): string {
  return String(value).replace(/[\t\n\r]+/g, " ").trim()
}

function absoluteUrl(imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) return imagePath
  return `${SITE_URL}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`
}

function formatCop(amount: number): string {
  return `${amount.toFixed(2)} COP`
}

type FeedRow = Record<(typeof FEED_COLUMNS)[number], string>

function buildRows(product: Product, inventoryByProduct: InventoryByProduct): FeedRow[] {
  const colorOptions: (ProductVariant | null)[] =
    product.hasVariants && product.variants && product.variants.length > 0
      ? product.variants
      : [null]
  const sizeOptions: (ProductSizeVariant | null)[] =
    product.sizes && product.sizes.length > 0 ? product.sizes : [null]

  const hasRealVariants = colorOptions.length > 1 || sizeOptions.length > 1
  const productRows = inventoryByProduct.get(product.id)
  const link = `${SITE_URL}/tienda/${product.slug}`
  const onSale = typeof product.originalPrice === "number" && product.originalPrice > product.price
  const price = onSale ? product.originalPrice! : product.price
  const salePrice = onSale ? product.price : null

  const rows: FeedRow[] = []

  for (const color of colorOptions) {
    for (const size of sizeOptions) {
      const inStock = hasRealVariants
        ? isVariantAvailable(productRows, color?.color ?? "", size?.size ?? "")
        : isProductAvailable(productRows)
      const quantity = hasRealVariants
        ? getVariantQuantity(productRows, color?.color ?? "", size?.size ?? "")
        : getProductQuantity(productRows)

      const titleParts = [product.name, color?.colorName, size?.sizeName].filter(Boolean)
      const image = color?.images[0]?.url || product.image

      rows.push({
        id: tsvSafe(getCatalogItemId(product.id, color?.color, size?.size)),
        title: tsvSafe(titleParts.join(" - ")),
        description: tsvSafe(product.shortDescription || product.description),
        availability: inStock ? "in stock" : "out of stock",
        condition: "new",
        price: formatCop(price),
        link: tsvSafe(link),
        image_link: tsvSafe(absoluteUrl(image)),
        brand: BRAND,
        item_group_id: hasRealVariants ? product.id : "",
        color: tsvSafe(color?.colorName ?? ""),
        size: tsvSafe(size?.sizeName ?? ""),
        sale_price: salePrice !== null ? formatCop(salePrice) : "",
        quantity_to_sell_on_facebook: inStock ? String(Math.max(1, quantity)) : "0",
      })
    }
  }

  return rows
}

export async function GET(request: NextRequest) {
  const expectedToken = process.env.FACEBOOK_FEED_TOKEN
  if (expectedToken) {
    const token = request.nextUrl.searchParams.get("token")
    if (token !== expectedToken) {
      return NextResponse.json({ error: "Token invalido" }, { status: 401 })
    }
  }

  const [rawProducts, inventoryByProduct] = await Promise.all([
    getAllProductsWithFallback(),
    getInventoryByProduct(),
  ])
  const allProducts = await applyActiveOffers(rawProducts)

  const lines = [FEED_COLUMNS.join("\t")]
  for (const product of allProducts) {
    for (const row of buildRows(product, inventoryByProduct)) {
      lines.push(FEED_COLUMNS.map((col) => row[col]).join("\t"))
    }
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600",
    },
  })
}
