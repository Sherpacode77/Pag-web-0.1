"use client"

import { useState, useEffect, type FormEvent } from "react"
import { TermsModal } from "./terms-modal"
import { Combobox } from "./ui/combobox"
import { COLOMBIAN_CITIES, COLOMBIAN_DEPARTMENTS, BOGOTA_CITY_NAME, BOGOTA_LOCALITIES } from "@/lib/colombia-locations"
import {
  CASH_ON_DELIVERY_SURCHARGE,
  SHIPPING_COST_SABANA,
  SHIPPING_COST_NACIONAL,
  getShippingZone,
  type PaymentMethod,
} from "@/lib/shipping"
import { formatPrice } from "@/lib/data"

// "Bogotá D.C." se excluye de las opciones de Municipio cuando la Ciudad NO es
// Bogotá -- ese departamento solo tiene sentido si la ciudad elegida es Bogotá,
// y en ese caso el campo ya muestra las localidades en su lugar (ver mas abajo).
const NON_BOGOTA_DEPARTMENTS = COLOMBIAN_DEPARTMENTS.filter((d) => d !== "Bogotá D.C.")

export type Passenger = {
  firstName: string
  lastName: string
  document: string
  phone: string
}

export type CheckoutFormData = {
  email: string
  // Pasajeros 2..N de un cupo de CERO.UNO Travel; el pasajero 1 son los campos
  // firstName/lastName/phone/document del comprador.
  extraPassengers: Passenger[]
  newsletterOptIn: boolean
  deliveryMethod: "envio" | "retiro" | "servicio"
  paymentMethod: PaymentMethod
  firstName: string
  lastName: string
  document: string
  address: string
  apartment: string
  neighborhood: string
  city: string
  department: string
  postalCode: string
  phone: string
}

type FieldErrors = Partial<
  Record<"email" | "firstName" | "lastName" | "document" | "phone" | "address" | "city" | "department", string>
>

const FIELD_LABELS: Record<keyof FieldErrors, string> = {
  email: "Correo electrónico",
  firstName: "Nombre",
  lastName: "Apellidos",
  document: "Número de Cédula o ID",
  phone: "Teléfono",
  address: "Dirección",
  city: "Ciudad",
  department: "Municipio o Localidad",
}

interface CheckoutFormProps {
  onBack: () => void
  onSubmit: (data: CheckoutFormData) => void
  submitting: boolean
  onDeliveryMethodChange?: (method: "envio" | "retiro" | "servicio") => void
  // El carrito lleva solo cupos de CERO.UNO Travel: no hay nada que despachar.
  onlyServices?: boolean
  // Cupos en el carrito: hay que pedir los datos de cada pasajero.
  passengerCount?: number
  onPaymentMethodChange?: (method: PaymentMethod) => void
  onCityChange?: (city: string) => void
  onMissingFieldsChange?: (fields: string[]) => void
}

export function CheckoutForm({
  onBack,
  onSubmit,
  submitting,
  onlyServices = false,
  passengerCount = 1,
  onDeliveryMethodChange,
  onPaymentMethodChange,
  onCityChange,
  onMissingFieldsChange,
}: CheckoutFormProps) {
  const [form, setForm] = useState<CheckoutFormData>({
    email: "",
    extraPassengers: [],
    newsletterOptIn: true,
    deliveryMethod: onlyServices ? "servicio" : "envio",
    paymentMethod: "mercadopago",
    firstName: "",
    lastName: "",
    document: "",
    address: "",
    apartment: "",
    neighborhood: "",
    city: "",
    department: "",
    postalCode: "",
    phone: "",
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [extraErrors, setExtraErrors] = useState<{ firstName: string; lastName: string; phone: string }[]>([])

  useEffect(() => {
    setForm((prev) => {
      const next = onlyServices ? "servicio" : prev.deliveryMethod === "servicio" ? "envio" : prev.deliveryMethod
      return next === prev.deliveryMethod ? prev : { ...prev, deliveryMethod: next }
    })
    if (onlyServices) {
      setForm((prev) => (prev.paymentMethod === "mercadopago" ? prev : { ...prev, paymentMethod: "mercadopago" }))
    }
  }, [onlyServices])

  useEffect(() => {
    onDeliveryMethodChange?.(form.deliveryMethod)
  }, [form.deliveryMethod, onDeliveryMethodChange])

  useEffect(() => {
    onPaymentMethodChange?.(form.paymentMethod)
  }, [form.paymentMethod, onPaymentMethodChange])

  useEffect(() => {
    onCityChange?.(form.city)
  }, [form.city, onCityChange])

  const extraNeeded = onlyServices ? Math.max(0, passengerCount - 1) : 0
  useEffect(() => {
    setForm((prev) => {
      if (prev.extraPassengers.length === extraNeeded) return prev
      const next = prev.extraPassengers.slice(0, extraNeeded)
      while (next.length < extraNeeded) {
        next.push({ firstName: "", lastName: "", document: "", phone: "" })
      }
      return { ...prev, extraPassengers: next }
    })
  }, [extraNeeded])

  // El recargo por pagar al recibir solo existe cuando hay transportadora de por
  // medio; recogiendo en tienda el pago en efectivo no cuesta nada extra.
  const isPickup = form.deliveryMethod === "retiro"

  function update<K extends keyof CheckoutFormData>(key: K, value: CheckoutFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    const emailFilled = form.email.trim().length > 0
    // En un cupo de transporte el correo y la cedula son opcionales: muchos
    // clientes llegan por WhatsApp y no los dan. Si escriben correo, se valida.
    if (!onlyServices || emailFilled) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Correo inválido"
    }
    if (!form.firstName.trim()) next.firstName = "Requerido"
    if (!form.lastName.trim()) next.lastName = "Requerido"
    if (!onlyServices && !form.document.trim()) next.document = "Requerido"
    if (!form.phone.trim()) next.phone = "Requerido"
    if (form.deliveryMethod === "envio") {
      if (!form.address.trim()) next.address = "Requerido"
      if (!form.city.trim()) next.city = "Requerido"
      if (!form.department.trim()) next.department = "Requerido"
    }
    const missing = (Object.keys(next) as (keyof FieldErrors)[]).map((key) => FIELD_LABELS[key])

    // Cada cupo viaja con una persona distinta: sin sus datos el equipo
    // logistico no sabe a quien esperar.
    const nextExtra = form.extraPassengers.map((pax) => ({
      firstName: pax.firstName.trim() ? "" : "Requerido",
      lastName: pax.lastName.trim() ? "" : "Requerido",
      phone: pax.phone.trim() ? "" : "Requerido",
    }))
    nextExtra.forEach((err, i) => {
      if (err.firstName || err.lastName || err.phone) missing.push(`Datos del pasajero ${i + 2}`)
    })

    setErrors(next)
    setExtraErrors(nextExtra)
    onMissingFieldsChange?.(missing)
    return missing.length === 0
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
          placeholder={onlyServices ? "Correo electrónico (opcional)" : "Correo electrónico"}
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
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-card-foreground">
          {onlyServices ? (passengerCount > 1 ? "Datos de los pasajeros" : "Datos del pasajero") : "Entrega"}
        </h3>
        {onlyServices ? (
          <p className="mb-3 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            Estás apartando tu cupo de transporte: aquí pagas el abono del 50%; el saldo lo pagas al
            equipo logístico de CERO.UNO el día del viaje. Te escribiremos por WhatsApp para compartir
            contigo el punto de embarque y la hora exacta de encuentro.
          </p>
        ) : (
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
        )}

        <div className="flex flex-col gap-3">
          {onlyServices && passengerCount > 1 && (
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Pasajero 1</p>
          )}
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
              placeholder={onlyServices ? "Número de Cédula o ID (opcional)" : "Número de Cédula o ID"}
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
                placeholder="Detalles de la dirección: Casa, apartamento, etc. (opcional)"
                value={form.apartment}
                onChange={(e) => update("apartment", e.target.value)}
                className={inputClass}
              />

              <input
                type="text"
                placeholder="Referencias adicionales: Barrio, en frente de, etc. (opcional)"
                value={form.neighborhood}
                onChange={(e) => update("neighborhood", e.target.value)}
                className={inputClass}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Combobox
                    options={COLOMBIAN_CITIES}
                    value={form.city}
                    placeholder="Ciudad"
                    error={!!errors.city}
                    emptyText="Ninguna ciudad coincide."
                    onChange={(value) => {
                      // Si cambia de ciudad, el Municipio elegido (departamento
                      // o localidad de Bogota) ya no aplica -- se limpia para
                      // que el cliente vuelva a elegir sobre las opciones correctas.
                      update("city", value)
                      update("department", "")
                    }}
                  />
                  {errors.city && <p className={errorClass}>{errors.city}</p>}
                </div>
                <div>
                  <Combobox
                    options={
                      form.city === BOGOTA_CITY_NAME
                        ? BOGOTA_LOCALITIES
                        : NON_BOGOTA_DEPARTMENTS
                    }
                    value={form.department}
                    placeholder="Municipio o Localidad"
                    error={!!errors.department}
                    emptyText="Ninguna opción coincide."
                    onChange={(value) => update("department", value)}
                  />
                  {errors.department && <p className={errorClass}>{errors.department}</p>}
                </div>
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

          {form.extraPassengers.map((pax, i) => {
            const err = extraErrors[i]
            const setPax = (key: keyof Passenger, value: string) =>
              setForm((prev) => {
                const next = [...prev.extraPassengers]
                next[i] = { ...next[i], [key]: value }
                return { ...prev, extraPassengers: next }
              })
            return (
              <div key={i} className="flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Pasajero {i + 2}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={pax.firstName}
                      onChange={(e) => setPax("firstName", e.target.value)}
                      className={inputClass}
                    />
                    {err?.firstName && <p className={errorClass}>{err.firstName}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Apellidos"
                      value={pax.lastName}
                      onChange={(e) => setPax("lastName", e.target.value)}
                      className={inputClass}
                    />
                    {err?.lastName && <p className={errorClass}>{err.lastName}</p>}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Número de Cédula o ID (opcional)"
                  value={pax.document}
                  onChange={(e) => setPax("document", e.target.value)}
                  className={inputClass}
                />
                <div>
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={pax.phone}
                    onChange={(e) => setPax("phone", e.target.value)}
                    className={inputClass}
                  />
                  {err?.phone && <p className={errorClass}>{err.phone}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-card-foreground">Método de pago</h3>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => update("paymentMethod", "mercadopago")}
            className={`flex items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors ${
              form.paymentMethod === "mercadopago"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span>
              <span className="block text-sm font-medium text-card-foreground">Pago en línea</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Tarjeta, PSE o Nequi a través de Mercado Pago.
              </span>
            </span>
            <span className="whitespace-nowrap text-xs font-bold uppercase text-primary">Sin recargo</span>
          </button>

          {!onlyServices && (
          <button
            type="button"
            onClick={() => update("paymentMethod", "contraentrega")}
            className={`flex items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors ${
              form.paymentMethod === "contraentrega"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span>
              <span className="block text-sm font-medium text-card-foreground">
                {isPickup ? "Pago al recoger" : "Pago contraentrega"}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {isPickup
                  ? "Pagas en efectivo al recoger tu pedido en la tienda."
                  : "Pagas en efectivo cuando recibes tu pedido."}
              </span>
            </span>
            <span
              className={`whitespace-nowrap text-xs font-bold uppercase ${
                isPickup ? "text-primary" : "text-foreground"
              }`}
            >
              {isPickup ? "Sin recargo" : `+${formatPrice(CASH_ON_DELIVERY_SURCHARGE)}`}
            </span>
          </button>
          )}
        </div>

        {form.paymentMethod === "contraentrega" && (
          <p className="mt-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            {isPickup ? (
              <>
                Al recoger en tienda no hay recargo: el costo adicional de{" "}
                <strong className="text-card-foreground">{formatPrice(CASH_ON_DELIVERY_SURCHARGE)}</strong>{" "}
                solo aplica cuando pagas contraentrega con envío a domicilio.
              </>
            ) : (
              <>
                Elegir pago contraentrega tiene un costo adicional de{" "}
                <strong className="text-card-foreground">{formatPrice(CASH_ON_DELIVERY_SURCHARGE)}</strong>,
                ya incluido en el total de tu pedido.
              </>
            )}
          </p>
        )}

        {form.deliveryMethod === "envio" && (
          <p className="mt-2 text-xs text-muted-foreground">
            {form.city
              ? getShippingZone(form.city) === "sabana"
                ? `Envío a ${form.city}: ${formatPrice(SHIPPING_COST_SABANA)}.`
                : `Envío a ${form.city}: ${formatPrice(SHIPPING_COST_NACIONAL)}.`
              : `Envío: ${formatPrice(SHIPPING_COST_SABANA)} en Bogotá y la sabana, ${formatPrice(
                  SHIPPING_COST_NACIONAL
                )} para el resto del país.`}
          </p>
        )}
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
        {submitting
          ? "Procesando..."
          : form.paymentMethod === "contraentrega"
            ? "Confirmar pedido"
            : "Ir a pagar"}
      </button>

      <p className="-mt-3 text-center text-xs text-muted-foreground">
        {form.paymentMethod === "contraentrega"
          ? isPickup
            ? "No pagas ahora. Confirmamos tu pedido y pagas al recogerlo en la tienda."
            : "No pagas ahora. Confirmamos tu pedido y pagas al recibirlo."
          : "Te llevaremos a Mercado Pago para completar el pago de forma segura."}
      </p>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </form>
  )
}
