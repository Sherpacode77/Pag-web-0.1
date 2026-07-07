"use client"

import { Fragment, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, Package, Receipt } from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { formatPrice } from "@/lib/data"

type OrderItem = {
  id: number
  product_id: string
  product_name: string
  product_slug: string | null
  variant_color: string | null
  variant_color_name: string | null
  variant_size: string | null
  variant_size_name: string | null
  unit_price: number
  quantity: number
  subtotal: number
}

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

type ShippingAddress = {
  delivery_method: "envio" | "retiro"
  address_line: string | null
  apartment: string | null
  city: string | null
  department: string | null
  postal_code: string | null
  country: string | null
}

type Order = {
  id: number
  order_number: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_document: string | null
  shipping_address: ShippingAddress | null
  status: OrderStatus
  mercadopago_status: string | null
  payment_method: string | null
  subtotal: number
  shipping_cost: number
  discount: number
  total: number
  currency: string
  created_at: string
  items: OrderItem[]
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pendiente de pago", bg: "bg-orange-500/10", text: "text-orange-600" },
  paid: { label: "Pagado", bg: "bg-green-500/10", text: "text-green-700" },
  processing: { label: "En preparación", bg: "bg-blue-500/10", text: "text-blue-600" },
  shipped: { label: "Enviado", bg: "bg-blue-500/10", text: "text-blue-600" },
  delivered: { label: "Entregado", bg: "bg-green-500/10", text: "text-green-700" },
  cancelled: { label: "Cancelado", bg: "bg-red-500/10", text: "text-red-600" },
  refunded: { label: "Reembolsado", bg: "bg-red-500/10", text: "text-red-600" },
}

const STATUS_FILTERS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente de pago" },
  { value: "paid", label: "Pagado" },
  { value: "processing", label: "En preparación" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "refunded", label: "Reembolsado" },
]

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

function variantLabel(item: OrderItem): string {
  return [item.variant_color_name, item.variant_size_name].filter(Boolean).join(" — ")
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all")
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const router = useRouter()

  useEffect(() => {
    async function bootstrap() {
      const isAuthenticated = await validateSession()
      if (!isAuthenticated) {
        router.push("/admin")
        return
      }
      await fetchOrders()
    }
    bootstrap()
  }, [router])

  async function validateSession() {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function fetchOrders() {
    try {
      const response = await fetch("/api/orders", { credentials: "include", cache: "no-store" })
      if (response.status === 401) {
        router.push("/admin")
        return
      }
      const data = await response.json()
      if (Array.isArray(data)) setOrders(data)
    } catch {
      // sin pedidos disponibles — se muestra la tabla vacía
    } finally {
      setLoading(false)
    }
  }

  function toggleExpanded(orderId: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const filteredOrders = orders.filter(
    (order) => statusFilter === "all" || order.status === statusFilter
  )

  const totalRevenue = orders
    .filter((o) => o.status !== "pending" && o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Receipt className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-sm text-muted-foreground">Total Pedidos</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "pending").length}
                </p>
                <p className="text-sm text-muted-foreground">Pendientes de pago</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div>
              <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">Ingresos (pagados)</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold uppercase tracking-wider">Gestión de Pedidos</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | OrderStatus)}
            className="px-4 py-2 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground">
            No hay pedidos {statusFilter !== "all" ? "con ese estado" : "todavía"}.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Pedido</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((order) => {
                    const isExpanded = expanded.has(order.id)
                    const statusConfig = STATUS_CONFIG[order.status]
                    return (
                      <Fragment key={order.id}>
                        <tr className="hover:bg-secondary/20">
                          <td className="px-4 py-4">
                            <p className="font-medium">{order.order_number}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium">{order.customer_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.customer_email ?? "Sin confirmar"}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold">{formatPrice(order.total)}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                            >
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => toggleExpanded(order.id)}
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-secondary/10 px-4 py-4">
                              <div className="mb-4 grid gap-4 text-sm sm:grid-cols-2">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    Contacto
                                  </p>
                                  <p>{order.customer_phone ?? "—"}</p>
                                  <p className="text-muted-foreground">
                                    Documento: {order.customer_document ?? "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    {order.shipping_address?.delivery_method === "retiro"
                                      ? "Retiro en tienda"
                                      : "Envío a domicilio"}
                                  </p>
                                  {order.shipping_address?.delivery_method !== "retiro" && (
                                    <p>
                                      {[
                                        order.shipping_address?.address_line,
                                        order.shipping_address?.apartment,
                                        order.shipping_address?.city,
                                        order.shipping_address?.department,
                                        order.shipping_address?.postal_code,
                                      ]
                                        .filter(Boolean)
                                        .join(", ") || "—"}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                {order.items.map((item) => {
                                  const label = variantLabel(item)
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
                                    >
                                      <div>
                                        <span className="font-medium">{item.product_name}</span>
                                        {label && (
                                          <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded">
                                            {label}
                                          </span>
                                        )}
                                        <span className="ml-2 text-muted-foreground">
                                          × {item.quantity}
                                        </span>
                                      </div>
                                      <span className="font-medium">{formatPrice(item.subtotal)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
