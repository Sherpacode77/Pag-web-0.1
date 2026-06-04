"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Package,
  Plus,
  Edit,
  Trash2,
  LogOut,
  Search,
  Tag,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { ProductModal } from "@/components/admin/product-modal"
import { assetUrl } from "@/lib/assets"
import type { Product } from "@/lib/data"

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<Partial<Product>>({})
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      const isAuthenticated = await validateSession()
      if (!isAuthenticated) {
        router.push("/admin")
        return
      }
      await fetchProducts()
    }
    bootstrap()
  }, [router])

  async function validateSession() {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function fetchProducts() {
    try {
      const response = await fetch("/api/products")
      if (response.status === 401) {
        router.push("/admin")
        return
      }
      const data = await response.json()
      setProducts(data)
    } catch {
      toast.error("Error al cargar los productos")
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
      // continuar con la redirección aunque falle
    }
    router.push("/admin")
  }

  function openCreateModal() {
    setEditingProduct(null)
    setFormData({
      name: "",
      slug: "",
      price: 0,
      description: "",
      shortDescription: "",
      image: "",
      images: [],
      videos: [],
      category: "alforjas",
      tags: [],
      colors: [],
      hasVariants: false,
      variants: [],
      featured: false,
      bestSeller: false,
      specs: [],
    })
    setIsModalOpen(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setFormData(product)
    setIsModalOpen(true)
  }

  async function handleSaveProduct() {
    const method = editingProduct ? "PUT" : "POST"
    const body = editingProduct ? { id: editingProduct.id, ...formData } : formData

    const response = await fetch("/api/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      await fetchProducts()
      setIsModalOpen(false)
      toast.success(editingProduct ? "Producto actualizado correctamente" : "Producto creado correctamente")
    } else {
      const data = await response.json().catch(() => ({}))
      toast.error(data.error || "Error al guardar el producto")
      throw new Error("save failed")
    }
  }

  function confirmDeleteProduct(product: Product) {
    toast.warning(`¿Eliminar "${product.name}"?`, {
      action: {
        label: "Eliminar",
        onClick: () => deleteProduct(product.id),
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
      duration: 8000,
    })
  }

  async function deleteProduct(id: string) {
    try {
      const response = await fetch(`/api/products?id=${id}`, { method: "DELETE" })
      if (response.ok) {
        await fetchProducts()
        toast.success("Producto eliminado")
      } else {
        toast.error("Error al eliminar el producto")
      }
    } catch {
      toast.error("Error al eliminar el producto")
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const featuredCount = products.filter((p) => p.featured).length
  const bestSellerCount = products.filter((p) => p.bestSeller).length
  const categoryCount = new Set(products.map((p) => p.category)).size

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={assetUrl("/images/marca-alta-blancorecurso-207.png")}
                alt="CERO.UNO"
                width={120}
                height={30}
              />
              <span className="text-sm text-muted-foreground hidden sm:block">
                Panel de Administración
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" target="_blank" className="text-sm text-primary hover:underline">
                Ver sitio
              </a>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Total Productos</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Tag className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{featuredCount}</p>
                <p className="text-sm text-muted-foreground">Destacados</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{bestSellerCount}</p>
                <p className="text-sm text-muted-foreground">Más Vendidos</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{categoryCount}</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold uppercase tracking-wider">Gestión de Productos</h1>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold uppercase tracking-wider hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" />
            Nuevo Producto
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Todas las categorías</option>
            <option value="alforjas">Alforjas</option>
            <option value="accesorios">Accesorios</option>
            <option value="ropa">Ropa</option>
            <option value="kits">Kits</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden bg-secondary rounded">
                          <Image
                            src={assetUrl(product.image || "/placeholder.svg")}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.shortDescription}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">${product.price.toLocaleString()}</p>
                      {product.originalPrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          ${product.originalPrice.toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {product.featured && (
                          <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">
                            Destacado
                          </span>
                        )}
                        {product.bestSeller && (
                          <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                            Top
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 hover:bg-secondary rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteProduct(product)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <ProductModal
          product={formData}
          isEdit={!!editingProduct}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          onChange={setFormData}
        />
      )}
    </div>
  )
}
