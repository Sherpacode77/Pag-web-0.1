"use client"

import React from "react"

import { useState } from "react"
import { Truck, Shield, Users, MapPin } from "lucide-react"

export function LogisticsSection() {
  const [formData, setFormData] = useState({
    nombre: "",
    tipo: "",
    ciclistas: "",
    fecha: "",
    whatsapp: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = `Hola! Quiero cotizar logistica:%0ANombre: ${formData.nombre}%0ATipo: ${formData.tipo}%0ACiclistas: ${formData.ciclistas}%0AFecha: ${formData.fecha}`
    window.open(`https://wa.me/573001234567?text=${message}`, "_blank")
  }

  return (
    <section id="logistica" className="py-16 lg:py-24 bg-secondary">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
            CERO.UNO Travel
          </p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl text-balance">
            Logistica Integral para Eventos Ciclistas
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-sm text-muted-foreground leading-relaxed">
            Nos encargamos del transporte y la logistica para que tu grupo solo
            se preocupe por pedalear. Especialistas en retornos masivos y
            eventos corporativos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Service Info */}
          <div>
            <div className="bg-card border border-border p-6 mb-6">
              <h3 className="text-lg font-bold text-card-foreground uppercase tracking-wider mb-2">
                Logistica Bogota - Villavicencio
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Servicio de transporte de retorno el mismo dia para el cierre
                vial anual. Buses confortables y camiones seguros para tu
                bicicleta.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                    Buses
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                    Carga
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                    Seguro
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-card border border-border p-4">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  Rutas disponibles
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bogota - Villavicencio / Bogota - Tunja / Bogota - Girardot y
                  mas rutas a medida
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border p-6">
            <h3 className="text-lg font-bold text-card-foreground uppercase tracking-wider mb-6">
              Cotiza tu Logistica
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="nombre"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Nombre de la Empresa / Organizador
                </label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="mt-1.5 w-full bg-background border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Tu nombre o empresa"
                />
              </div>
              <div>
                <label
                  htmlFor="tipo"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Tipo de Evento
                </label>
                <select
                  id="tipo"
                  required
                  value={formData.tipo}
                  onChange={(e) =>
                    setFormData({ ...formData, tipo: e.target.value })
                  }
                  className="mt-1.5 w-full bg-background border border-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="retorno">Retorno Masivo</option>
                  <option value="corporativa">Salida Corporativa</option>
                  <option value="medida">Viaje a Medida</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="ciclistas"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    No. Ciclistas
                  </label>
                  <input
                    id="ciclistas"
                    type="number"
                    required
                    value={formData.ciclistas}
                    onChange={(e) =>
                      setFormData({ ...formData, ciclistas: e.target.value })
                    }
                    className="mt-1.5 w-full bg-background border border-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="fecha"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Fecha Tentativa
                  </label>
                  <input
                    id="fecha"
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    className="mt-1.5 w-full bg-background border border-input px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="whatsapp"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  WhatsApp de Contacto
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  required
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: e.target.value })
                  }
                  className="mt-1.5 w-full bg-background border border-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="300 123 4567"
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full bg-primary text-primary-foreground py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                Solicitar Cotizacion
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
