import { NextResponse } from "next/server"
import { listOrders } from "../../../lib/sqlite-store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId") || "demo-user"
  const orders = listOrders(userId)
  return NextResponse.json({
    mainMessage: orders.length ? "주문 내역 조회 완료" : "주문 내역이 없습니다.",
    statusMessages: ["주문 내역 조회 완료"],
    candidateCards: [],
    orderSummary: orders[0]
      ? {
          orderId: orders[0].orderId,
          productName: orders[0].productName,
          quantity: orders[0].quantity,
          paymentMethod: orders[0].paymentMethod,
          totalAmount: orders[0].totalAmount,
          status: orders[0].status,
          eta: orders[0].eta,
        }
      : null,
    uiActions: ["open_order_history"],
    orders,
  })
}
