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
  X,
  Save,
  DollarSign,
  Tag,
  Image as ImageIcon,
  ImagePlus,
} from "lucide-react"
import { ImageUpload } from "@/components/image-upload"
import { MultiImageUpload } from "@/components/multi-image-upload"
import { VideoUpload } from "@/components/video-upload"
import { ImageGalleryModal } from "@/components/image-gallery-modal"
import { VariantManager } from "@/components/variant-manager"

interface ProductVariant {
  color: "negro" | "rojo" | "naranja" | "verde" | "azul"
  colorName: string
  image: string
  inStock: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  originalPrice?: number
  description: string
  shortDescription: string
  image: string
  images: string[]
  videos?: string[]
  category: "alforjas" | "accesorios" | "ropa" | "kits"
  bikePart?: "manubrio" | "sillin" | "marco" | "tubo-superior"
  tags: string[]
  colors?: string[]
  hasVariants?: boolean
  variants?: ProductVariant[]
  featured: boolean
  bestSeller: boolean
  specs: { label: string; value: string }[]
}

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
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("Error during logout:", error)
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
    try {
      const url = editingProduct ? "/api/products" : "/api/products"
      const method = editingProduct ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct ? { id: editingProduct.id, ...formData } : formData),
      })

      if (response.ok) {
        await fetchProducts()
        setIsModalOpen(false)
        alert(editingProduct ? "Producto actualizado" : "Producto creado")
      }
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error al guardar el producto")
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return

    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchProducts()
        alert("Producto eliminado")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      alert("Error al eliminar el producto")
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
                src="/images/marca-alta-blancorecurso-207.png"
                alt="CERO.UNO"
                width={120}
                height={30}
              />
              <span className="text-sm text-muted-foreground hidden sm:block">
                Panel de Administración
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                className="text-sm text-primary hover:underline"
              >
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
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.featured).length}
                </p>
                <p className="text-sm text-muted-foreground">Destacados</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.bestSeller).length}
                </p>
                <p className="text-sm text-muted-foreground">Más Vendidos</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-muted-foreground">Categorías</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold uppercase tracking-wider">
              Gestión de Productos
            </h1>
          </div>
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
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden bg-secondary rounded">
                          <Image
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.shortDescription}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">
                        ${product.price.toLocaleString()}
                      </p>
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
                          onClick={() => handleDeleteProduct(product.id)}
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

      {/* Modal */}
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

// Modal Component
function ProductModal({
  product,
  isEdit,
  onClose,
  onSave,
  onChange,
}: {
  product: Partial<Product>
  isEdit: boolean
  onClose: () => void
  onSave: () => void
  onChange: (data: Partial<Product>) => void
}) {
  const [showGallery, setShowGallery] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase tracking-wider">
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Nombre del producto *
            </label>
            <input
              type="text"
              value={product.name || ""}
              onChange={(e) => onChange({ ...product, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="SaddleBag 12L"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Slug (URL) *
            </label>
            <input
              type="text"
              value={product.slug || ""}
              onChange={(e) =>
                onChange({
                  ...product,
                  slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                })
              }
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="saddlebag-12l"
              required
            />
          </div>

          {/* Price & Original Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
                Precio (COP) *
              </label>
              <input
                type="number"
                value={product.price || 0}
                onChange={(e) =>
                  onChange({ ...product, price: Number(e.target.value) })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
                Precio Original (opcional)
              </label>
              <input
                type="number"
                value={product.originalPrice || ""}
                onChange={(e) =>
                  onChange({
                    ...product,
                    originalPrice: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Categoría *
            </label>
            <select
              value={product.category || "alforjas"}
              onChange={(e) =>
                onChange({
                  ...product,
                  category: e.target.value as any,
                })
              }
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="alforjas">Alforjas</option>
              <option value="accesorios">Accesorios</option>
              <option value="ropa">Ropa</option>
              <option value="kits">Kits</option>
            </select>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Descripción corta *
            </label>
            <input
              type="text"
              value={product.shortDescription || ""}
              onChange={(e) =>
                onChange({ ...product, shortDescription: e.target.value })
              }
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción breve para listados"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Descripción completa *
            </label>
            <textarea
              value={product.description || ""}
              onChange={(e) =>
                onChange({ ...product, description: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Descripción detallada del producto"
            />
          </div>

          {/* Image Upload Component - IMÁGENES PRINCIPALES */}
          <MultiImageUpload
            value={product.images || []}
            onChange={(paths) => {
              // La primera imagen es también la imagen principal
              onChange({
                ...product,
                images: paths,
                image: paths[0] || "",
              })
            }}
            label="Imágenes principales del producto (color negro) *"
          />

          {/* Galería Button */}
          <button
            type="button"
            onClick={() => setShowGallery(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-secondary transition-colors"
          >
            <ImagePlus className="h-4 w-4" />
            <span className="text-sm">O seleccionar de la galería</span>
          </button>

          {/* Video Upload Component */}
          <VideoUpload
            value={product.videos || []}
            onChange={(paths) => onChange({ ...product, videos: paths })}
            label="Videos del producto (opcional)"
            maxVideos={3}
          />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 uppercase tracking-wider">
              Tags (separados por coma)
            </label>
            <input
              type="text"
              value={product.tags?.join(", ") || ""}
              onChange={(e) =>
                onChange({
                  ...product,
                  tags: e.target.value.split(",").map((t) => t.trim()),
                })
              }
              className="w-full px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="impermeable, roll-top, sillin"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={product.featured || false}
                onChange={(e) =>
                  onChange({ ...product, featured: e.target.checked })
                }
                className="h-4 w-4"
              />
              <span className="text-sm">Producto Destacado</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={product.bestSeller || false}
                onChange={(e) =>
                  onChange({ ...product, bestSeller: e.target.checked })
                }
                className="h-4 w-4"
              />
              <span className="text-sm">Más Vendido</span>
            </label>
          </div>

          {/* Variantes de Color */}
          <div className="pt-4 border-t border-border">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={product.hasVariants || false}
                onChange={(e) => {
                  const hasVariants = e.target.checked
                  onChange({
                    ...product,
                    hasVariants,
                    variants: hasVariants ? (product.variants || []) : [],
                  })
                }}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium uppercase tracking-wider">
                ¿Este producto tiene variantes de color?
              </span>
            </label>

            {product.hasVariants && (
              <VariantManager
                variants={product.variants || []}
                productImages={product.images || []}
                onChange={(variants) =>
                  onChange({ ...product, variants })
                }
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border rounded-md hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md font-bold hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        onSelect={(path) => {
          onChange({ ...product, image: path })
          setShowGallery(false)
        }}
        currentImage={product.image}
      />
    </div>
  )
}
