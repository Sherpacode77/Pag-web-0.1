"use client"

export type EcommerceItem = {
  id: string
  name: string
  category?: string
  price: number
  quantity: number
}

type TrackingWindow = Window & {
  gtag?: (...args: unknown[]) => void
  fbq?: (...args: unknown[]) => void
  dataLayer?: Array<Record<string, unknown>>
}

function getWindow() {
  return window as TrackingWindow
}

function getValue(items: EcommerceItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function trackAddToCart(item: EcommerceItem) {
  const currentWindow = getWindow()
  const value = item.price * item.quantity

  if (typeof currentWindow.gtag === "function") {
    currentWindow.gtag("event", "add_to_cart", {
      currency: "COP",
      value,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          item_category: item.category,
          price: item.price,
          quantity: item.quantity,
        },
      ],
    })
  }

  if (typeof currentWindow.fbq === "function") {
    currentWindow.fbq("track", "AddToCart", {
      content_ids: [item.id],
      content_name: item.name,
      content_type: "product",
      value,
      currency: "COP",
    })
  }
}

export function trackBeginCheckout(items: EcommerceItem[]) {
  const currentWindow = getWindow()
  const value = getValue(items)

  if (typeof currentWindow.gtag === "function") {
    currentWindow.gtag("event", "begin_checkout", {
      currency: "COP",
      value,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category,
        price: item.price,
        quantity: item.quantity,
      })),
    })
  }

  if (typeof currentWindow.fbq === "function") {
    currentWindow.fbq("track", "InitiateCheckout", {
      contents: items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price,
      })),
      num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      value,
      currency: "COP",
    })
  }
}

export async function sendFacebookServerEvent(input: {
  eventName: string
  eventId?: string
  customData?: Record<string, unknown>
  userData?: Record<string, unknown>
}) {
  try {
    await fetch("/api/tracking/facebook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName: input.eventName,
        eventId: input.eventId,
        eventSourceUrl: window.location.href,
        customData: input.customData,
        userData: input.userData,
      }),
    })
  } catch {
    // Best-effort tracking only.
  }
}
