"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Lock, User, Eye, EyeOff } from "lucide-react"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Verificar si ya está autenticado
    const token = localStorage.getItem("adminToken")
    if (token) {
      router.push("/admin/dashboard")
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem("adminToken", data.token)
        localStorage.setItem("adminUser", JSON.stringify(data.user))
        router.push("/admin/dashboard")
      } else {
        setError(data.error || "Error de autenticación")
      }
    } catch (error) {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/images/marca-alta-blancorecurso-207.png"
            alt="CERO.UNO Logo"
            width={200}
            height={50}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
            Panel de Administración
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Gestiona tus productos y contenido
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider"
              >
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-md font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Credenciales por defecto:
              <br />
              <span className="font-mono">admin / cerouno2026</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-sm text-primary hover:underline uppercase tracking-wider"
          >
            ← Volver al sitio
          </a>
        </div>
      </div>
    </div>
  )
}
