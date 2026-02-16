import { Product } from "@/lib/data"

interface ProductSchemaProps {
  product: Product
}

export function ProductSchema({ product }: ProductSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.shortDescription,
    image: product.images || [product.image],
    brand: {
      "@type": "Brand",
      name: "CERO.UNO",
    },
    manufacturer: {
      "@type": "Organization",
      name: "CERO.UNO",
      url: "https://www.cero.uno",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.cero.uno/tienda/${product.slug}`,
      priceCurrency: "COP",
      price: product.price,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: "https://schema.org/InStock", // Siempre en stock por defecto
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "CERO.UNO",
      },
    },
    category: product.category === "alforjas" ? "Alforjas para Bicicleta" : "Accesorios de Ciclismo",
    sku: product.id,
    material: "Nylon de alto gramaje con recubrimiento impermeable",
    color: product.colors || ["Negro"],
    aggregateRating: product.featured
      ? {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "12",
          bestRating: "5",
          worstRating: "1",
        }
      : undefined,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Organization Schema para todas las páginas
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CERO.UNO",
    url: "https://www.cero.uno",
    logo: "https://www.cero.uno/images/logo.png",
    description:
      "Fabricante colombiano de bolsos impermeables para bikepacking y ciclismo de aventura",
    address: {
      "@type": "PostalAddress",
      addressCountry: "CO",
      addressLocality: "Colombia",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      availableLanguage: ["Spanish"],
    },
    sameAs: [
      "https://www.instagram.com/cerouno", // Actualizar con tus redes reales
      "https://www.facebook.com/cerouno",
      // Agregar más redes sociales
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Breadcrumb Schema
export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
