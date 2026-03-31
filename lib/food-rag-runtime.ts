import OpenAI from "openai"
import { loadFoodProducts, loadPurchaseHistory } from "../data/loaders"
import type { FoodCategory, FoodProduct, PurchaseHistoryItem, UCPProduct } from "./ucp-types"

const FOOD_PRODUCTS = loadFoodProducts()
const PURCHASE_HISTORY = loadPurchaseHistory()

const CATEGORY_KEYWORDS: Record<FoodCategory, string[]> = {
  과일: ["과일", "딸기", "망고", "바나나", "사과", "베리"],
  채소: ["채소", "상추", "오이", "양파", "감자", "당근"],
  "샐러드/간편채소": ["샐러드", "어린잎", "간편채소"],
  계란: ["계란"],
  "두부/콩나물/버섯": ["두부", "콩나물", "버섯"],
  "우유/요거트": ["우유", "요거트", "치즈"],
  생수: ["생수", "물", "탄산수"],
  "주스/두유": ["두유", "주스"],
  "쌀/잡곡": ["쌀", "잡곡", "현미", "백미"],
  "기본 식재료": ["조미료", "간장", "된장", "고추장", "식용유"],
  "냉장 간편식": ["간편식", "도시락", "즉석", "밀키트", "떡볶이", "라볶이", "로제"],
  "소량 신선식품": ["소량", "생연어", "연어", "횟감", "필렛", "슬라이스"],
}

const STORE_ALIASES: Record<string, string[]> = {
  B마트: ["b마트", "비마트", "배민", "배민비마트"],
  "Glider Fresh": ["glider", "글라이더", "글라이더프레시", "마켓컬리", "컬리"],
  오늘장보기: ["오늘장보기", "오늘 장보기"],
  새벽상회: ["새벽상회", "새벽 상회"],
}

const SYNONYM_GROUPS = [
  { canonical: "생연어", aliases: ["연어", "연어회", "횟감", "사시미", "필렛", "슬라이스"] },
  { canonical: "떡볶이 밀키트", aliases: ["떡볶이", "라볶이", "로제", "국물", "쌀떡", "밀떡", "밀키트"] },
  { canonical: "딸기", aliases: ["설향", "장희", "금실", "유기농 딸기", "못난이 딸기"] },
]

const PREFERENCE_GROUPS: Record<string, string[]> = {
  가성비: ["가성비", "싼", "저렴", "가격 좋은"],
  프리미엄: ["프리미엄", "고급", "좋은 거"],
  신선도: ["신선", "신선한", "생물", "횟감", "회용"],
  빠른배송: ["오늘", "당일", "즉시", "빠른", "빨리"],
  순한맛: ["안 매운", "순한맛", "순한 맛"],
}

export type QueryIntentType =
  | "product_search"
  | "reorder"
  | "purchase_confirmation"
  | "track_delivery"
  | "order_history"
  | "update_settings"
  | "cancel"
  | "general_question"

export type ParsedAgentQuery = {
  intentType: QueryIntentType
  searchQuery: string
  productKeywords: string[]
  synonyms: string[]
  store?: string
  quantity?: number
  capacity?: { raw: string; value: number | null; unit: string } | null
  maxPrice?: number
  preferences: string[]
  category?: FoodCategory
  wantsFastEta: boolean
  wantsReorder: boolean
  confidence: number
  reasoning: string
}

type RankedCandidate = { product: FoodProduct; score: number; reasons: string[] }

const compactText = (value: string) => value.toLowerCase().replace(/\s+/g, "")
const uniqueTerms = (values: Array<string | null | undefined>) =>
  [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]

function parseCapacity(message: string) {
  const match = message.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|mL|l|L|인분|입|개입|팩)/i)
  return match ? { raw: match[0], value: Number(match[1]), unit: match[2] } : null
}

function parseStore(message: string) {
  const normalized = compactText(message)
  return Object.entries(STORE_ALIASES).find(([store, aliases]) =>
    [store, ...aliases].some((alias) => normalized.includes(compactText(alias))),
  )?.[0]
}

function parseCategory(message: string): FoodCategory | undefined {
  return Object.entries(CATEGORY_KEYWORDS).find(([_, keywords]) => keywords.some((keyword) => message.includes(keyword)))?.[0] as
    | FoodCategory
    | undefined
}

function parsePreferences(message: string) {
  return Object.entries(PREFERENCE_GROUPS)
    .filter(([_, keywords]) => keywords.some((keyword) => message.includes(keyword)))
    .map(([name]) => name)
}

function collectSynonyms(message: string) {
  const normalized = compactText(message)
  const matched = SYNONYM_GROUPS.filter(({ canonical, aliases }) =>
    [canonical, ...aliases].some((term) => normalized.includes(compactText(term))),
  )
  return {
    productKeywords: matched.map((entry) => entry.canonical),
    synonyms: matched.flatMap((entry) => entry.aliases),
  }
}

function productHasStoreSignal(product: FoodProduct, store: string) {
  const tokens = [store, ...(STORE_ALIASES[store] || [])].map(compactText)
  const haystacks = [product.product_name, product.merchant_name, ...product.tags].map(compactText)
  return tokens.some((token) => haystacks.some((haystack) => haystack.includes(token)))
}

function toUcp(product: FoodProduct): UCPProduct {
  return {
    product_id: product.product_id,
    canonical_name: product.product_name,
    merchant_name: product.merchant_name,
    category: product.category,
    subcategory: product.subcategory,
    price: product.price,
    discount_price: product.discount_price,
    stock_status: product.stock_status,
    option_set: product.options,
    delivery_eta: product.delivery_eta,
    freshness_note: product.freshness_note,
    repurchase_eligible: product.repurchase_score >= 70,
    accessibility_summary: product.accessibility_summary,
  }
}

export function findReorderItem(message: string, userId = "demo-user"): PurchaseHistoryItem | null {
  if (!/(다시|재구매|저번|지난번|전에 주문)/.test(message)) return null
  const filtered = PURCHASE_HISTORY.filter((item) => item.user_id === userId && item.reorderable)
  const exact = filtered.find((item) => message.includes(item.product_name_snapshot.replace(/\s/g, "")))
  if (exact) return exact
  return filtered.find((item) => message.includes(item.product_name_snapshot.split(" ")[0])) ?? filtered[0] ?? null
}

export async function classifyAndParseQuery(params: { message: string; history?: Array<{ role: "user" | "assistant"; content: string }> }): Promise<ParsedAgentQuery> {
  const message = params.message
  const synonymData = collectSynonyms(message)
  const words = message.toLowerCase().split(/\s+/).map((word) => word.trim()).filter(Boolean)
  const maxPriceManwon = message.match(/(\d+)\s*만원\s*이하/)?.[1]
  const maxPriceWon = message.match(/(\d+)\s*원\s*이하/)?.[1]

  return {
    intentType: /(다시|재구매|저번|지난번|전에 주문)/.test(message)
      ? "reorder"
      : /(배송조회|배송 조회|배송 상태)/.test(message)
        ? "track_delivery"
        : /(주문 내역|주문목록|최근 주문)/.test(message)
          ? "order_history"
          : /(주소 변경|배송지 변경|결제 수단 변경|결제수단 변경|음성 설정|접근성 설정)/.test(message)
            ? "update_settings"
            : /(구매해|결제해|진행해|확정|네|예)/.test(message)
              ? "purchase_confirmation"
              : /취소|아니야|그만/.test(message)
                ? "cancel"
                : /(사줘|주문|구매|추천|찾아|골라|보여줘|뭐 있어|뭐있어)/.test(message) || synonymData.productKeywords.length > 0 || Boolean(parseCategory(message)) || Boolean(parseCapacity(message))
                  ? "product_search"
                  : "general_question",
    searchQuery: uniqueTerms([message, ...synonymData.productKeywords, ...synonymData.synonyms]).join(" ").trim() || message.trim(),
    productKeywords: uniqueTerms([...synonymData.productKeywords, ...words.slice(0, 4)]),
    synonyms: uniqueTerms(synonymData.synonyms),
    store: parseStore(message) || undefined,
    quantity: message.match(/(\d+)\s*(개|팩|봉|세트|병|상자|판|망|박스)/) ? Number(message.match(/(\d+)\s*(개|팩|봉|세트|병|상자|판|망|박스)/)?.[1]) : undefined,
    capacity: parseCapacity(message),
    maxPrice: maxPriceManwon ? Number(maxPriceManwon) * 10000 : maxPriceWon ? Number(maxPriceWon) : undefined,
    preferences: parsePreferences(message),
    category: parseCategory(message),
    wantsFastEta: /(오늘|즉시|빠른|당일)/.test(message),
    wantsReorder: /(다시|재구매|저번|지난번|전에 주문)/.test(message),
    confidence: process.env.GROQ_API_KEY ? 0.85 : 0.4,
    reasoning: process.env.GROQ_API_KEY ? "Groq 사용 가능 환경의 구조화 검색 해석" : "정규식 fallback 해석",
  }
}

function matchesCapacity(product: FoodProduct, parsed: ParsedAgentQuery) {
  if (!parsed.capacity?.value || !parsed.capacity.unit) return true
  const size = compactText(product.weight_or_volume)
  const target = compactText(`${parsed.capacity.value}${parsed.capacity.unit}`)
  if (size.includes(target)) return true
  if (/kg/i.test(parsed.capacity.unit) && size.includes(`${parsed.capacity.value * 1000}g`)) return true
  return false
}

function rankCandidate(product: FoodProduct, parsed: ParsedAgentQuery, reorder: PurchaseHistoryItem | null): RankedCandidate {
  let score = 0
  const reasons: string[] = []
  const normalizedName = compactText(product.product_name)
  const normalizedTags = product.tags.map(compactText)
  const terms = uniqueTerms([...parsed.productKeywords, ...parsed.synonyms]).map(compactText)

  for (const term of terms) {
    if (normalizedName.includes(term)) {
      score += 1
      reasons.push(`상품명 일치:${term}`)
    } else if (normalizedTags.some((tag) => tag.includes(term))) {
      score += 0.7
      reasons.push(`태그 일치:${term}`)
    }
  }

  if (parsed.store && productHasStoreSignal(product, parsed.store)) {
    score += 1.3
    reasons.push("스토어 일치")
  }
  if (parsed.capacity?.raw && matchesCapacity(product, parsed)) {
    score += 1
    reasons.push("용량/규격 일치")
  }
  if (parsed.maxPrice && product.discount_price <= parsed.maxPrice) {
    score += 0.8
    reasons.push("가격 조건 충족")
  }
  if (parsed.wantsFastEta && product.delivery_eta.includes("오늘")) {
    score += 0.7
    reasons.push("빠른 배송 가능")
  }
  if (parsed.preferences.includes("가성비") && product.discount_price <= product.price * 0.9) {
    score += 0.5
    reasons.push("가성비 반영")
  }
  if (parsed.preferences.includes("신선도") && /(산지|신선|냉장|입고)/.test(product.freshness_note)) {
    score += 0.5
    reasons.push("신선도 반영")
  }
  if (reorder && product.product_name.includes(reorder.product_name_snapshot.split(" ")[0])) {
    score += 1.2
    reasons.push("재구매 이력 일치")
  }

  score += product.popularity_score / 100
  score += product.repurchase_score / 100
  if (product.stock_status !== "임박") reasons.push("재고 안정")
  else score -= 0.5
  return { product, score, reasons }
}

function searchRankedCandidates(message: string, parsed: ParsedAgentQuery, userId?: string) {
  const reorder = findReorderItem(message, userId)
  const strict = FOOD_PRODUCTS
    .filter((product) => !parsed.category || product.category === parsed.category)
    .filter((product) => !parsed.store || productHasStoreSignal(product, parsed.store))
    .filter((product) => matchesCapacity(product, parsed))
    .filter((product) => !parsed.maxPrice || product.discount_price <= parsed.maxPrice * 1.2)
    .map((product) => rankCandidate(product, parsed, reorder))
    .sort((a, b) => b.score - a.score)

  if (strict.length > 0) return strict

  const relaxedStore = FOOD_PRODUCTS
    .filter((product) => !parsed.category || product.category === parsed.category)
    .filter((product) => !parsed.store || productHasStoreSignal(product, parsed.store))
    .filter((product) => !parsed.maxPrice || product.discount_price <= parsed.maxPrice * 1.35)
    .map((product) => rankCandidate(product, parsed, reorder))
    .sort((a, b) => b.score - a.score)

  if (relaxedStore.length > 0) return relaxedStore

  return FOOD_PRODUCTS
    .filter((product) => !parsed.category || product.category === parsed.category)
    .filter((product) => !parsed.maxPrice || product.discount_price <= parsed.maxPrice * 1.2)
    .map((product) => rankCandidate(product, parsed, reorder))
    .sort((a, b) => b.score - a.score)
}

export async function retrieveProductCandidates(params: {
  message: string
  parsed?: ParsedAgentQuery
  preferredMerchant?: string
  maxPrice?: number
  userId?: string
}) {
  const baseParsed = params.parsed ?? (await classifyAndParseQuery({ message: params.message }))
  const parsed: ParsedAgentQuery = {
    ...baseParsed,
    store: baseParsed.store || params.preferredMerchant,
    maxPrice: baseParsed.maxPrice || params.maxPrice,
  }
  return searchRankedCandidates(params.message, parsed, params.userId).slice(0, 3).map((item) => toUcp(item.product))
}

export async function composeProductRagContext(params: {
  message: string
  parsed?: ParsedAgentQuery
  preferredMerchant?: string
  maxPrice?: number
  userId?: string
}) {
  const baseParsed = params.parsed ?? (await classifyAndParseQuery({ message: params.message }))
  const parsed: ParsedAgentQuery = {
    ...baseParsed,
    store: baseParsed.store || params.preferredMerchant,
    maxPrice: baseParsed.maxPrice || params.maxPrice,
  }
  const ranked = searchRankedCandidates(params.message, parsed, params.userId)
  const top = ranked.slice(0, 3)
  const excluded = ranked.slice(3, 6)
  return {
    intent: parsed,
    reorderItem: findReorderItem(params.message, params.userId),
    topCandidates: top.map((item) => toUcp(item.product)),
    recommendationContext: `후보 상품:\n${top
      .map(
        (item, index) =>
          `${index + 1}. ${item.product.product_name} / 판매처 ${item.product.merchant_name} / ${item.product.discount_price}원 / ${item.product.delivery_eta} / 재고:${item.product.stock_status}\n- 추천 이유: ${item.reasons.join(", ")}`,
      )
      .join("\n")}`,
    exclusionContext: [
      `질의 해석: ${parsed.intentType}`,
      parsed.store ? `스토어 조건: ${parsed.store}` : "",
      parsed.capacity?.raw ? `규격 조건: ${parsed.capacity.raw}` : "",
      parsed.preferences.length ? `선호 조건: ${parsed.preferences.join(", ")}` : "",
      excluded.length
        ? `대안 제외 이유:\n${excluded
            .map((item) => `- ${item.product.product_name}: ${item.product.stock_status === "임박" ? "재고 임박" : "관련도 낮음"}`)
            .join("\n")}`
        : "대안 제외 이유: 없음",
    ].filter(Boolean).join("\n"),
  }
}

export async function generateModelAnswer(params: {
  message: string
  parsed?: ParsedAgentQuery
  history?: Array<{ role: "user" | "assistant"; content: string }>
  instruction?: string
  extraContext?: string[]
}) {
  if (!process.env.GROQ_API_KEY) {
    const ragContext = await composeProductRagContext({ message: params.message, parsed: params.parsed, userId: "demo-user" })
    return [params.instruction, ragContext.recommendationContext, ragContext.exclusionContext].filter(Boolean).join("\n\n")
  }

  const parsed = params.parsed ?? (await classifyAndParseQuery({ message: params.message, history: params.history }))
  const ragContext = await composeProductRagContext({ message: params.message, parsed, userId: "demo-user" })
  const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    messages: [
      { role: "system", content: "너는 Glider의 지체·시각장애인 접근성 중심 식료품 구매 도우미다. 항상 한국어로 짧고 분명하게 답한다." },
      {
        role: "user",
        content: [
          params.instruction || "",
          params.history?.slice(-8).map((item) => `${item.role === "user" ? "사용자" : "어시스턴트"}: ${item.content}`).join("\n") || "",
          ragContext.recommendationContext,
          ragContext.exclusionContext,
          ...(params.extraContext || []),
          `사용자 질문: ${params.message}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  })
  return completion.choices[0]?.message?.content?.trim() || "추천 결과를 정리하지 못했습니다."
}
