import Image from "next/image"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      <video
        autoPlay
        muted
        loop
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/video-home.mp4" type="video/mp4" />
        <Image
          src="/images/hero-bikepacking.jpg"
          alt="Ciclista de bikepacking en los Andes colombianos"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </video>
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex h-full flex-col items-center justify-start px-4 text-center pt-32 md:pt-40 lg:pt-48">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-primary md:text-sm">
          Marcamos la diferencia®
        </p>
        <h1 className="max-w-4xl text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl lg:text-8xl text-balance">
          Equipate para tu próxima aventura
        </h1>
        <p className="mt-6 max-w-lg text-sm text-white/70 leading-relaxed md:text-base">
          Bolsos de bikepacking y accesorios impermeables de alto rendimiento.
          Diseñados y fabricados 100% en Colombia.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/tienda"
            className="bg-primary text-primary-foreground px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            Descubre la Coleccion
          </Link>
          <Link
            href="#bestsellers"
            className="border border-white/30 text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
          >
            Mas Vendidos
          </Link>
        </div>
      </div>

      {/* Trust badges at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl flex items-center justify-center gap-8 px-4 py-4 md:gap-16">
          <div className="flex items-center gap-3">
            <Image
              src="/images/impermeable1.png"
              alt="100% Impermeable"
              width={48}
              height={48}
              className="h-10 w-10 md:h-12 md:w-12"
            />
            <span className="hidden text-xs font-medium uppercase tracking-wider text-white/80 sm:block">
              100% Impermeable
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Image
              src="/images/altogramaje1.png"
              alt="Alto Gramaje con filtro UV"
              width={48}
              height={48}
              className="h-10 w-10 md:h-12 md:w-12"
            />
            <span className="hidden text-xs font-medium uppercase tracking-wider text-white/80 sm:block">
              Alto Gramaje UV
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Image
              src="/images/100colombiano1.png"
              alt="100% Hecho en Colombia"
              width={48}
              height={48}
              className="h-10 w-10 md:h-12 md:w-12"
            />
            <span className="hidden text-xs font-medium uppercase tracking-wider text-white/80 sm:block">
              Hecho en Colombia
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
