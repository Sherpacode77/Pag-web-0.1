"use client"

import Image from "next/image"
import { X, Minus, Plus, ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/data"

export function CartSidebar() {
  const { items, removeItem, updateQuantity, totalPrice, isOpen, setIsOpen } =
    useCart()

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
                        src={item.product.image || "/placeholder.svg"}
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
                className="w-full bg-primary text-primary-foreground py-3 text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                Finalizar Compra
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
