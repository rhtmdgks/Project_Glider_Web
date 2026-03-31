"use client"

import { useEffect, useState } from "react"

type Order = {
  orderId: string
  productName: string
  quantity: number
  totalAmount: number
  status: string
  eta: string
  createdAt: string
}

type DeliveryEvent = {
  status: string
  message: string
  createdAt: string
}

type DeliveryResponse = {
  events: DeliveryEvent[]
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [deliveryByOrderId, setDeliveryByOrderId] = useState<Record<string, DeliveryEvent[]>>({})
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null)

  async function loadOrders() {
    const res = await fetch("/api/orders")
    const data = await res.json()
    setOrders(data.orders || [])
  }

  async function loadDelivery(orderId: string) {
    setLoadingOrderId(orderId)
    const res = await fetch(`/api/delivery/${orderId}`)
    const data = (await res.json()) as DeliveryResponse
    setDeliveryByOrderId((prev) => ({ ...prev, [orderId]: data.events || [] }))
    setLoadingOrderId(null)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">주문 내역 및 배송조회</h1>
      <div className="space-y-3">
        {orders.length === 0 && <div className="text-sm text-zinc-500">주문 내역이 없습니다.</div>}
        {orders.map((order) => (
          <div key={order.orderId} className="rounded-xl border p-3 sm:p-4">
            <div className="font-medium">{order.productName}</div>
            <div className="text-sm text-zinc-600">
              {order.quantity}개 · {order.totalAmount.toLocaleString("ko-KR")}원 · {order.status}
            </div>
            <div className="text-xs text-zinc-500">주문시각: {new Date(order.createdAt).toLocaleString("ko-KR")}</div>
            <div className="text-xs text-zinc-500">도착예정: {order.eta}</div>
            <button className="mt-2 rounded border px-3 py-1 text-sm" onClick={() => loadDelivery(order.orderId)}>
              {loadingOrderId === order.orderId ? "조회 중..." : "배송조회"}
            </button>
            {deliveryByOrderId[order.orderId]?.length ? (
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                {deliveryByOrderId[order.orderId].map((e, idx) => (
                  <div key={`${order.orderId}-${idx}`}>
                    <span className="font-medium">{e.status}</span> · {e.message}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  )
}
