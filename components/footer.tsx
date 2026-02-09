import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image
              src="/images/marca-alta-blancorecurso-207.png"
              alt="CERO.UNO"
              width={140}
              height={35}
              className="h-8 w-auto mb-4"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Equipo impermeable de alto rendimiento para bikepacking y ciclismo
              urbano. Disenado y fabricado 100% en Colombia.
            </p>
            <div className="mt-4 flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="TikTok"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13.2a8.22 8.22 0 004.77 1.52v-3.4a4.85 4.85 0 01-.81.07 4.84 4.84 0 01-2.38-.62v-.02z" />
                </svg>
              </a>
              <a
                href="https://strava.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Strava"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
              </a>
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">
              Tienda
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href="/tienda?category=bikepacking"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Bikepacking
                </Link>
              </li>
              <li>
                <Link
                  href="/tienda?category=accesorios"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Accesorios
                </Link>
              </li>
              <li>
                <Link
                  href="/tienda?category=ropa"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Ropa
                </Link>
              </li>
              <li>
                <Link
                  href="/tienda?category=kits"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Kits
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">
              Info
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href="#nosotros"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Nosotros
                </Link>
              </li>
              <li>
                <Link
                  href="#logistica"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Logistica
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Journal
                </Link>
              </li>
              <li>
                <a
                  href="mailto:info@ceropuntouno.co"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-4">
              Soporte
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <span className="text-xs text-muted-foreground">
                  Politica de envios
                </span>
              </li>
              <li>
                <span className="text-xs text-muted-foreground">
                  Cambios y devoluciones
                </span>
              </li>
              <li>
                <span className="text-xs text-muted-foreground">
                  Terminos y condiciones
                </span>
              </li>
              <li>
                <span className="text-xs text-muted-foreground">
                  Politica de privacidad
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            {"2025 CERO.UNO. Todos los derechos reservados. Hecho con pasion en Colombia."}
          </p>
          <div className="flex items-center gap-2">
            <Image
              src="/images/100colombiano.png"
              alt="Hecho en Colombia"
              width={32}
              height={32}
              className="h-8 w-8"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
