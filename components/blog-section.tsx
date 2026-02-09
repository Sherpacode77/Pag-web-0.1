"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { blogPosts } from "@/lib/data"

export function BlogSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
              Historias y rutas
            </p>
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl">
              {"Journal & Rutas"}
            </h2>
          </div>
          <Link
            href="/blog"
            className="hidden sm:flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            Ver Todo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {blogPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                <Image
                  src={post.image || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground px-2 py-1 text-xs font-bold uppercase tracking-wider">
                  {post.category}
                </span>
              </div>
              <div className="pt-4">
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-wider">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{post.readTime} lectura</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                  <span>
                    {new Date(post.date).toLocaleDateString("es-CO", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
