import assert from "node:assert/strict"
import test from "node:test"
import { classifyAndParseQuery, retrieveProductCandidates } from "../../lib/food-rag-runtime"

async function getScenarioResult(message: string) {
  const parsed = await classifyAndParseQuery({ message })
  const candidates = await retrieveProductCandidates({
    message,
    parsed,
    userId: "demo-user",
  })

  return {
    parsed,
    candidates,
    names: candidates.map((candidate) => candidate.canonical_name),
  }
}

test("대표 질의: 생연어 일반 탐색", async () => {
  const result = await getScenarioResult("생연어 뭐 있어")

  assert.equal(result.parsed.intentType, "product_search")
  assert.ok(result.parsed.productKeywords.includes("생연어"))
  assert.equal(result.candidates.length, 3)
  assert.ok(result.names.every((name) => name.includes("생연어")))
})

test("대표 질의: B마트 생연어 300g 지정 탐색", async () => {
  const result = await getScenarioResult("마켓컬리 같은 데 말고 B마트 생연어 300g 보여줘")

  assert.equal(result.parsed.intentType, "product_search")
  assert.equal(result.parsed.store, "B마트")
  assert.equal(result.parsed.capacity?.raw, "300g")
  assert.equal(result.candidates[0]?.merchant_name, "B마트")
  assert.ok(result.names.every((name) => name.includes("생연어")))
})

test("대표 질의: 딸기 500g 가성비 탐색", async () => {
  const result = await getScenarioResult("딸기 500g짜리 가성비 좋은 거")

  assert.equal(result.parsed.intentType, "product_search")
  assert.ok(result.parsed.productKeywords.includes("딸기"))
  assert.ok(result.parsed.preferences.includes("가성비"))
  assert.equal(result.parsed.capacity?.raw, "500g")
  assert.ok(result.names.some((name) => name.includes("500g")))
})

test("대표 질의: 로제 떡볶이 밀키트 2인분 탐색", async () => {
  const result = await getScenarioResult("로제 떡볶이 밀키트 2인분 뭐 있어")

  assert.equal(result.parsed.intentType, "product_search")
  assert.ok(result.parsed.synonyms.includes("로제"))
  assert.equal(result.parsed.capacity?.raw, "2인분")
  assert.ok(result.names[0]?.includes("로제"))
  assert.ok(result.names.every((name) => name.includes("떡볶이")))
})

test("대표 질의: 딸기 재구매", async () => {
  const result = await getScenarioResult("저번에 산 딸기 다시 사줘")

  assert.equal(result.parsed.intentType, "reorder")
  assert.ok(result.parsed.wantsReorder)
  assert.equal(result.candidates[0]?.merchant_name, "B마트")
  assert.ok(result.names[0]?.includes("딸기"))
})
