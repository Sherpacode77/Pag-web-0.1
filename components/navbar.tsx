"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShoppingBag, Menu, X, Search } from "lucide-react"
import { useCart } from "@/lib/cart-context"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { totalItems, setIsOpen } = useCart()

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-primary text-primary-foreground overflow-hidden">
        <div className="animate-marquee flex whitespace-nowrap py-1.5 text-xs font-medium tracking-wider uppercase">
          <span className="mx-8">
            Envio gratis en compras superiores a $200.000 COP
          </span>
          <span className="mx-8">100% Hecho en Colombia</span>
          <span className="mx-8">Telas impermeables con filtro UV</span>
          <span className="mx-8">
            Envio gratis en compras superiores a $200.000 COP
          </span>
          <span className="mx-8">100% Hecho en Colombia</span>
          <span className="mx-8">Telas impermeables con filtro UV</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/marca-alta-blancorecurso-207.png"
              alt="CERO.UNO Logo"
              width={160}
              height={40}
              className="h-8 w-auto lg:h-10"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/tienda"
              className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary transition-colors"
            >
              Tienda
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary transition-colors"
            >
              Journal
            </Link>
            <Link
              href="#logistica"
              className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary transition-colors"
            >
              Logistica
            </Link>
            <Link
              href="#nosotros"
              className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary transition-colors"
            >
              Nosotros
            </Link>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-4">
            <button type="button" aria-label="Buscar" className="text-foreground hover:text-primary transition-colors">
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="relative text-foreground hover:text-primary transition-colors"
              onClick={() => setIsOpen(true)}
              aria-label="Carrito de compras"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border bg-background px-4 py-6">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href="/tienda"
                className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Tienda
              </Link>
              <Link
                href="/blog"
                className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Journal
              </Link>
              <Link
                href="#logistica"
                className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Logistica
              </Link>
              <Link
                href="#nosotros"
                className="text-sm font-medium uppercase tracking-wider text-foreground hover:text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Nosotros
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
