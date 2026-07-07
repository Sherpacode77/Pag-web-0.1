"use client"

import { useState, useEffect, type FormEvent } from "react"
import { TermsModal } from "./terms-modal"

export type CheckoutFormData = {
  email: string
  newsletterOptIn: boolean
  deliveryMethod: "envio" | "retiro"
  firstName: string
  lastName: string
  document: string
  address: string
  apartment: string
  city: string
  department: string
  postalCode: string
  phone: string
}

const COLOMBIAN_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas",
  "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía",
  "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander",
  "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima",
  "Valle del Cauca", "Vaupés", "Vichada",
]

type FieldErrors = Partial<Record<"email" | "firstName" | "lastName" | "document" | "phone" | "address" | "city", string>>

interface CheckoutFormProps {
  onBack: () => void
  onSubmit: (data: CheckoutFormData) => void
  submitting: boolean
  onDeliveryMethodChange?: (method: "envio" | "retiro") => void
}

export function CheckoutForm({ onBack, onSubmit, submitting, onDeliveryMethodChange }: CheckoutFormProps) {
  const [form, setForm] = useState<CheckoutFormData>({
    email: "",
    newsletterOptIn: true,
    deliveryMethod: "envio",
    firstName: "",
    lastName: "",
    document: "",
    address: "",
    apartment: "",
    city: "",
    department: "Bogotá D.C.",
    postalCode: "",
    phone: "",
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    onDeliveryMethodChange?.(form.deliveryMethod)
  }, [form.deliveryMethod, onDeliveryMethodChange])

  function update<K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Correo inválido"
    if (!form.firstName.trim()) next.firstName = "Requerido"
    if (!form.lastName.trim()) next.lastName = "Requerido"
    if (!form.document.trim()) next.document = "Requerido"
    if (!form.phone.trim()) next.phone = "Requerido"
    if (form.deliveryMethod === "envio") {
      if (!form.address.trim()) next.address = "Requerido"
      if (!form.city.trim()) next.city = "Requerido"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!acceptTerms || submitting) return
    if (!validate()) return
    onSubmit(form)
  }

  const inputClass =
    "w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
  const errorClass = "text-xs text-destructive mt-1"

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        ← Volver al carrito
      </button>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-card-foreground">Contacto</h3>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className={inputClass}
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={form.newsletterOptIn}
            onChange={(e) => update("newsletterOptIn", e.target.checked)}
            className="h-4 w-4"
          />
          Enviarme novedades y ofertas por correo electrónico
        </label>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-card-foreground">Entrega</h3>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update("deliveryMethod", "envio")}
            className={`rounded-md border py-2.5 text-sm font-medium transition-colors ${
              form.deliveryMethod === "envio"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            Envío
          </button>
          <button
            type="button"
            onClick={() => update("deliveryMethod", "retiro")}
            className={`rounded-md border py-2.5 text-sm font-medium transition-colors ${
              form.deliveryMethod === "retiro"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            Retiro
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                placeholder="Nombre"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={inputClass}
              />
              {errors.firstName && <p className={errorClass}>{errors.firstName}</p>}
            </div>
            <div>
              <input
                type="text"
                placeholder="Apellidos"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={inputClass}
              />
              {errors.lastName && <p className={errorClass}>{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Número de Cédula o ID"
              value={form.document}
              onChange={(e) => update("document", e.target.value)}
              className={inputClass}
            />
            {errors.document && <p className={errorClass}>{errors.document}</p>}
          </div>

          {form.deliveryMethod === "envio" && (
            <>
              <div>
                <input
                  type="text"
                  placeholder="Dirección"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className={inputClass}
                />
                {errors.address && <p className={errorClass}>{errors.address}</p>}
              </div>

              <input
                type="text"
                placeholder="Casa, apartamento, etc. (opcional)"
                value={form.apartment}
                onChange={(e) => update("apartment", e.target.value)}
                className={inputClass}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="Ciudad"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className={inputClass}
                  />
                  {errors.city && <p className={errorClass}>{errors.city}</p>}
                </div>
                <select
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  className={inputClass}
                >
                  {COLOMBIAN_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Código postal (opcional)"
                  value={form.postalCode}
                  onChange={(e) => update("postalCode", e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div>
            <input
              type="tel"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
            />
            {errors.phone && <p className={errorClass}>{errors.phone}</p>}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          Acepto los{" "}
          <button
            type="button"
            onClick={() => setShowTerms(true)}
            className="text-primary underline hover:no-underline"
          >
            Términos y Condiciones y la Política de Privacidad
          </button>
        </span>
      </label>

      <button
        type="submit"
        disabled={!acceptTerms || submitting}
        className={`w-full py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
          !acceptTerms || submitting
            ? "cursor-not-allowed bg-secondary text-muted-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {submitting ? "Procesando..." : "Finalizar Compra"}
      </button>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </form>
  )
}
