"use client"

import React from "react"

import { useState } from "react"
import Image from "next/image"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { cyclingEvents } from "@/lib/data"
import {
  MapPin,
  Calendar,
  Route,
  Bus,
  Wrench,
  Shield,
  Phone,
  CheckCircle2,
  Users,
  Send,
} from "lucide-react"

export default function TravelPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    evento: "",
    fecha: "",
    personas: "",
    mensaje: "",
  })
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
    setFormData({
      nombre: "",
      telefono: "",
      evento: "",
      fecha: "",
      personas: "",
      mensaje: "",
    })
  }

  return (
    <CartProvider>
      <Navbar />
      <CartSidebar />
      <main>
        {/* Hero */}
        <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
          <Image
            src="/images/travel-hero.jpg"
            alt="CERO.UNO Travel - Logistica ciclista"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-background/70" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-primary">
              Logistica ciclista
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl text-balance">
              CERO.UNO Travel
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed md:text-lg">
              Servicio de transporte y logistica para eventos ciclisticos y
              ciclo-travesias en Colombia. Nos encargamos de que tu unica
              preocupacion sea pedalear.
            </p>
          </div>
        </section>

        {/* Services */}
        <section className="border-b border-border py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Nuestros servicios
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Bus,
                  title: "Transporte de retorno",
                  desc: "Buses comodos con racks especializados para bicicletas. Regresa seguro despues de tu evento.",
                },
                {
                  icon: Wrench,
                  title: "Asistencia mecanica",
                  desc: "Equipo mecanico en puntos estrategicos de la ruta para resolver cualquier imprevisto.",
                },
                {
                  icon: Shield,
                  title: "Seguro de ruta",
                  desc: "Cobertura de asistencia durante todo el recorrido para tu tranquilidad.",
                },
                {
                  icon: Users,
                  title: "Grupos de 30 a 500",
                  desc: "Capacidad logistica para eventos pequenos y grandes. Cotizamos a tu medida.",
                },
              ].map((service) => (
                <div
                  key={service.title}
                  className="rounded-sm border border-border bg-card p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-primary/10">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-foreground">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {service.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming events */}
        <section className="border-b border-border py-20 bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary">
                Proximos eventos
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Calendario 2026
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {cyclingEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-sm border border-border bg-card p-6"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10">
                      <Route className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {event.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                  <div className="mt-3 inline-block rounded-sm bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                    {event.distance}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lead Form */}
        <section className="py-20" id="cotizar">
          <div className="mx-auto max-w-2xl px-4 lg:px-8">
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary">
                Cotiza tu servicio
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Solicita informacion
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Cuentanos sobre tu evento y te enviamos una cotizacion
                personalizada por WhatsApp o correo.
              </p>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center rounded-sm border border-primary/40 bg-primary/5 p-10 text-center">
                <CheckCircle2 className="mb-4 h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold text-foreground">
                  Solicitud enviada
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nos pondremos en contacto contigo pronto por WhatsApp o
                  correo.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-sm border border-border bg-card p-6 lg:p-8"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="nombre"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Nombre completo
                    </label>
                    <input
                      id="nombre"
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                      className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="telefono"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Telefono / WhatsApp
                    </label>
                    <input
                      id="telefono"
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                      className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      placeholder="+57 300 000 0000"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="evento"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Nombre del evento
                    </label>
                    <input
                      id="evento"
                      type="text"
                      required
                      value={formData.evento}
                      onChange={(e) =>
                        setFormData({ ...formData, evento: e.target.value })
                      }
                      className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      placeholder="Nombre de la ciclo-travesia o evento"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fecha"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Fecha del evento
                    </label>
                    <input
                      id="fecha"
                      type="date"
                      required
                      value={formData.fecha}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha: e.target.value })
                      }
                      className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="personas"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Cantidad de personas
                    </label>
                    <input
                      id="personas"
                      type="number"
                      required
                      min={1}
                      value={formData.personas}
                      onChange={(e) =>
                        setFormData({ ...formData, personas: e.target.value })
                      }
                      className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <label
                    htmlFor="mensaje"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Mensaje adicional (opcional)
                  </label>
                  <textarea
                    id="mensaje"
                    rows={3}
                    value={formData.mensaje}
                    onChange={(e) =>
                      setFormData({ ...formData, mensaje: e.target.value })
                    }
                    className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                    placeholder="Detalles adicionales sobre tu evento..."
                  />
                </div>
                <button
                  type="submit"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                  Enviar solicitud
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </CartProvider>
  )
}
