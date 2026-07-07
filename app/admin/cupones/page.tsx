"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { CouponManager } from "@/components/admin/coupon-manager"

export default function AdminCuponesPage() {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
        if (!res.ok) {
          router.push("/admin")
          return
        }
      } catch {
        router.push("/admin")
        return
      }
      setChecking(false)
    }
    bootstrap()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <CouponManager />
      </main>
    </div>
  )
}
