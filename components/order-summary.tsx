"use client"

import { useState } from "react"
import Image from "next/image"
import { Tag, X, MapPin } from "lucide-react"
import type { CartItem } from "@/lib/cart-context"
import { formatPrice } from "@/lib/data"
import { assetUrl } from "@/lib/assets"
import { calculateShippingCost, PICKUP_LOCATION } from "@/lib/shipping"

interface OrderSummaryProps {
  items: CartItem[]
  deliveryMethod: "envio" | "retiro"
  onCouponChange: (code: string | null) => void
}

type CouponStatus = "idle" | "checking" | "applied" | "error"

export function OrderSummary({ items, deliveryMethod, onCouponChange }: OrderSummaryProps) {
  const [couponInput, setCouponInput] = useState("")
  const [status, setStatus] = useState<CouponStatus>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState(0)

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shippingCost = calculateShippingCost(subtotal, deliveryMethod)
  const offerSavings = items.reduce((sum, item) => {
    if (!item.product.originalPrice) return sum
    return sum + (item.product.originalPrice - item.product.price) * item.quantity
  }, 0)
  const totalSavings = offerSavings + appliedDiscount
  const total = subtotal - appliedDiscount + shippingCost

  async function handleApplyCoupon() {
    if (!couponInput.trim() || status === "checking") return
    setStatus("checking")
    setMessage(null)

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      })
      const result = (await res.json()) as {
        valid: boolean
        reason?: string
        discountAmount?: number
        code?: string
      }

      if (!result.valid) {
        setStatus("error")
        setMessage(result.reason ?? "Código inválido")
        return
      }

      setAppliedCode(result.code ?? couponInput.trim().toUpperCase())
      setAppliedDiscount(result.discountAmount ?? 0)
      setStatus("applied")
      setMessage(null)
      onCouponChange(result.code ?? couponInput.trim().toUpperCase())
    } catch {
      setStatus("error")
      setMessage("Error validando el cupón")
    }
  }

  function handleRemoveCoupon() {
    setAppliedCode(null)
    setAppliedDiscount(0)
    setCouponInput("")
    setStatus("idle")
    setMessage(null)
    onCouponChange(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const key = `${item.product.id}|${item.variantColor ?? "_"}|${item.variantSize ?? "_"}`
          const variantLabel = [item.variantColorName, item.variantSizeName].filter(Boolean).join(" / ")
          return (
            <div key={key} className="flex gap-3">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded bg-secondary">
                <Image
                  src={assetUrl(item.product.image || "/placeholder.svg")}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {item.quantity}
                </span>
              </div>
              <div className="flex flex-1 items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-card-foreground leading-tight">{item.product.name}</p>
                  {variantLabel && (
                    <p className="text-xs uppercase text-muted-foreground">{variantLabel}</p>
                  )}
                </div>
                <div className="text-right">
                  {item.product.originalPrice && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(item.product.originalPrice * item.quantity)}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-card-foreground">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        {appliedCode ? (
          <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <Tag className="h-3.5 w-3.5" />
              {appliedCode}
            </span>
            <button type="button" onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Código de descuento"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={status === "checking" || !couponInput.trim()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {status === "checking" ? "..." : "Aplicar"}
            </button>
          </div>
        )}
        {message && <p className="mt-1.5 text-xs text-destructive">{message}</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotal · {items.reduce((sum, i) => sum + i.quantity, 0)} artículo{items.length !== 1 ? "s" : ""}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {appliedDiscount > 0 && (
          <div className="flex items-center justify-between text-primary">
            <span>Descuento{appliedCode ? ` (${appliedCode})` : ""}</span>
            <span>-{formatPrice(appliedDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{deliveryMethod === "retiro" ? "Retiro en tienda" : "Envío"}</span>
          <span>{shippingCost === 0 ? "GRATIS" : formatPrice(shippingCost)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-card-foreground">
          <span>Total</span>
          <span>COP {formatPrice(total)}</span>
        </div>
        {totalSavings > 0 && (
          <div className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Tag className="h-3 w-3" />
            AHORRO TOTAL {formatPrice(totalSavings)}
          </div>
        )}
      </div>

      {deliveryMethod === "retiro" && (
        <div className="rounded-md border border-border bg-secondary/30 p-4 text-sm">
          <p className="font-medium text-card-foreground">Punto de retiro</p>
          <a
            href={PICKUP_LOCATION.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-primary underline hover:no-underline"
          >
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {PICKUP_LOCATION.address}
          </a>
          <p className="mt-3 text-muted-foreground">
            Horario de atención: {PICKUP_LOCATION.hours}.
          </p>
          <p className="mt-1 text-muted-foreground">{PICKUP_LOCATION.note}</p>
          <div className="mt-3 overflow-hidden rounded-md border border-border">
            <iframe
              src={PICKUP_LOCATION.embedUrl}
              width="100%"
              height="180"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa del punto de retiro"
            />
          </div>
        </div>
      )}
    </div>
  )
}
