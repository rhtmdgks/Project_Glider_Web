import { NextResponse } from "next/server"
import { getDeliveryEvents, getOrderById } from "../../../../lib/sqlite-store"

export async function GET(_: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params
  const order = getOrderById(orderId)
  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 })
  return NextResponse.json({
    mainMessage: "배송 조회 완료",
    statusMessages: ["배송 조회 완료"],
    candidateCards: [],
    orderSummary: {
      orderId: order.orderId,
      productName: order.productName,
      quantity: order.quantity,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      status: order.status,
      eta: order.eta,
    },
    uiActions: ["refresh_delivery_status"],
    order,
    events: getDeliveryEvents(orderId),
  })
}
