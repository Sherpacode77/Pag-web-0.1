"use client"

import Image from "next/image"
import { CartProvider } from "@/lib/cart-context"
import { Navbar } from "@/components/navbar"
import { CartSidebar } from "@/components/cart-sidebar"
import { Footer } from "@/components/footer"
import { cyclingEvents } from "@/lib/data"
import { MapPin, Calendar, Route, Mountain, Award, Users } from "lucide-react"

const timeline = [
  {
    year: "2021",
    title: "El primer prototipo",
    description:
      "Nacio de la necesidad real: bolsos que no se mojaran en las rutas por los Andes colombianos. Probamos y descartamos decenas de prototipos.",
  },
  {
    year: "2022",
    title: "Primeras ventas y comunidad",
    description:
      "Los primeros 50 bolsos se vendieron por Instagram a ciclistas de Bogota. La comunidad empezo a crecer con cada rodada.",
  },
  {
    year: "2023",
    title: "Produccion propia en Colombia",
    description:
      "Establecimos nuestro taller de produccion con maquinaria especializada y telas importadas de alto gramaje con filtro UV.",
  },
  {
    year: "2024",
    title: "CERO.UNO Travel nace",
    description:
      "Lanzamos el servicio de logistica y transporte para eventos ciclisticos, acompanando a mas de 2.000 ciclistas en sus rutas.",
  },
  {
    year: "2025",
    title: "Presencia nacional",
    description:
      "Nuestros productos llegan a ciclistas en mas de 15 departamentos de Colombia. Mas de 5.000 unidades vendidas.",
  },
]

export default function NosotrosPage() {
  return (
    <CartProvider>
      <Navbar />
      <CartSidebar />
      <main>
        {/* Hero */}
        <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
          <Image
            src="/images/about-workshop.jpg"
            alt="Taller CERO.UNO Colombia"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-background/70" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-primary">
              Nuestra historia
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl text-balance">
              Hechos para lo inexplorado
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed md:text-lg">
              Somos una marca colombiana que disena y fabrica equipo impermeable
              de alto rendimiento para ciclistas que quieren ir mas lejos.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="border-b border-border py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-primary/10">
                  <Mountain className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  Disenado en ruta
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cada producto nace de la experiencia real en las carreteras y
                  caminos de Colombia. Probamos todo en condiciones extremas
                  antes de lanzarlo.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-primary/10">
                  <Award className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  100% Colombiano
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Produccion local, mano de obra colombiana y materiales de la
                  mas alta calidad. Apoyamos la industria nacional con orgullo.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-primary/10">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  Comunidad ciclista
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mas que una marca, somos parte de la comunidad. Organizamos
                  rodadas, apoyamos eventos y conectamos ciclistas de todo el
                  pais.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Badge images */}
        <section className="border-b border-border py-16 bg-secondary/30">
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Nuestros sellos de calidad
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-10">
              <Image
                src="/images/100colombiano1.png"
                alt="100% Hecho en Colombia"
                width={140}
                height={140}
                className="h-28 w-auto md:h-36"
              />
              <Image
                src="/images/impermeable1.png"
                alt="100% Impermeable"
                width={140}
                height={140}
                className="h-28 w-auto md:h-36"
              />
              <Image
                src="/images/altogramaje1.png"
                alt="Alto Gramaje con Filtro UV"
                width={140}
                height={140}
                className="h-28 w-auto md:h-36"
              />
            </div>
          </div>
        </section>

        {/* Timeline / Trajectory */}
        <section className="border-b border-border py-20">
          <div className="mx-auto max-w-3xl px-4 lg:px-8">
            <h2 className="mb-12 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Nuestra trayectoria
            </h2>
            <div className="relative">
              <div className="absolute left-5 top-0 h-full w-px bg-border md:left-1/2" />
              <div className="flex flex-col gap-10">
                {timeline.map((item, i) => (
                  <div
                    key={item.year}
                    className={`relative flex items-start gap-6 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  >
                    <div className="hidden md:block md:w-1/2" />
                    <div className="absolute left-3 top-1 z-10 h-5 w-5 rounded-full border-2 border-primary bg-background md:left-1/2 md:-translate-x-1/2" />
                    <div className="ml-12 md:ml-0 md:w-1/2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {item.year}
                      </span>
                      <h3 className="mt-1 text-lg font-bold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Events we support */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mb-12 text-center">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary">
                CERO.UNO en la ruta
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Eventos y ciclo-travesias
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {cyclingEvents.map((event) => (
                <div
                  key={event.id}
                  className="group rounded-sm border border-border bg-card p-6 transition-colors hover:border-primary/40"
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
      </main>
      <Footer />
    </CartProvider>
  )
}
