"use client"

import { use } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Clock, Calendar } from "lucide-react"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { blogPosts } from "@/lib/data"

function BlogPostContent({ slug }: { slug: string }) {
  const post = blogPosts.find((p) => p.slug === slug)

  if (!post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Articulo no encontrado
          </h1>
          <Link
            href="/blog"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Volver al Journal
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <CartSidebar />
      <main className="min-h-screen">
        {/* Back link */}
        <div className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-4 lg:px-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Journal
            </Link>
          </div>
        </div>

        {/* Article */}
        <article className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-12">
          <div className="mb-6">
            <span className="bg-primary text-primary-foreground px-2 py-1 text-xs font-bold uppercase tracking-wider">
              {post.category}
            </span>
          </div>

          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl text-balance">
            {post.title}
          </h1>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{post.readTime} lectura</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(post.date).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="relative mt-8 aspect-[21/9] overflow-hidden bg-secondary">
            <Image
              src={post.image || "/placeholder.svg"}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>

          <div className="mt-10 max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {post.excerpt}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              En CERO.UNO creemos que la aventura comienza con el equipo
              correcto. Cada uno de nuestros productos esta disenado pensando en
              las condiciones reales de las carreteras y caminos colombianos:
              lluvia, sol intenso, y terrenos exigentes.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Nuestras telas de alto gramaje con filtro UV garantizan que tu
              equipo resista kilometro tras kilometro, mientras que el cierre
              roll-top mantiene tus pertenencias 100% secas sin importar las
              condiciones climaticas.
            </p>

            <blockquote className="my-8 border-l-2 border-primary pl-6">
              <p className="text-base italic text-foreground leading-relaxed">
                {'"'}La ruta no espera. Tu equipo tampoco deberia hacerlo.{'"'}
              </p>
              <cite className="mt-2 block text-xs text-muted-foreground uppercase tracking-wider not-italic">
                - Equipo CERO.UNO
              </cite>
            </blockquote>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Si estas planeando tu proxima aventura de bikepacking en Colombia,
              te recomendamos revisar nuestra guia completa de equipamiento y
              explorar los setups que otros miembros de la comunidad han
              utilizado en sus expediciones.
            </p>

            <div className="mt-10 border-t border-border pt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Etiquetas
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-secondary text-secondary-foreground px-3 py-1 text-xs uppercase tracking-wider">
                  Bikepacking
                </span>
                <span className="bg-secondary text-secondary-foreground px-3 py-1 text-xs uppercase tracking-wider">
                  Colombia
                </span>
                <span className="bg-secondary text-secondary-foreground px-3 py-1 text-xs uppercase tracking-wider">
                  {post.category}
                </span>
              </div>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  return (
    <CartProvider>
      <BlogPostContent slug={slug} />
    </CartProvider>
  )
}
