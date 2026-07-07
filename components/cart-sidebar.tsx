"use client"

import { useState } from "react"
import Image from "next/image"
import { X, Minus, Plus, ShoppingBag } from "lucide-react"
import { useCart, getCartItemKey } from "@/lib/cart-context"
import { formatPrice } from "@/lib/data"
import { trackBeginCheckout, sendFacebookServerEvent } from "@/lib/tracking-client"
import { assetUrl } from "@/lib/assets"
import { FreeShippingBar } from "@/components/free-shipping-bar"
import { CheckoutForm, type CheckoutFormData } from "@/components/checkout-form"
import { OrderSummary } from "@/components/order-summary"

export function CartSidebar() {
  const { items, removeItem, updateQuantity, totalPrice, isOpen, setIsOpen } =
    useCart()
  const [step, setStep] = useState<"cart" | "checkout">("cart")
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<"envio" | "retiro">("envio")

  const handleConfirmAndPay = async (form: CheckoutFormData) => {
    if (items.length === 0 || isCheckingOut) return

    try {
      setIsCheckingOut(true)

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

      // 1. Crear el pedido (pendiente de pago) con los datos de contacto/envío
      // y el color/talla elegido por cada item, ANTES de ir a MercadoPago.
      // El servidor recalcula subtotal/envío/descuento — nunca confía en montos
      // enviados desde el cliente.
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        product_slug: item.product.slug,
        variant_color: item.variantColor ?? null,
        variant_color_name: item.variantColorName ?? null,
        variant_size: item.variantSize ?? null,
        variant_size_name: item.variantSizeName ?? null,
        unit_price: item.product.price,
        quantity: item.quantity,
      }))

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          customer_email: form.email,
          customer_name: `${form.firstName} ${form.lastName}`.trim(),
          customer_phone: form.phone,
          customer_document: form.document,
          newsletter_opt_in: form.newsletterOptIn,
          coupon_code: couponCode,
          shipping_address: {
            delivery_method: form.deliveryMethod,
            address_line: form.deliveryMethod === "envio" ? form.address : null,
            apartment: form.deliveryMethod === "envio" ? form.apartment : null,
            city: form.deliveryMethod === "envio" ? form.city : null,
            department: form.deliveryMethod === "envio" ? form.department : null,
            postal_code: form.deliveryMethod === "envio" ? form.postalCode : null,
            country: "Colombia",
          },
        }),
      })

      const orderResult = (await orderResponse.json()) as {
        order_number?: string
        subtotal?: number
        shipping_cost?: number
        discount?: number
        total?: number
        error?: string
      }

      if (!orderResponse.ok || !orderResult.order_number) {
        throw new Error(orderResult.error || "No se pudo registrar el pedido")
      }

      // 2. Crear la preferencia de MercadoPago, usando el número de pedido como
      // referencia externa para relacionarlos en el webhook. El total cobrado
      // debe coincidir EXACTO con el total ya calculado por el servidor
      // (subtotal - descuento + envío), así que se reduce proporcionalmente
      // el precio de cada item para reflejar el descuento aplicado, y se
      // agrega el envío como un item aparte.
      const subtotal = orderResult.subtotal ?? totalPrice
      const discount = orderResult.discount ?? 0
      const shippingCost = orderResult.shipping_cost ?? 0
      const discountFactor = subtotal > 0 ? (subtotal - discount) / subtotal : 1

      type MpItem = {
        id: string
        title: string
        unit_price: number
        quantity: number
        picture_url?: string
        category_id?: string
      }

      const cartItems: MpItem[] = items.map((item) => {
        const variantLabel = [item.variantColorName, item.variantSizeName]
          .filter(Boolean)
          .join(" — ")
        return {
          id: item.product.id,
          title: variantLabel ? `${item.product.name} (${variantLabel})` : item.product.name,
          unit_price: Math.round(item.product.price * discountFactor),
          quantity: item.quantity,
          picture_url: item.product.image,
          category_id: item.product.category,
        }
      })

      if (shippingCost > 0) {
        cartItems.push({
          id: "shipping",
          title: "Envío",
          unit_price: shippingCost,
          quantity: 1,
        })
      }

      const response = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cartItems,
          externalReference: orderResult.order_number,
          payer: {
            email: form.email,
            name: form.firstName,
            surname: form.lastName,
          },
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
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-card border-l border-border transition-[max-width] ${
          step === "checkout" ? "max-w-4xl" : "max-w-md"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-card-foreground">
            {step === "cart" ? "Tu Carrito" : "Datos de contacto y entrega"}
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
        ) : step === "checkout" ? (
          <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
            <div className="flex md:flex-1 md:overflow-y-auto">
              <CheckoutForm
                onBack={() => setStep("cart")}
                onSubmit={handleConfirmAndPay}
                submitting={isCheckingOut}
                onDeliveryMethodChange={setDeliveryMethod}
              />
            </div>
            <div className="border-t border-border px-6 py-6 md:w-[340px] md:flex-shrink-0 md:overflow-y-auto md:border-l md:border-t-0">
              <OrderSummary items={items} deliveryMethod={deliveryMethod} onCouponChange={setCouponCode} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex flex-col gap-4">
                {items.map((item) => {
                  const key = getCartItemKey(item)
                  const variantLabel = [item.variantColorName, item.variantSizeName]
                    .filter(Boolean)
                    .join(" — ")
                  return (
                    <div
                      key={key}
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
                          {variantLabel && (
                            <p className="text-xs text-muted-foreground">{variantLabel}</p>
                          )}
                          <p className="text-sm text-primary font-semibold">
                            {formatPrice(item.product.price)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(key, item.quantity - 1)
                              }
                              className="flex h-7 w-7 items-center justify-center border border-border text-foreground hover:bg-secondary transition-colors"
                              aria-label="Disminuir cantidad"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value, 10)
                                if (Number.isFinite(value) && value > 0) {
                                  updateQuantity(key, value)
                                }
                              }}
                              className="h-7 w-10 border-y border-border bg-transparent text-center text-sm font-medium text-card-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              aria-label="Cantidad"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(key, item.quantity + 1)
                              }
                              className="flex h-7 w-7 items-center justify-center border border-border text-foreground hover:bg-secondary transition-colors"
                              aria-label="Aumentar cantidad"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(key)}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors uppercase tracking-wider"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-border px-6 py-4">
              <FreeShippingBar total={totalPrice} />
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
                onClick={() => setStep("checkout")}
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
