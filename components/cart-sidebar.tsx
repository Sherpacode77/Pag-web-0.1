"use client"

import { useState } from "react"
import Image from "next/image"
import { X, Minus, Plus, ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/data"
import { trackBeginCheckout, sendFacebookServerEvent } from "@/lib/tracking-client"
import { assetUrl } from "@/lib/assets"

export function CartSidebar() {
  const { items, removeItem, updateQuantity, totalPrice, isOpen, setIsOpen } =
    useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const handleCheckout = async () => {
    if (items.length === 0 || isCheckingOut) return

    try {
      setIsCheckingOut(true)

      const cartItems = items.map((item) => ({
        id: item.product.id,
        title: item.product.name,
        unit_price: item.product.price,
        quantity: item.quantity,
        picture_url: item.product.image,
        category_id: item.product.category,
      }))

      trackBeginCheckout(
        items.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          category: item.product.category,
          price: item.product.price,
          quantity: item.quantity,
        }))
      )

      void sendFacebookServerEvent({
        eventName: "InitiateCheckout",
        eventId: `checkout-${Date.now()}`,
        customData: {
          currency: "COP",
          value: totalPrice,
          content_type: "product",
          contents: items.map((item) => ({
            id: item.product.id,
            quantity: item.quantity,
            item_price: item.product.price,
          })),
        },
      })

      const response = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems,
          externalReference: `cart-${Date.now()}`,
        }),
      })

      const result = (await response.json()) as {
        init_point?: string
        sandbox_init_point?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(result.error || "No se pudo iniciar el checkout")
      }

      const checkoutUrl = result.init_point || result.sandbox_init_point
      if (!checkoutUrl) {
        throw new Error("Mercado Pago no devolvio una URL de pago")
      }

      window.location.href = checkoutUrl
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error iniciando checkout"
      alert(message)
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        onKeyDown={() => {}}
        role="presentation"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-card-foreground">
            Tu Carrito
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar carrito"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Tu carrito esta vacio
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
            >
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-4 border-b border-border pb-4"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden bg-secondary">
                      <Image
                        src={assetUrl(item.product.image || "/placeholder.svg")}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-card-foreground">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-primary font-semibold">
                          {formatPrice(item.product.price)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center border border-border text-foreground hover:bg-secondary transition-colors"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium text-card-foreground w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center border border-border text-foreground hover:bg-secondary transition-colors"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors uppercase tracking-wider"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm uppercase tracking-wider text-muted-foreground">
                  Subtotal
                </span>
                <span className="text-lg font-bold text-card-foreground">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full bg-primary text-primary-foreground py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                {isCheckingOut ? "Conectando..." : "Finalizar Compra"}
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Envio gratis en compras superiores a $200.000 COP
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
