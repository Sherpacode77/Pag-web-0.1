import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { products } from "@/lib/data"
import { ensureAdminSession } from "@/lib/auth"
import {
  createProductInDb,
  deleteProductInDb,
  getNextProductIdFromDb,
  getProductByIdFromDb,
  getProductBySlugFromDb,
  isDbProductsEnabled,
  readProductsFromDb,
  updateProductInDb,
} from "@/lib/db-products"
import {
  reconcileInventoryForProduct,
  isDbInventoryEnabled,
  filterProductsByAvailability,
  getVariantKeysForProduct,
  releaseVariantCodes,
} from "@/lib/db-inventory"
import fs from "fs"
import path from "path"
import { z } from "zod"

export const runtime = "nodejs"

const PRODUCTS_FILE = path.join(process.cwd(), "lib", "products.json")

const categorySchema = z.enum(["alforjas", "accesorios", "ropa", "kits"])
const bikePartSchema = z.enum(["manubrio", "sillin", "marco", "tubo-superior"])
const variantColorSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El color debe ser un slug en minúsculas (ej. morado-lavanda)")
const colorHexSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Hex inválido").optional()
const sizeValueSchema = z.enum(["unica", "xs", "s", "m", "l", "xl"])

const baseProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  price: z.number().finite().nonnegative(),
  originalPrice: z.number().finite().nonnegative().optional(),
  description: z.string().trim().min(10).max(5000),
  shortDescription: z.string().trim().min(5).max(300),
  image: z.string().trim().startsWith("/"),
  images: z.array(z.string().trim().startsWith("/")).max(20).optional().default([]),
  videos: z.array(z.string().trim().startsWith("/")).max(10).optional().default([]),
  category: categorySchema,
  bikePart: bikePartSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  colors: z.array(z.string().trim().min(1).max(40)).max(15).optional().default([]),
  hasVariants: z.boolean().optional().default(false),
  variants: z
    .array(
      z.object({
        color: variantColorSchema,
        colorName: z.string().trim().min(1).max(30),
        colorHex: colorHexSchema,
        image: z.string().trim().startsWith("/"),
        inStock: z.boolean(),
      })
    )
    .max(10)
    .optional()
    .default([]),
  sizes: z
    .array(
      z.object({
        size: sizeValueSchema,
        sizeName: z.string().trim().min(1).max(20),
        inStock: z.boolean(),
      })
    )
    .max(6)
    .optional()
    .default([]),
  featured: z.boolean().optional().default(false),
  bestSeller: z.boolean().optional().default(false),
  specs: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(250),
      })
    )
    .max(30)
    .optional()
    .default([]),
})

const updateProductSchema = baseProductSchema.partial().extend({
  id: z.string().trim().min(1),
})

// Inicializar archivo con productos existentes si no existe
function initializeProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2))
    }
  } catch (error) {
    console.error("Error initializing products:", error)
  }
}

// Leer productos del archivo
function readProducts() {
  try {
    initializeProducts()
    const data = fs.readFileSync(PRODUCTS_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error reading products:", error)
    return products // Fallback a datos estáticos
  }
}

// Escribir productos al archivo
function writeProducts(productsData: any[]) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(productsData, null, 2))
    return true
  } catch (error) {
    console.error("Error writing products:", error)
    return false
  }
}

// GET - Obtener todos los productos o un producto por slug / id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const slug = searchParams.get("slug")
    const publicOnly = searchParams.get("public") === "1"

    if (isDbProductsEnabled()) {
      if (id) {
        const product = await getProductByIdFromDb(id)

        if (!product) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        return NextResponse.json(product)
      }

      if (slug) {
        const product = await getProductBySlugFromDb(slug)
        if (!product) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        return NextResponse.json(product)
      }

      let productsData = await readProductsFromDb()
      if (publicOnly) productsData = await filterProductsByAvailability(productsData)
      return NextResponse.json(productsData)
    }

    let productsData = readProducts()
    if (publicOnly) productsData = await filterProductsByAvailability(productsData)

    if (id) {
      const product = productsData.find((item) => String(item.id) === id)
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }
      return NextResponse.json(product)
    }

    if (slug) {
      const product = productsData.find((item) => item.slug === slug)
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }
      return NextResponse.json(product)
    }

    const response = NextResponse.json(productsData)
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
    return response
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching products" },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const body = await request.json()
    const parsed = baseProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de producto inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (parsed.data.category === "ropa" && parsed.data.sizes.length === 0) {
      return NextResponse.json(
        { error: "Selecciona al menos una talla para productos de categoría ropa" },
        { status: 400 }
      )
    }

    const productsData = isDbProductsEnabled() ? await readProductsFromDb() : readProducts()
    const newId = isDbProductsEnabled()
      ? await getNextProductIdFromDb()
      : String(
          productsData.reduce((max: number, product: any) => {
            const numericId = Number.parseInt(product.id, 10)
            return Number.isFinite(numericId) ? Math.max(max, numericId) : max
          }, 0) + 1
        )
    
    const newProduct = {
      ...parsed.data,
      id: newId,
    }
    
    productsData.push(newProduct)

    if (isDbProductsEnabled()) {
      await createProductInDb(newProduct)

      let inventoryWarning: string | undefined
      if (isDbInventoryEnabled()) {
        try {
          const reconcile = await reconcileInventoryForProduct(newProduct)
          if (reconcile.errors.length > 0) {
            inventoryWarning = `Producto creado, pero hubo errores generando inventario: ${reconcile.errors.join("; ")}`
          }
        } catch (err) {
          console.error("POST /api/products: fallo reconciliando inventario", err)
          inventoryWarning = "Producto creado, pero no se pudo generar el inventario automáticamente"
        }
      }

      revalidatePath("/tienda")
      return NextResponse.json(
        inventoryWarning ? { ...newProduct, _inventoryWarning: inventoryWarning } : newProduct,
        { status: 201 }
      )
    }

    if (writeProducts(productsData)) {
      revalidatePath("/tienda")
      return NextResponse.json(newProduct, { status: 201 })
    } else {
      return NextResponse.json(
        { error: "Error saving product" },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating product" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar producto existente
export async function PUT(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const body = await request.json()
    const parsed = updateProductSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de actualización inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { id, ...updateData } = parsed.data
    
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }
    
    const productsData = isDbProductsEnabled() ? await readProductsFromDb() : readProducts()
    const index = productsData.findIndex((p: any) => p.id === id)
    
    if (index === -1) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }
    
    productsData[index] = { ...productsData[index], ...updateData }

    if (productsData[index].category === "ropa" && (productsData[index].sizes?.length ?? 0) === 0) {
      return NextResponse.json(
        { error: "Selecciona al menos una talla para productos de categoría ropa" },
        { status: 400 }
      )
    }

    if (isDbProductsEnabled()) {
      const updated = await updateProductInDb(id, updateData)
      if (!updated) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        )
      }

      let inventoryWarning: string | undefined
      if (isDbInventoryEnabled()) {
        try {
          const reconcile = await reconcileInventoryForProduct(updated)
          if (reconcile.errors.length > 0) {
            inventoryWarning = `Producto actualizado, pero hubo errores generando inventario: ${reconcile.errors.join("; ")}`
          }
        } catch (err) {
          console.error("PUT /api/products: fallo reconciliando inventario", err)
          inventoryWarning = "Producto actualizado, pero no se pudo generar el inventario automáticamente"
        }
      }

      revalidatePath(`/tienda/${updated.slug}`)
      revalidatePath("/tienda")
      return NextResponse.json(
        inventoryWarning ? { ...updated, _inventoryWarning: inventoryWarning } : updated
      )
    }

    if (writeProducts(productsData)) {
      revalidatePath(`/tienda/${productsData[index].slug}`)
      revalidatePath("/tienda")
      return NextResponse.json(productsData[index])
    } else {
      return NextResponse.json(
        { error: "Error updating product" },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error updating product" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar producto
export async function DELETE(request: NextRequest) {
  try {
    const unauthorized = ensureAdminSession(request)
    if (unauthorized) {
      return unauthorized
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }
    
    const productsData = isDbProductsEnabled() ? await readProductsFromDb() : readProducts()
    const filteredProducts = productsData.filter((p: any) => p.id !== id)
    
    if (filteredProducts.length === productsData.length) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }
    
    if (isDbProductsEnabled()) {
      const variantKeys = isDbInventoryEnabled() ? await getVariantKeysForProduct(id) : []

      const deleted = await deleteProductInDb(id)
      if (!deleted) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        )
      }

      if (variantKeys.length > 0) {
        try {
          await releaseVariantCodes(variantKeys)
        } catch (err) {
          console.error("DELETE /api/products: fallo liberando códigos de variante", err)
        }
      }

      revalidatePath("/tienda")
      return NextResponse.json({ success: true, id })
    }

    if (writeProducts(filteredProducts)) {
      revalidatePath("/tienda")
      return NextResponse.json({ success: true, id })
    } else {
      return NextResponse.json(
        { error: "Error deleting product" },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error deleting product" },
      { status: 500 }
    )
  }
}
