import OpenAI from "openai"

type DocChunk = {
  id: string
  title: string
  text: string
}

export type RagResult = {
  answer: string
  references: Array<{ id: string; title: string }>
}

const KNOWLEDGE_BASE: DocChunk[] = [
  {
    id: "ucp-001",
    title: "UCP 개요",
    text: "UCP는 서로 다른 커머스 플랫폼의 상품명, 옵션, 가격, 재고, 배송, 결제 상태를 공통 구조로 변환해 AI 에이전트가 일관되게 해석하도록 돕는 프로토콜이다.",
  },
  {
    id: "ucp-002",
    title: "접근성 중심 구매 지원",
    text: "시각장애인은 화면 탐색의 장벽이 크고, 지체장애인은 반복 조작의 부담이 크다. 따라서 음성·텍스트 명령 기반으로 탐색, 비교, 주문 확인, 결제 지원을 제공해야 한다.",
  },
  {
    id: "ucp-003",
    title: "핵심 모듈",
    text: "핵심 모듈은 사용자 명령 해석, UCP 표준화, 구매 확인 및 실행 지원으로 구성한다. 상태 메시지(탐색 중, 검색 완료, 결제 진행 중, 결제 완료)를 제공해 인지 부담을 줄인다.",
  },
  {
    id: "ucp-004",
    title: "재구매 중심 UX",
    text: "장애인 및 디지털 취약계층은 신규 상품 탐색보다 재구매 비중이 높다. 이전 구매 이력, 현재 재고, 예상 배송 시간을 함께 제시해 빠른 의사결정을 지원한다.",
  },
  {
    id: "ucp-005",
    title: "결제 전 안전 확인",
    text: "결제 전에 상품명, 수량, 옵션, 결제수단, 배송 예정 시각을 다시 확인하고 사용자 동의를 받은 후 주문을 실행해야 오주문과 결제 오류를 줄일 수 있다.",
  },
]

let cachedEmbeddings: Array<{ id: string; title: string; text: string; vector: number[] }> | null = null

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
  }
  return new OpenAI({ apiKey })
}

async function ensureEmbeddings(client: OpenAI) {
  if (cachedEmbeddings) return cachedEmbeddings

  const textInputs = KNOWLEDGE_BASE.map((chunk) => `[${chunk.title}] ${chunk.text}`)
  const embeddings = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: textInputs,
  })

  cachedEmbeddings = KNOWLEDGE_BASE.map((chunk, idx) => ({
    id: chunk.id,
    title: chunk.title,
    text: chunk.text,
    vector: embeddings.data[idx].embedding,
  }))

  return cachedEmbeddings
}

export async function runRagPipeline(userMessage: string, history: Array<{ role: "user" | "assistant"; content: string }>) {
  const client = getClient()

  const [queryEmbedding, docs] = await Promise.all([
    client.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    }),
    ensureEmbeddings(client),
  ])

  const queryVec = queryEmbedding.data[0].embedding
  const topChunks = docs
    .map((doc) => ({ ...doc, score: cosine(queryVec, doc.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const contextBlock = topChunks
    .map((c) => `- (${c.id}) ${c.title}: ${c.text}`)
    .join("\n")

  const systemPrompt = [
    "당신은 Glider의 UCP 기반 구매 지원 AI 에이전트다.",
    "항상 한국어로 답한다.",
    "답변은 장애인 접근성 중심으로 간결하고 단계적으로 안내한다.",
    "가능하면 상태 메시지를 포함한다: 상품 탐색 중, 검색 완료, 결제 진행 중, 결제 완료.",
    "결제 실행 요청 시 결제 전 확인 항목(상품명/수량/옵션/결제수단/예상도착)을 반드시 재확인한다.",
    "근거는 주어진 컨텍스트만 사용한다.",
  ].join("\n")

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: "system", content: `컨텍스트:\n${contextBlock}` },
      { role: "user", content: userMessage },
    ],
  })

  const answer = completion.choices[0]?.message?.content?.trim() || "요청을 처리하지 못했습니다. 다시 시도해 주세요."

  const result: RagResult = {
    answer,
    references: topChunks.map((c) => ({ id: c.id, title: c.title })),
  }
  return result
}
