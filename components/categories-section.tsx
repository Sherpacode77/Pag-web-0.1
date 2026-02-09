import Image from "next/image"
import Link from "next/link"

export function CategoriesSection() {
  return (
    <section className="py-16 lg:py-24 bg-secondary">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
          {/* Setup Completo */}
          <Link
            href="/tienda?category=bikepacking"
            className="group relative aspect-[4/3] overflow-hidden"
          >
            <Image
              src="/images/category-setup.jpg"
              alt="Setup completo de bikepacking"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
            <div className="absolute bottom-6 left-6 z-10">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-1">
                Bikepacking
              </p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                Sistema Completo
              </h3>
              <span className="mt-2 inline-block border-b border-white/50 pb-0.5 text-xs font-medium uppercase tracking-wider text-white/80">
                Ver Setups
              </span>
            </div>
          </Link>

          {/* Uso Urbano */}
          <Link
            href="/tienda?category=accesorios"
            className="group relative aspect-[4/3] overflow-hidden"
          >
            <Image
              src="/images/category-urban.jpg"
              alt="Accesorios para uso urbano en bicicleta"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
            <div className="absolute bottom-6 left-6 z-10">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-1">
                Dia a dia
              </p>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
                Uso Urbano
              </h3>
              <span className="mt-2 inline-block border-b border-white/50 pb-0.5 text-xs font-medium uppercase tracking-wider text-white/80">
                Ver Accesorios
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
