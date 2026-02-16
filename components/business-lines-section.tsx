import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const lines = [
  {
    title: "Alforjas",
    description:
      "Bolsos impermeables de alto rendimiento para bikepacking. Disenados para resistir las rutas mas exigentes de Colombia.",
    image: "/images/products/saddlebag-urban.jpg",
    href: "/alforjas",
    cta: "Ver Alforjas",
  },
  {
    title: "Accesorios",
    description:
      "Complementos esenciales para tu dia a dia en bicicleta. Funcionalidad urbana con resistencia de aventura.",
    image: "/images/products/COZ6.jpeg",
    href: "/accesorios",
    cta: "Ver Accesorios",
  },
  {
    title: "CERO.UNO Travel",
    description:
      "Logistica integral para eventos ciclistas. Transporte seguro para ti y tu bicicleta a los mejores destinos.",
    image: "/images/travel-hero.jpg",
    href: "/travel",
    cta: "Cotizar",
  },
]

export function BusinessLinesSection() {
  return (
    <section className="py-16 lg:py-24 bg-secondary">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
            Lo que hacemos
          </p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl text-balance">
            Nuestras Lineas de Negocio
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {lines.map((line) => (
            <Link
              key={line.title}
              href={line.href}
              className="group relative flex flex-col overflow-hidden bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={line.image || "/placeholder.svg"}
                  alt={line.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                <h3 className="absolute bottom-4 left-4 text-xl font-black uppercase tracking-tight text-white md:text-2xl">
                  {line.title}
                </h3>
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {line.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary">
                  {line.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
