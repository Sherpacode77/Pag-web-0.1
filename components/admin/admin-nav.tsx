"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Package, Boxes, Tag } from "lucide-react"
import { assetUrl } from "@/lib/assets"

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
      // continuar con la redirección aunque falle
    }
    router.push("/admin")
  }

  const tabs = [
    { href: "/admin/dashboard", label: "Productos", icon: Package },
    { href: "/admin/inventario", label: "Inventario", icon: Boxes },
    { href: "/admin/ofertas", label: "Ofertas", icon: Tag },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Image
              src={assetUrl("/images/marca-alta-blancorecurso-207.png")}
              alt="CERO.UNO"
              width={120}
              height={30}
            />
            <span className="text-sm text-muted-foreground hidden sm:block">
              Panel de Administración
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="text-sm text-primary hover:underline">
              Ver sitio
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Tabs de navegación */}
        <nav className="flex gap-1 -mb-px">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
