"use client"

import React from "react"

import { useState } from "react"

export function NewsletterSection() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setEmail("")
  }

  return (
    <section className="py-16 lg:py-24 bg-card border-y border-border">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
          The Trail Report
        </p>
        <h2 className="text-2xl font-black uppercase tracking-tight text-card-foreground md:text-3xl text-balance">
          Unete y recibe 10% OFF en tu primera aventura
        </h2>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Recibe noticias sobre nuevos productos, rutas recomendadas y
          descuentos exclusivos para la comunidad CERO.UNO.
        </p>

        {submitted ? (
          <div className="mt-8 bg-primary/10 border border-primary/20 px-6 py-4">
            <p className="text-sm font-medium text-primary">
              Bienvenido a la comunidad. Revisa tu correo para tu codigo de
              descuento.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="flex-1 bg-background border border-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Suscribirme
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
