export type CommerceChannel = "coupang" | "kurly" | "baemin"

export type ChannelProduct = {
  id: string
  channel: CommerceChannel
  name: string
  price: number
  stock: number
  option: string
  etaMinutes: number
  paymentMethods: string[]
}

export type UCPProduct = {
  ucpId: string
  sourceChannel: CommerceChannel
  productName: string
  normalizedOption: string
  quantityAvailable: number
  priceKRW: number
  etaMinutes: number
  paymentMethods: string[]
}

export type PurchaseIntent = {
  rawText: string
  query: string
  isReorder: boolean
  quantity: number
  maxPrice?: number
}

export type AgentStage = "idle" | "awaiting_selection" | "awaiting_confirmation"

export type AgentState = {
  stage: AgentStage
  lastIntent?: PurchaseIntent
  candidates?: UCPProduct[]
  selected?: UCPProduct
}

const CHANNEL_PRODUCTS: ChannelProduct[] = [
  {
    id: "cp-1",
    channel: "coupang",
    name: "애플망고 2입",
    price: 12900,
    stock: 17,
    option: "2입/중과",
    etaMinutes: 140,
    paymentMethods: ["카드", "간편결제", "계좌이체"],
  },
  {
    id: "cp-2",
    channel: "coupang",
    name: "유기농 우유 1L",
    price: 2980,
    stock: 42,
    option: "냉장/1L",
    etaMinutes: 95,
    paymentMethods: ["카드", "간편결제"],
  },
  {
    id: "mk-1",
    channel: "kurly",
    name: "프리미엄 애플망고 2입",
    price: 15800,
    stock: 8,
    option: "선물포장 가능",
    etaMinutes: 220,
    paymentMethods: ["카드", "간편결제", "포인트"],
  },
  {
    id: "mk-2",
    channel: "kurly",
    name: "저염 닭가슴살 10팩",
    price: 19900,
    stock: 33,
    option: "플레인/100g",
    etaMinutes: 180,
    paymentMethods: ["카드", "간편결제", "포인트"],
  },
  {
    id: "bm-1",
    channel: "baemin",
    name: "생수 2L 6개",
    price: 5900,
    stock: 21,
    option: "묶음배송",
    etaMinutes: 38,
    paymentMethods: ["카드", "간편결제", "현장결제"],
  },
  {
    id: "bm-2",
    channel: "baemin",
    name: "즉시배달 두유 190ml 24팩",
    price: 16900,
    stock: 12,
    option: "무가당",
    etaMinutes: 44,
    paymentMethods: ["카드", "간편결제"],
  },
]

const PURCHASE_HISTORY = [
  { name: "애플망고", preferredChannel: "kurly" as CommerceChannel },
  { name: "유기농 우유", preferredChannel: "coupang" as CommerceChannel },
]

const CHANNEL_LABEL: Record<CommerceChannel, string> = {
  coupang: "쿠팡",
  kurly: "마켓컬리",
  baemin: "배민",
}

function toUCP(products: ChannelProduct[]): UCPProduct[] {
  return products.map((item) => ({
    ucpId: `ucp:${item.channel}:${item.id}`,
    sourceChannel: item.channel,
    productName: item.name,
    normalizedOption: item.option,
    quantityAvailable: item.stock,
    priceKRW: item.price,
    etaMinutes: item.etaMinutes,
    paymentMethods: item.paymentMethods,
  }))
}

function parseMaxPrice(text: string): number | undefined {
  const m1 = text.match(/(\d+)\s*만원\s*이하/)
  if (m1) return Number(m1[1]) * 10000
  const m2 = text.match(/(\d+)\s*원\s*이하/)
  if (m2) return Number(m2[1])
  return undefined
}

function parseQuantity(text: string): number {
  const m = text.match(/(\d+)\s*(개|팩|봉|병|세트|상자)?/)
  if (!m) return 1
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : 1
}

function parseIntent(rawText: string): PurchaseIntent {
  const text = rawText.trim()
  const isReorder = /(다시|재구매|저번|지난번|전에 샀던)/.test(text)
  const maxPrice = parseMaxPrice(text)
  const quantity = parseQuantity(text)
  const cleaned = text
    .replace(/다시|재구매|저번|지난번|전에 샀던|사줘|구매해줘|주문해줘|찾아줘/g, "")
    .replace(/\s+/g, " ")
    .trim()
  const fallbackHistory = PURCHASE_HISTORY[0]?.name ?? "생필품"
  return {
    rawText,
    query: cleaned || (isReorder ? fallbackHistory : text),
    isReorder,
    quantity,
    maxPrice,
  }
}

function scoreProduct(intent: PurchaseIntent, p: UCPProduct): number {
  let score = 0
  const q = intent.query.toLowerCase()
  if (p.productName.toLowerCase().includes(q)) score += 7
  if (intent.isReorder) {
    const h = PURCHASE_HISTORY.find((x) => p.productName.includes(x.name))
    if (h) score += 3
    if (h?.preferredChannel === p.sourceChannel) score += 2
  }
  score += Math.max(0, 4 - Math.floor(p.etaMinutes / 60))
  score += p.priceKRW <= 10000 ? 2 : 0
  if (intent.maxPrice != null && p.priceKRW <= intent.maxPrice) score += 4
  if (intent.maxPrice != null && p.priceKRW > intent.maxPrice) score -= 6
  if (p.quantityAvailable <= 0) score -= 10
  return score
}

function recommend(intent: PurchaseIntent): UCPProduct[] {
  const standardized = toUCP(CHANNEL_PRODUCTS)
  const filtered = standardized
    .filter((p) => p.quantityAvailable > 0)
    .filter((p) => {
      if (!intent.query) return true
      const q = intent.query.toLowerCase()
      return p.productName.toLowerCase().includes(q) || q.split(" ").some((w) => p.productName.toLowerCase().includes(w))
    })
    .sort((a, b) => scoreProduct(intent, b) - scoreProduct(intent, a))
  return filtered.slice(0, 3)
}

function formatCurrency(v: number): string {
  return `${v.toLocaleString("ko-KR")}원`
}

function formatCandidateLine(idx: number, p: UCPProduct): string {
  return `${idx + 1}) [${CHANNEL_LABEL[p.sourceChannel]}] ${p.productName} · ${formatCurrency(p.priceKRW)} · ${p.normalizedOption} · 약 ${p.etaMinutes}분`
}

function parseSelection(text: string): number | null {
  const m = text.trim().match(/^([1-3])(?:번)?$/)
  if (m) return Number(m[1]) - 1
  return null
}

function isConfirm(text: string): boolean {
  return /(결제|구매 진행|진행해|확정|네|응|예|좋아)/.test(text)
}

function isCancel(text: string): boolean {
  return /(취소|중지|아니오|아니)/.test(text)
}

export function createInitialAgentMessage(): string {
  return [
    "안녕하세요, Glider 구매 지원 에이전트입니다.",
    "음성/텍스트로 원하는 상품을 말하면 UCP 표준화 기반으로 여러 채널 상품을 비교해 드립니다.",
    "예시: '저번에 샀던 애플망고 다시 사줘', '우유 2개 1만원 이하로 찾아줘'",
  ].join("\n")
}

export function runCommerceAgent(input: string, prevState?: AgentState): { nextState: AgentState; message: string } {
  const state: AgentState = prevState ?? { stage: "idle" }

  if (state.stage === "awaiting_selection" && state.candidates) {
    const pick = parseSelection(input)
    if (pick != null && state.candidates[pick]) {
      const selected = state.candidates[pick]
      const nextState: AgentState = {
        ...state,
        stage: "awaiting_confirmation",
        selected,
      }
      const msg = [
        "주문 확인 단계입니다.",
        `- 상품: ${selected.productName}`,
        `- 채널: ${CHANNEL_LABEL[selected.sourceChannel]}`,
        `- 수량: ${state.lastIntent?.quantity ?? 1}개`,
        `- 옵션: ${selected.normalizedOption}`,
        `- 결제수단: ${selected.paymentMethods.join(", ")}`,
        `- 예상 도착: 약 ${selected.etaMinutes}분`,
        `- 결제 예정 금액: ${formatCurrency(selected.priceKRW * (state.lastIntent?.quantity ?? 1))}`,
        "진행하려면 '결제 진행' 또는 '네'라고 입력해 주세요. 취소하려면 '취소'라고 입력해 주세요.",
      ].join("\n")
      return { nextState, message: msg }
    }
    return {
      nextState: state,
      message: "후보 번호를 선택해 주세요. 예: 1번, 2번, 3번",
    }
  }

  if (state.stage === "awaiting_confirmation" && state.selected) {
    if (isCancel(input)) {
      return {
        nextState: { stage: "idle" },
        message: "주문이 취소되었습니다. 다른 상품을 원하시면 다시 요청해 주세요.",
      }
    }
    if (isConfirm(input)) {
      const selected = state.selected
      const quantity = state.lastIntent?.quantity ?? 1
      const total = selected.priceKRW * quantity
      return {
        nextState: { stage: "idle" },
        message: [
          "상태: 상품 탐색 완료",
          "상태: 결제 진행 중",
          "상태: 결제 완료",
          `주문이 접수되었습니다. (${CHANNEL_LABEL[selected.sourceChannel]})`,
          `- 주문상품: ${selected.productName} / ${quantity}개`,
          `- 총 결제금액: ${formatCurrency(total)}`,
          `- 배송 예정: 약 ${selected.etaMinutes}분 후`,
          `- 주문번호: GLD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        ].join("\n"),
      }
    }
    return {
      nextState: state,
      message: "결제를 진행하려면 '결제 진행' 또는 '네', 중단하려면 '취소'를 입력해 주세요.",
    }
  }

  const intent = parseIntent(input)
  const candidates = recommend(intent)
  if (candidates.length === 0) {
    return {
      nextState: { stage: "idle", lastIntent: intent },
      message: [
        "상태: 상품 탐색 중",
        "검색 결과가 없습니다.",
        "다른 키워드나 조건(가격/수량)을 조금 완화해서 다시 요청해 주세요.",
      ].join("\n"),
    }
  }

  const message = [
    "상태: 상품 탐색 중",
    "상태: 검색 완료",
    `요청 해석 결과: '${intent.query}' / 수량 ${intent.quantity}개${intent.maxPrice ? ` / 최대 ${formatCurrency(intent.maxPrice)}` : ""}`,
    "",
    "추천 후보:",
    ...candidates.map((p, idx) => formatCandidateLine(idx, p)),
    "",
    "원하는 번호를 입력해 주세요. (예: 1번)",
  ].join("\n")

  return {
    nextState: {
      stage: "awaiting_selection",
      lastIntent: intent,
      candidates,
    },
    message,
  }
}
