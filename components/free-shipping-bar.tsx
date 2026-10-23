"use client"

import { formatPrice } from "@/lib/data"
import { FREE_SHIPPING_PROMO_LABEL, FREE_SHIPPING_THRESHOLD, isFreeShippingPromoActive } from "@/lib/shipping"

export function FreeShippingBar({ total }: { total: number }) {
  if (isFreeShippingPromoActive()) {
    return (
      <div className="mb-4 rounded-sm border border-primary/40 bg-primary/10 px-3 py-2">
        <p className="text-xs font-semibold text-primary">
          ¡Envío GRATIS a toda Colombia {FREE_SHIPPING_PROMO_LABEL}! Paga al recibir sin recargo.
        </p>
      </div>
    )
  }
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total)
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100)
  const unlocked = remaining === 0

  return (
    <div className="mb-4">
      <p className={`text-xs mb-1.5 ${unlocked ? "font-semibold text-primary" : "text-muted-foreground"}`}>
        {unlocked ? (
          "¡Envío gratis desbloqueado!"
        ) : (
          <>
            Te faltan <span className="font-semibold text-foreground">{formatPrice(remaining)}</span> para envío gratis
          </>
        )}
      </p>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
