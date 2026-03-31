import { retrieveProductCandidates, generateModelAnswer, findReorderItem, classifyAndParseQuery, type QueryIntentType } from "./food-rag-runtime"
import { createVirtualOrder, getDeliveryEvents, getOrderById, getUserSettings, listOrders, updateUserSettings } from "./sqlite-store"
import type { AgentResponse, AgentStage, AssistantCard, UCPProduct } from "./ucp-types"

type SessionState = {
  stage: AgentStage
  candidates: UCPProduct[]
  selected: UCPProduct | null
  quantity: number
}

const sessions = new Map<string, SessionState>()

function getSession(sessionId: string): SessionState {
  const current = sessions.get(sessionId)
  if (current) return current
  const fresh: SessionState = { stage: "idle", candidates: [], selected: null, quantity: 1 }
  sessions.set(sessionId, fresh)
  return fresh
}

function parseMaxPrice(message: string): number | undefined {
  const m1 = message.match(/(\d+)\s*만원\s*이하/)
  if (m1) return Number(m1[1]) * 10000
  const m2 = message.match(/(\d+)\s*원\s*이하/)
  if (m2) return Number(m2[1])
  return undefined
}

function toStructuredCandidateCards(candidates: UCPProduct[]) {
  return candidates.map((c, idx) => ({
    title: c.canonical_name,
    merchantName: c.merchant_name,
    price: c.discount_price,
    eta: c.delivery_eta,
    stockStatus: c.stock_status,
    recommendationReason:
      idx === 0
        ? "질의 의도, 접근성 조건, 배송 ETA를 종합했을 때 가장 적합한 후보입니다."
        : "가격/재고/배송 조건에서 균형이 좋아 대안 후보로 적합합니다.",
    exclusionReason:
      idx === 0 ? undefined : "1순위 대비 ETA 또는 재구매 적합도가 낮아 우선순위가 뒤입니다.",
    accessibilitySummary: c.accessibility_summary,
  }))
}

function toLegacyCards(response: Pick<AgentResponse, "candidateCards" | "orderSummary">): AssistantCard[] {
  const candidateCards = (response.candidateCards || []).map((card) => ({
    type: "candidate" as const,
    title: card.title,
    lines: [
      `판매처: ${card.merchantName}`,
      `가격: ${card.price.toLocaleString("ko-KR")}원`,
      `재고: ${card.stockStatus}`,
      `배송: ${card.eta}`,
      `추천 이유: ${card.recommendationReason}`,
      `접근성: ${card.accessibilitySummary}`,
    ],
  }))

  const orderCard = response.orderSummary
    ? [
        {
          type: "order" as const,
          title: `주문번호 ${response.orderSummary.orderId}`,
          lines: [
            `상품: ${response.orderSummary.productName}`,
            `수량: ${response.orderSummary.quantity}개`,
            `결제수단: ${response.orderSummary.paymentMethod}`,
            `상태: ${response.orderSummary.status}`,
            `배송 예정: ${response.orderSummary.eta}`,
            `총 결제금액: ${response.orderSummary.totalAmount.toLocaleString("ko-KR")}원`,
          ],
        },
      ]
    : []
  return [...candidateCards, ...orderCard]
}

function buildResponse(input: Omit<AgentResponse, "cards">): AgentResponse {
  const uiActions = input.uiActions || []
  const settingCards = uiActions
    .filter((action) => action.startsWith("setting:"))
    .map((action) => {
      const [, key, ...rest] = action.split(":")
      return {
        type: "setting" as const,
        title: `설정 변경: ${key}`,
        lines: [rest.join(":") || "updated"],
      }
    })
  const deliveryCards = uiActions
    .filter((action) => action.startsWith("delivery_event:"))
    .map((action) => ({
      type: "delivery" as const,
      title: "배송 이벤트",
      lines: [action.replace("delivery_event:", "")],
    }))

  return {
    ...input,
    cards: [...toLegacyCards(input), ...settingCards, ...deliveryCards],
  }
}

async function buildModelResponse(params: {
  message: string
  history: Array<{ role: "user" | "assistant"; content: string }>
  instruction: string
  stage: AgentStage
  parsed?: Awaited<ReturnType<typeof classifyAndParseQuery>>
  statusMessages: string[]
  candidateCards?: AgentResponse["candidateCards"]
  orderSummary?: AgentResponse["orderSummary"]
  uiActions?: string[]
  extraContext?: string[]
}): Promise<AgentResponse> {
  const mainMessage = await generateModelAnswer({
    message: params.message,
    parsed: params.parsed,
    history: params.history,
    instruction: params.instruction,
    extraContext: params.extraContext,
  })

  return buildResponse({
    stage: params.stage,
    mainMessage,
    statusMessages: params.statusMessages,
    candidateCards: params.candidateCards || [],
    orderSummary: params.orderSummary || null,
    uiActions: params.uiActions || [],
  })
}

type AgentAction =
  | "welcome"
  | "order_history"
  | "track_delivery"
  | "update_address"
  | "update_payment_method"
  | "update_voice"
  | "update_accessibility"

type AgentActionPayload = {
  orderId?: string
  defaultAddress?: string
  defaultPaymentMethod?: string
  voiceStyle?: string
  accessibility?: Record<string, boolean>
}

function parseQuantity(message: string, fallbackQuantity?: number) {
  if (fallbackQuantity && fallbackQuantity > 0) return fallbackQuantity
  const m = message.match(/(\d+)\s*(개|팩|봉|세트|병)?/)
  return m ? Math.max(1, Number(m[1])) : 1
}

function resolveActionFromIntent(intentType: QueryIntentType): AgentAction | undefined {
  switch (intentType) {
    case "order_history":
      return "order_history"
    case "track_delivery":
      return "track_delivery"
    default:
      return undefined
  }
}

function resolveSettingsAction(message: string): AgentAction | undefined {
  if (/주소 변경|배송지 변경/.test(message)) return "update_address"
  if (/결제 수단 변경|결제수단 변경/.test(message)) return "update_payment_method"
  if (/음성 설정|음성 종류|보이스 변경/.test(message)) return "update_voice"
  if (/접근성 설정|고대비|큰 글씨|간소화/.test(message)) return "update_accessibility"
  return undefined
}

export async function processAgentTurn(params: {
  sessionId: string
  userId: string
  message: string
  history: Array<{ role: "user" | "assistant"; content: string }>
  action?: AgentAction
  payload?: AgentActionPayload
}): Promise<AgentResponse> {
  const state = getSession(params.sessionId)
  const text = params.message.trim()
  const settings = getUserSettings(params.userId) ?? getUserSettings("demo-user")
  const parsedQuery = text ? await classifyAndParseQuery({ message: text, history: params.history }) : null
  const action =
    params.action ??
    resolveSettingsAction(text) ??
    (parsedQuery ? resolveActionFromIntent(parsedQuery.intentType) : undefined)

  if (action === "order_history" || /주문 내역|주문목록|최근 주문/.test(text)) {
    state.stage = "viewing_order_history"
    const orders = listOrders(params.userId).slice(0, 5)
    const orderSummary = orders[0]
      ? {
          orderId: orders[0].orderId,
          productName: orders[0].productName,
          quantity: orders[0].quantity,
          paymentMethod: orders[0].paymentMethod,
          totalAmount: orders[0].totalAmount,
          status: orders[0].status,
          eta: orders[0].eta,
        }
      : null
    return buildModelResponse({
      message: text || "주문 내역 보여줘",
      parsed: parsedQuery ?? undefined,
      history: params.history,
      instruction: "사용자에게 최근 주문 내역 조회 결과를 친절하고 간단히 설명해라. 주문이 없으면 없다고 분명히 말해라.",
      stage: "viewing_order_history",
      statusMessages: ["주문 내역 조회 완료"],
      candidateCards: [],
      orderSummary,
      uiActions: ["open_orders_page", "track_latest_order"],
      extraContext: [
        `주문 개수: ${orders.length}`,
        ...orders.slice(0, 3).map((order, index) => `${index + 1}. ${order.productName} / ${order.quantity}개 / ${order.status} / ${order.eta}`),
      ],
    })
  }

  if (action === "track_delivery" || /배송조회|배송 조회|배송 상태/.test(text)) {
    state.stage = "tracking_delivery"
    const targetOrderId = params.payload?.orderId || listOrders(params.userId)[0]?.orderId
    const latest = targetOrderId ? getOrderById(targetOrderId) : null
    if (!latest || !targetOrderId) {
      return buildModelResponse({
        message: text || "배송조회 해줘",
        parsed: parsedQuery ?? undefined,
        history: params.history,
        instruction: "사용자에게 배송조회 대상 주문이 없다는 점을 간단히 설명하고 다음 행동을 제안해라.",
        stage: "tracking_delivery",
        statusMessages: ["배송조회 실패"],
        candidateCards: [],
        orderSummary: null,
        uiActions: ["open_orders_page"],
      })
    }
    const events = getDeliveryEvents(targetOrderId)
    return buildModelResponse({
      message: text || "배송조회 해줘",
      parsed: parsedQuery ?? undefined,
      history: params.history,
      instruction: "사용자에게 현재 배송 상태를 짧고 명확하게 설명해라.",
      stage: "tracking_delivery",
      statusMessages: ["배송조회 완료"],
      candidateCards: [],
      orderSummary: {
        orderId: latest.orderId,
        productName: latest.productName,
        quantity: latest.quantity,
        paymentMethod: latest.paymentMethod,
        totalAmount: latest.totalAmount,
        status: latest.status,
        eta: latest.eta,
      },
      uiActions: events.map((e) => `delivery_event:${e.status}`),
      extraContext: events.map((e, index) => `배송 이벤트 ${index + 1}: ${e.status}`),
    })
  }

  if (action === "update_address" || /주소 변경|배송지 변경/.test(text)) {
    state.stage = "updating_address"
    const changed = updateUserSettings(params.userId, {
      defaultAddress: params.payload?.defaultAddress || "서울특별시 마포구 월드컵북로 77, 502호",
    })
    return buildModelResponse({
      message: text || "배송지 변경",
      parsed: parsedQuery ?? undefined,
      history: params.history,
      instruction: "배송지 변경 완료 사실을 짧게 안내해라.",
      stage: "updating_address",
      statusMessages: ["설정 업데이트 완료"],
      candidateCards: [],
      orderSummary: null,
      uiActions: [`setting:defaultAddress:${changed?.defaultAddress || "none"}`],
      extraContext: [`새 배송지: ${changed?.defaultAddress || "none"}`],
    })
  }

  if (action === "update_payment_method" || /결제 수단 변경|결제수단 변경/.test(text)) {
    state.stage = "updating_payment_method"
    const changed = updateUserSettings(params.userId, {
      defaultPaymentMethod: params.payload?.defaultPaymentMethod || "신한카드",
    })
    return buildModelResponse({
      message: text || "결제수단 변경",
      parsed: parsedQuery ?? undefined,
      history: params.history,
      instruction: "기본 결제수단 변경 완료 사실을 짧게 안내해라.",
      stage: "updating_payment_method",
      statusMessages: ["설정 업데이트 완료"],
      candidateCards: [],
      orderSummary: null,
      uiActions: [`setting:defaultPaymentMethod:${changed?.defaultPaymentMethod || "none"}`],
      extraContext: [`새 결제수단: ${changed?.defaultPaymentMethod || "none"}`],
    })
  }

  if (action === "update_voice" || /음성 설정|음성 종류|보이스 변경/.test(text)) {
    state.stage = "updating_voice"
    const changed = updateUserSettings(params.userId, {
      voiceStyle: params.payload?.voiceStyle || "명확한 음성",
    })
    return buildModelResponse({
      message: text || "음성 설정 변경",
      parsed: parsedQuery ?? undefined,
      history: params.history,
      instruction: "음성 스타일 설정 변경 완료 사실을 짧게 안내해라. 응답 TTS는 비활성 상태라는 점은 언급하지 마라.",
      stage: "updating_voice",
      statusMessages: ["설정 업데이트 완료"],
      candidateCards: [],
      orderSummary: null,
      uiActions: [`setting:voiceStyle:${changed?.voiceStyle || "기본"}`],
      extraContext: [`새 음성 스타일: ${changed?.voiceStyle || "기본"}`],
    })
  }

  if (action === "update_accessibility" || /접근성 설정|고대비|큰 글씨|간소화/.test(text)) {
    state.stage = "updating_accessibility"
    const changed = updateUserSettings(params.userId, {
      accessibility: params.payload?.accessibility || {
        largeText: true,
        highContrast: true,
        simplifiedMode: true,
        voiceFeedback: true,
      },
    })
    return buildModelResponse({
      message: text || "접근성 설정 변경",
      parsed: parsedQuery ?? undefined,
      history: params.history,
      instruction: "접근성 설정 업데이트 완료 사실을 짧고 분명하게 안내해라.",
      stage: "updating_accessibility",
      statusMessages: ["설정 업데이트 완료"],
      candidateCards: [],
      orderSummary: null,
      uiActions: Object.entries(changed?.accessibility || {}).map(([k, v]) => `setting:accessibility:${k}:${v ? "on" : "off"}`),
      extraContext: Object.entries(changed?.accessibility || {}).map(([k, v]) => `${k}: ${v ? "on" : "off"}`),
    })
  }

  if (state.stage === "showing_candidates" || state.stage === "awaiting_purchase_confirmation") {
    const pick = text.match(/^([1-3])(?:번)?$/)
    if (pick && state.candidates[Number(pick[1]) - 1]) {
      state.selected = state.candidates[Number(pick[1]) - 1]
      state.stage = "awaiting_purchase_confirmation"
      return buildModelResponse({
        message: text,
        parsed: parsedQuery ?? undefined,
        history: params.history,
        instruction: "사용자가 후보 상품을 선택했다. 구매 진행 여부를 확인하는 짧은 안내 문장을 만들어라.",
        stage: "awaiting_purchase_confirmation",
        statusMessages: ["상품 선택 완료", "구매 확인 대기"],
        candidateCards: [],
        orderSummary: {
          orderId: "PENDING",
          productName: state.selected.canonical_name,
          quantity: state.quantity,
          paymentMethod: settings?.defaultPaymentMethod || "국민카드",
          totalAmount: state.selected.discount_price * state.quantity,
          status: "awaiting_purchase_confirmation",
          eta: state.selected.delivery_eta,
        },
        uiActions: ["confirm_purchase", "cancel_purchase"],
      })
    }

    if (parsedQuery?.intentType === "purchase_confirmation" && state.selected) {
      state.stage = "processing_payment"
      const order = createVirtualOrder({
        userId: params.userId,
        productId: state.selected.product_id,
        productName: state.selected.canonical_name,
        quantity: state.quantity,
        selectedOptions: state.selected.option_set.slice(0, 1),
        paymentMethod: settings?.defaultPaymentMethod || "국민카드",
        merchantName: state.selected.merchant_name,
        eta: state.selected.delivery_eta,
        totalAmount: state.selected.discount_price * state.quantity,
      })
      state.stage = "order_completed"
      state.selected = null
      state.candidates = []
      return buildModelResponse({
        message: text,
        parsed: parsedQuery ?? undefined,
        history: params.history,
        instruction: "결제와 주문이 완료되었다. 결제수단, 상품명, 배송 예정 정보를 짧고 안심되게 설명해라.",
        stage: "order_completed",
        statusMessages: ["결제 진행 중...", "결제 완료", "주문 완료", "배송 상태 생성 완료"],
        candidateCards: [],
        orderSummary: order
          ? {
              orderId: order.orderId,
              productName: order.productName,
              quantity: order.quantity,
              paymentMethod: order.paymentMethod,
              totalAmount: order.totalAmount,
              status: order.status,
              eta: order.eta,
            }
          : null,
        uiActions: ["open_orders_page", "track_delivery"],
      })
    }
  }

  if (parsedQuery?.intentType === "product_search" || parsedQuery?.intentType === "reorder") {
    const searchMessage = parsedQuery.searchQuery || text
    state.stage = "searching_products"
    state.quantity = parseQuantity(text, parsedQuery.quantity)
    const maxPrice = parsedQuery.maxPrice ?? parseMaxPrice(text)
    const reorder = parsedQuery.intentType === "reorder" ? findReorderItem(text, params.userId) : null
    const candidates = await retrieveProductCandidates({
      message: searchMessage,
      parsed: parsedQuery,
      preferredMerchant: parsedQuery.store || reorder?.merchant_name,
      maxPrice,
      userId: params.userId,
    })
    state.candidates = candidates
    state.stage = "showing_candidates"
    return buildModelResponse({
      message: searchMessage,
      parsed: parsedQuery,
      history: params.history,
      instruction: reorder
        ? "재구매 이력을 반영해 후보를 찾았음을 자연스럽게 설명하고, 카드의 1~3번 후보 중 고르라고 안내해라."
        : "사용자 요청 조건에 맞는 후보를 찾았음을 설명하고, 카드의 1~3번 후보 중 고르라고 안내해라.",
      stage: "showing_candidates",
      statusMessages: ["상품 탐색 중...", "검색 완료", "후보 제시 완료"],
      candidateCards: toStructuredCandidateCards(candidates),
      orderSummary: null,
      uiActions: ["choose_candidate_1", "choose_candidate_2", "choose_candidate_3"],
      extraContext: [
        ...(parsedQuery.productKeywords.length ? [`해석 키워드: ${parsedQuery.productKeywords.join(", ")}`] : []),
        ...(parsedQuery.store ? [`요청 판매처: ${parsedQuery.store}`] : []),
        ...(reorder
          ? [`재구매 이력: ${new Date(reorder.purchased_at).toLocaleDateString("ko-KR")} / ${reorder.product_name_snapshot}`]
          : []),
      ],
    })
  }

  return buildModelResponse({
    message: text,
    parsed: parsedQuery ?? undefined,
    history: params.history,
    instruction: "일반 질의에 답변하되, 필요하면 식료품 구매·주문 맥락과 연결해서 실용적으로 설명해라.",
    stage: "idle",
    statusMessages: ["일반 질의 응답 완료"],
    candidateCards: [],
    orderSummary: null,
    uiActions: [],
  })
}

export function createWelcomeResponse(): AgentResponse {
  return buildResponse({
    stage: "idle",
    mainMessage:
      "안녕하세요. Glider 구매 지원 에이전트입니다. 식료품 구매, 재구매, 배송조회, 주문내역, 결제/주소/접근성/음성 설정까지 도와드릴 수 있습니다.",
    statusMessages: ["대기 중"],
    candidateCards: [],
    orderSummary: null,
    uiActions: [
      "prompt:저번에 샀던 애플망고 다시 사줘",
      "prompt:오늘 안에 오는 상추 추천해줘",
      "prompt:주문 내역 보여줘",
      "prompt:배송조회 해줘",
    ],
  })
}
