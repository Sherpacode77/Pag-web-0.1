import fs from "fs"
import path from "path"
import { products } from "../lib/data"

const PRODUCTS_FILE = path.join(process.cwd(), "lib", "products.json")

// Inicializar productos.json con datos de data.ts
function initializeProducts() {
  try {
    console.log("Inicializando products.json con datos existentes...")
    
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2))
    
    console.log(`✅ Éxito: ${products.length} productos guardados en lib/products.json`)
  } catch (error) {
    console.error("❌ Error inicializando productos:", error)
  }
}

initializeProducts()
