"use client"

import React from "react"

import { useState } from "react"
import Image from "next/image"
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
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
} from "lucide-react"
import { assetUrl } from "@/lib/assets"
import { SectionDivider } from "@/components/section-divider"

const initialFormData = {
  nombre: "",
  telefono: "",
  evento: "",
  tipoViaje: "ida" as "ida" | "ida_vuelta",
  fechaIda: "",
  fechaRegreso: "",
  personas: "",
  servicioTransporte: false,
  servicioHospedaje: false,
  mensaje: "",
}

export default function TravelPage() {
  const [formData, setFormData] = useState(initialFormData)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const response = await fetch("/api/travel-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "No se pudo enviar la solicitud")
      }
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
      setFormData(initialFormData)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar la solicitud. Intenta de nuevo."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <CartSidebar />
      <main>
        {/* Hero */}
        <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
          <Image
            src={assetUrl("/images/travel-hero.jpg")}
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
        <section className="section-light relative py-20 bg-background">
          <SectionDivider />
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
                  title: "Servicio privado de transporte (ida - regreso)",
                  desc: "Buses comodos con racks especializados para bicicletas. Regresa seguro despues de tu evento.",
                },
                {
                  icon: Wrench,
                  title: "Asistencia mecanica",
                  desc: "Equipo mecanico en puntos estrategicos de la ruta para resolver cualquier imprevisto.",
                },
                {
                  icon: Shield,
                  title: "Seguro de ruta para ti y tu bici",
                  desc: "Cobertura de asistencia durante todo el recorrido para tu tranquilidad.",
                },
                {
                  icon: Users,
                  title: "Grupos de 10 pasajeros en adelante",
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
        <section className="section-light relative py-20 bg-secondary">
          <SectionDivider />
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
                  className="overflow-hidden rounded-sm border border-border bg-card"
                >
                  {event.image && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
                      <Image
                        src={assetUrl(event.image)}
                        alt={event.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                        <Route className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {event.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                    {event.distance && (
                      <div className="mt-3 inline-block rounded-sm bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                        {event.distance}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Lead Form */}
        <section className="section-light relative py-20 bg-background" id="cotizar">
          <SectionDivider />
          <div className="mx-auto max-w-2xl px-4 lg:px-8">
            <div className="mb-10 text-center">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary">
                Cotiza tu servicio
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Solicitar mas informacion
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
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tipo de viaje
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          tipoViaje: "ida",
                          fechaRegreso: "",
                        })
                      }
                      className={`rounded-sm px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                        formData.tipoViaje === "ida"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Solo ida
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, tipoViaje: "ida_vuelta" })
                      }
                      className={`rounded-sm px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                        formData.tipoViaje === "ida_vuelta"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Ida y vuelta
                    </button>
                  </div>
                </div>

                <div
                  className={`mt-5 grid gap-5 ${formData.tipoViaje === "ida_vuelta" ? "md:grid-cols-2" : ""}`}
                >
                  <div>
                    <label
                      htmlFor="fechaIda"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {formData.tipoViaje === "ida_vuelta"
                        ? "Fecha de ida"
                        : "Fecha del evento"}
                    </label>
                    <input
                      id="fechaIda"
                      type="date"
                      required
                      value={formData.fechaIda}
                      onChange={(e) =>
                        setFormData({ ...formData, fechaIda: e.target.value })
                      }
                      className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  {formData.tipoViaje === "ida_vuelta" && (
                    <div>
                      <label
                        htmlFor="fechaRegreso"
                        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                      >
                        Fecha de regreso
                      </label>
                      <input
                        id="fechaRegreso"
                        type="date"
                        required
                        value={formData.fechaRegreso}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            fechaRegreso: e.target.value,
                          })
                        }
                        className="w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Servicio a cotizar (opcional)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      aria-pressed={formData.servicioTransporte}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          servicioTransporte: !formData.servicioTransporte,
                        })
                      }
                      className={`rounded-sm px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                        formData.servicioTransporte
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Transporte
                    </button>
                    <button
                      type="button"
                      aria-pressed={formData.servicioHospedaje}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          servicioHospedaje: !formData.servicioHospedaje,
                        })
                      }
                      className={`rounded-sm px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                        formData.servicioHospedaje
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Hospedaje
                    </button>
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
                {error && (
                  <div className="mt-5 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Enviando..." : "Enviar solicitud"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
