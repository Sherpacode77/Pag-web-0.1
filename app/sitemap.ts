import { MetadataRoute } from 'next'
import { readFileSync } from 'fs'
import path from 'path'
import { isDbProductsEnabled, readProductsFromDb } from '@/lib/db-products'
import { blogPosts } from '@/lib/data'

interface Product {
  slug: string
  lastModified?: string
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://cerounobikes.com'
  ).replace(/\/$/, '')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()

  let products: Product[] = []

  if (isDbProductsEnabled()) {
    try {
      const productsData = await readProductsFromDb()
      products = productsData.map((product) => ({ slug: product.slug }))
    } catch (error) {
      console.error('Error loading products from DB for sitemap:', error)
    }
  }

  if (products.length === 0) {
    try {
      const productsPath = path.join(process.cwd(), 'lib', 'products.json')
      const productsData = readFileSync(productsPath, 'utf-8')
      products = JSON.parse(productsData)
    } catch (error) {
      console.error('Error loading products for sitemap:', error)
    }
  }

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
    {
      url: `${baseUrl}/travel`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
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
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/tienda/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }))

  return [...staticPages, ...productPages, ...blogPages]
}
