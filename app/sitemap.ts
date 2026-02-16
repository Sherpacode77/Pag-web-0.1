import { MetadataRoute } from 'next'
import { readFileSync } from 'fs'
import path from 'path'

interface Product {
  slug: string
  lastModified?: string
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.cero.uno' // Cambiar por tu dominio real
  
  // Leer productos del JSON
  let products: Product[] = []
  try {
    const productsPath = path.join(process.cwd(), 'lib', 'products.json')
    const productsData = readFileSync(productsPath, 'utf-8')
    products = JSON.parse(productsData)
  } catch (error) {
    console.error('Error loading products for sitemap:', error)
  }

  // Páginas estáticas principales
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tienda`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/nosotros`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Páginas de categorías
  const categoryPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/alforjas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/accesorios`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Páginas de productos dinámicas
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/tienda/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}
