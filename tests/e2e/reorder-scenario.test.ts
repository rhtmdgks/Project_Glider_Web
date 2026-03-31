import assert from "node:assert/strict"
import test from "node:test"
import { randomUUID } from "node:crypto"
import { processAgentTurn } from "../../lib/agent-orchestrator"

test("대표 재구매 시나리오: 애플망고 재구매부터 배송조회까지", async () => {
  const sessionId = `e2e-${randomUUID()}`
  const userId = "demo-user"
  const history: Array<{ role: "user" | "assistant"; content: string }> = []

  const firstUser = "B마트에서 저번에 구매했던 애플망고 사줘"
  const first = await processAgentTurn({ sessionId, userId, message: firstUser, history })
  history.push({ role: "user", content: firstUser }, { role: "assistant", content: first.mainMessage })

  assert.equal(first.stage, "showing_candidates")
  assert.match(first.mainMessage, /구매한 .* 이력|후보/)
  assert.ok(first.cards.length >= 2, "후보 상품은 2개 이상이어야 합니다.")
  assert.ok(first.cards.every((c) => c.type === "candidate"), "후보 카드는 candidate 타입이어야 합니다.")
  assert.ok(first.statusMessages.includes("후보 제시 완료"))

  const pickUser = "1번"
  const pick = await processAgentTurn({ sessionId, userId, message: pickUser, history })
  history.push({ role: "user", content: pickUser }, { role: "assistant", content: pick.mainMessage })

  assert.equal(pick.stage, "awaiting_purchase_confirmation")
  assert.match(pick.mainMessage, /구매를 진행할까요/)
  assert.ok(pick.cards.some((c) => c.type === "order"))
  assert.ok(pick.cards.some((c) => c.lines.some((line) => /결제.*금액|총 결제/.test(line))))

  const confirmUser = "네, 결제 진행해줘"
  const confirm = await processAgentTurn({ sessionId, userId, message: confirmUser, history })
  history.push({ role: "user", content: confirmUser }, { role: "assistant", content: confirm.mainMessage })

  assert.equal(confirm.stage, "order_completed")
  assert.match(confirm.mainMessage, /결제를 완료/)
  assert.ok(confirm.statusMessages.includes("결제 완료"))
  assert.ok(confirm.statusMessages.includes("주문 완료"))
  assert.ok(confirm.cards.some((c) => c.type === "order"))

  const ordersUser = "주문 내역 보여줘"
  const orders = await processAgentTurn({ sessionId, userId, message: ordersUser, history })
  history.push({ role: "user", content: ordersUser }, { role: "assistant", content: orders.mainMessage })

  assert.equal(orders.stage, "viewing_order_history")
  assert.match(orders.mainMessage, /주문 내역/)
  assert.ok(orders.cards.length >= 1, "주문내역은 최소 1건 이상이어야 합니다.")

  const trackingUser = "배송조회 해줘"
  const tracking = await processAgentTurn({ sessionId, userId, message: trackingUser, history })

  assert.equal(tracking.stage, "tracking_delivery")
  assert.match(tracking.mainMessage, /배송 상태/)
  assert.ok(tracking.cards.some((c) => c.type === "delivery"))
  const trackingLines = tracking.cards.flatMap((c) => c.lines)
  assert.ok(trackingLines.some((line) => line.includes("결제완료")))
  assert.ok(trackingLines.some((line) => line.includes("배송예정")))
})
