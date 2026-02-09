"use client"

import { Star } from "lucide-react"
import { reviews } from "@/lib/data"

export function ReviewsSection() {
  return (
    <section className="py-16 lg:py-24 bg-secondary">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
            La comunidad opina
          </p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl text-balance">
            Opiniones de Ciclistas Reales
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col bg-card border border-border p-6"
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={`star-${review.id}-${i}`}
                    className={`h-4 w-4 ${i < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {`"${review.text}"`}
              </p>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">
                  {review.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {review.location}
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {review.product}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
