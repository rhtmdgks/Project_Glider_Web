import { NextResponse } from "next/server"
import { createWelcomeResponse, processAgentTurn } from "../../../lib/agent-orchestrator"

type ReqBody = {
  message?: string
  history?: Array<{ role: "user" | "assistant"; content: string }>
  sessionId?: string
  userId?: string
  action?:
    | "welcome"
    | "order_history"
    | "track_delivery"
    | "update_address"
    | "update_payment_method"
    | "update_voice"
    | "update_accessibility"
  payload?: {
    orderId?: string
    defaultAddress?: string
    defaultPaymentMethod?: string
    voiceStyle?: string
    accessibility?: Record<string, boolean>
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReqBody
    if (body.action === "welcome") {
      const welcome = createWelcomeResponse()
      return NextResponse.json(welcome)
    }

    const message = body.message?.trim() || ""
    const actionNeedsMessage = !body.action
    if (actionNeedsMessage && !message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 })
    }

    const history = Array.isArray(body.history) ? body.history : []
    const result = await processAgentTurn({
      sessionId: body.sessionId || "default-session",
      userId: body.userId || "demo-user",
      message,
      history,
      action: body.action,
      payload: body.payload,
    })

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
