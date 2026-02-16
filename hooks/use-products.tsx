"use client"

import { useState, useEffect } from "react"
import type { Product } from "./data"

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      setLoading(true)
      const response = await fetch("/api/products")
      if (!response.ok) throw new Error("Error fetching products")
      const data = await response.json()
      setProducts(data)
      setError(null)
    } catch (err) {
      setError("Error cargando productos")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const bestSellers = products.filter((p) => p.bestSeller)
  const featured = products.filter((p) => p.featured)

  return {
    products,
    bestSellers,
    featured,
    loading,
    error,
    refetch: fetchProducts,
  }
}
