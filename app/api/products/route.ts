import { NextRequest, NextResponse } from "next/server"
import { products } from "@/lib/data"
import fs from "fs"
import path from "path"

const PRODUCTS_FILE = path.join(process.cwd(), "lib", "products.json")

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
    const body = await request.json()
    const productsData = readProducts()
    
    // Generar nuevo ID
    const newId = String(Math.max(...productsData.map((p: any) => parseInt(p.id))) + 1)
    
    const newProduct = {
      ...body,
      id: newId,
      featured: body.featured || false,
      bestSeller: body.bestSeller || false,
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
    const body = await request.json()
    const { id, ...updateData } = body
    
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
