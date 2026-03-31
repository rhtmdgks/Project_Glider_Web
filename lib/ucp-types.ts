export type FoodCategory =
  | "과일"
  | "채소"
  | "샐러드/간편채소"
  | "계란"
  | "두부/콩나물/버섯"
  | "우유/요거트"
  | "생수"
  | "주스/두유"
  | "쌀/잡곡"
  | "기본 식재료"
  | "냉장 간편식"
  | "소량 신선식품"

export type StockStatus = "충분" | "보통" | "임박"

export type FoodProduct = {
  product_id: string
  product_name: string
  normalized_name: string
  category: FoodCategory
  subcategory: string
  brand: string
  description: string
  accessibility_summary: string
  price: number
  discount_price: number
  stock: number
  stock_status: StockStatus
  options: string[]
  unit: string
  weight_or_volume: string
  delivery_type: string
  delivery_eta: string
  merchant_name: string
  freshness_note: string
  tags: string[]
  popularity_score: number
  repurchase_score: number
  seasonal_flag: boolean
  created_at: string
  updated_at: string
}

export type PurchaseHistoryItem = {
  order_id: string
  user_id: string
  product_id: string
  product_name_snapshot: string
  quantity: number
  selected_options: string[]
  purchased_at: string
  paid_amount: number
  payment_method: string
  merchant_name: string
  delivery_status: "결제완료" | "상품준비중" | "배송중" | "배송완료"
  reorderable: boolean
}

export type UCPProduct = {
  product_id: string
  canonical_name: string
  merchant_name: string
  category: FoodCategory
  subcategory: string
  price: number
  discount_price: number
  stock_status: StockStatus
  option_set: string[]
  delivery_eta: string
  freshness_note: string
  repurchase_eligible: boolean
  accessibility_summary: string
}

export type UCPOrder = {
  order_id: string
  user_id: string
  product_id: string
  quantity: number
  selected_options: string[]
  payment_method: string
  status: "awaiting_purchase_confirmation" | "processing_payment" | "order_completed"
  eta: string
  confirmation_required: boolean
  created_at: string
}

export type AgentStage =
  | "idle"
  | "searching_products"
  | "showing_candidates"
  | "awaiting_purchase_confirmation"
  | "processing_payment"
  | "order_completed"
  | "viewing_order_history"
  | "updating_address"
  | "updating_payment_method"
  | "updating_voice"
  | "updating_accessibility"
  | "tracking_delivery"

export type AssistantCard = {
  type: "candidate" | "order" | "setting" | "delivery"
  title: string
  lines: string[]
}

export type AgentCandidateCard = {
  title: string
  merchantName: string
  price: number
  eta: string
  stockStatus: StockStatus
  recommendationReason: string
  exclusionReason?: string
  accessibilitySummary: string
}

export type AgentOrderSummary = {
  orderId: string
  productName: string
  quantity: number
  paymentMethod: string
  totalAmount: number
  status: string
  eta: string
}

export type AgentResponse = {
  stage: AgentStage
  mainMessage: string
  statusMessages: string[]
  candidateCards?: AgentCandidateCard[]
  orderSummary?: AgentOrderSummary | null
  uiActions?: string[]
  cards?: AssistantCard[]
}
