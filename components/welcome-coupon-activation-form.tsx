"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { TermsModal } from "./terms-modal"

interface WelcomeCouponActivationFormProps {
  token: string
  couponCode: string
  alreadyActivated: boolean
}

const inputClass =
  "w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"

export function WelcomeCouponActivationForm({
  token,
  couponCode,
  alreadyActivated,
}: WelcomeCouponActivationFormProps) {
  const [fullName, setFullName] = useState("")
  const [document, setDocument] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [acceptConsent, setAcceptConsent] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activated, setActivated] = useState(alreadyActivated)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/welcome-coupon/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          full_name: fullName,
          document,
          whatsapp,
          consent: acceptConsent,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "No se pudo activar el cupón")
        return
      }
      setActivated(true)
    } catch {
      setError("Error de conexión, intenta de nuevo")
    } finally {
      setSubmitting(false)
    }
  }

  if (activated) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
          Cupón activado
        </p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
          ¡Ya puedes usarlo!
        </h1>
        <div className="mt-8 bg-primary/10 border border-primary/20 px-6 py-5 rounded-md">
          <span className="block text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Tu código
          </span>
          <span className="block text-xl font-bold text-primary tracking-wide">{couponCode}</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Úsalo en el checkout de tu primera compra.
        </p>
        <Link
          href="/tienda"
          className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2 text-center">
        Un último paso
      </p>
      <h1 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl text-center">
        Activa tu cupón {couponCode}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground text-center">
        Completa tus datos de contacto para dejar listo tu 10% OFF.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <input
          type="text"
          required
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          required
          placeholder="Número de cédula"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          className={inputClass}
        />
        <input
          type="tel"
          required
          placeholder="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          className={inputClass}
        />

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={acceptConsent}
            onChange={(e) => setAcceptConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            Acepto el{" "}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-primary underline hover:no-underline"
            >
              tratamiento de mis datos personales
            </button>
          </span>
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={!acceptConsent || submitting}
          className={`w-full py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
            !acceptConsent || submitting
              ? "cursor-not-allowed bg-secondary text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {submitting ? "Activando..." : "Activar mi cupón"}
        </button>
      </form>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  )
}
