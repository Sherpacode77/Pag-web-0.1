"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { Product } from "./data"

export interface CartItem {
  product: Product
  quantity: number
  variantColor?: string
  variantColorName?: string
  variantSize?: string
  variantSizeName?: string
}

export type CartItemVariant = {
  variantColor?: string
  variantColorName?: string
  variantSize?: string
  variantSizeName?: string
}

// Clave única por producto+color+talla — dos variantes distintas del mismo
// producto NUNCA deben fusionarse en una sola línea del carrito.
export function getCartItemKey(item: { product: Product } & Partial<CartItemVariant>): string {
  return `${item.product.id}|${item.variantColor ?? "_"}|${item.variantSize ?? "_"}`
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, variant?: CartItemVariant) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addItem = useCallback((product: Product, variant?: CartItemVariant) => {
    const key = getCartItemKey({ product, ...variant })
    setItems((prev) => {
      const existing = prev.find((item) => getCartItemKey(item) === key)
      if (existing) {
        return prev.map((item) =>
          getCartItemKey(item) === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, ...variant }]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => getCartItemKey(item) !== key))
  }, [])

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(key)
        return
      }
      setItems((prev) =>
        prev.map((item) =>
          getCartItemKey(item) === key ? { ...item, quantity } : item
        )
      )
    },
    [removeItem]
  )

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
