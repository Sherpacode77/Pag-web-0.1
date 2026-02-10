"use client"

import React from "react"

import { useState } from "react"
import Image from "next/image"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  MessageCircle,
} from "lucide-react"

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    asunto: "",
    mensaje: "",
  })
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
    setFormData({ nombre: "", email: "", asunto: "", mensaje: "" })
  }

  return (
    <CartProvider>
      <Navbar />
      <CartSidebar />
      <main>
        {/* Hero */}
        <section className="border-b border-border py-16">
          <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-primary">
              Hablemos
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Contacto
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed">
              Tienes preguntas sobre nuestros productos, necesitas asesoria para
              tu setup de bikepacking o quieres cotizar un servicio de logistica?
              Estamos para ayudarte.
            </p>
          </div>
        </section>

        {/* Contact info + Form */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-5">
              {/* Contact info */}
              <div className="lg:col-span-2">
                <h2 className="mb-6 text-xl font-bold text-foreground">
                  Informacion de contacto
                </h2>
                <div className="flex flex-col gap-6">
                  <a
                    href="https://wa.me/573001234567"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 rounded-sm border border-border bg-card p-5 transition-colors hover:border-primary/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                      <MessageCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        WhatsApp
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        +57 300 123 4567
                      </p>
                      <p className="mt-1 text-xs text-primary">
                        Respuesta en menos de 2 horas
                      </p>
                    </div>
                  </a>
                  <div className="flex items-start gap-4 rounded-sm border border-border bg-card p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Correo electronico
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        info@ceropuntouno.co
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-sm border border-border bg-card p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Telefono
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        +57 (1) 234 5678
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Lun - Vie / 8am - 6pm
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-sm border border-border bg-card p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Ubicacion
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Bogota, Colombia
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Envios a todo el pais
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social */}
                <div className="mt-8">
                  <h3 className="mb-3 text-sm font-bold text-foreground">
                    Siguenos
                  </h3>
                  <div className="flex gap-3">
                    <a
                      href="https://instagram.com/ceropuntouno"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      aria-label="Instagram"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </a>
                    <a
                      href="https://facebook.com/ceropuntouno"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      aria-label="Facebook"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                    <a
                      href="https://wa.me/573001234567"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      aria-label="WhatsApp"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-3">
                {submitted ? (
                  <div className="flex flex-col items-center rounded-sm border border-primary/40 bg-primary/5 p-10 text-center">
                    <CheckCircle2 className="mb-4 h-12 w-12 text-primary" />
                    <h3 className="text-xl font-bold text-foreground">
                      Mensaje enviado
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Te responderemos lo mas pronto posible.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="rounded-sm border border-border bg-card p-6 lg:p-8"
                  >
                    <h2 className="mb-6 text-xl font-bold text-foreground">
                      Enviar mensaje
                    </h2>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="c-nombre"
                          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          Nombre
                        </label>
                        <input
                          id="c-nombre"
                          type="text"
                          required
                          value={formData.nombre}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nombre: e.target.value,
                            })
                          }
                          className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="c-email"
                          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          Correo electronico
                        </label>
                        <input
                          id="c-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              email: e.target.value,
                            })
                          }
                          className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>
                    <div className="mt-5">
                      <label
                        htmlFor="c-asunto"
                        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        Asunto
                      </label>
                      <input
                        id="c-asunto"
                        type="text"
                        required
                        value={formData.asunto}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            asunto: e.target.value,
                          })
                        }
                        className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        placeholder="Asesoria de producto, cotizacion Travel, etc."
                      />
                    </div>
                    <div className="mt-5">
                      <label
                        htmlFor="c-mensaje"
                        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        Mensaje
                      </label>
                      <textarea
                        id="c-mensaje"
                        rows={5}
                        required
                        value={formData.mensaje}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            mensaje: e.target.value,
                          })
                        }
                        className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                        placeholder="Cuentanos en que podemos ayudarte..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4" />
                      Enviar mensaje
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </CartProvider>
  )
}
