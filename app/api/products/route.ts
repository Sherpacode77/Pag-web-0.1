import { NextRequest, NextResponse } from "next/server"
import { products } from "@/lib/data"
import { ensureAdminSession } from "@/lib/auth"
import fs from "fs"
import path from "path"
import { z } from "zod"

export const runtime = "nodejs"

const PRODUCTS_FILE = path.join(process.cwd(), "lib", "products.json")

const categorySchema = z.enum(["alforjas", "accesorios", "ropa", "kits"])
const bikePartSchema = z.enum(["manubrio", "sillin", "marco", "tubo-superior"])
const variantColorSchema = z.enum(["negro", "rojo", "naranja", "verde", "azul"])

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
        image: z.string().trim().startsWith("/"),
        inStock: z.boolean(),
      })
    )
    .max(10)
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

// GET - Obtener todos los productos
export async function GET() {
  try {
    const productsData = readProducts()
    return NextResponse.json(productsData)
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

    const productsData = readProducts()
    
    // Generar nuevo ID
    const maxId = productsData.reduce((max: number, product: any) => {
      const numericId = Number.parseInt(product.id, 10)
      return Number.isFinite(numericId) ? Math.max(max, numericId) : max
    }, 0)

    const newId = String(maxId + 1)
    
    const newProduct = {
      ...parsed.data,
      id: newId,
    }
    
    productsData.push(newProduct)
    
    if (writeProducts(productsData)) {
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
    
    const productsData = readProducts()
    const index = productsData.findIndex((p: any) => p.id === id)
    
    if (index === -1) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }
    
    productsData[index] = { ...productsData[index], ...updateData }
    
    if (writeProducts(productsData)) {
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
    
    const productsData = readProducts()
    const filteredProducts = productsData.filter((p: any) => p.id !== id)
    
    if (filteredProducts.length === productsData.length) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }
    
    if (writeProducts(filteredProducts)) {
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
