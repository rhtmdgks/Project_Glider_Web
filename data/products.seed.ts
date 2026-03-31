import type { FoodProduct, FoodCategory } from "../lib/ucp-types"

const now = "2026-03-30T00:00:00.000Z"

const etaPool = [
  "오늘 18:00~20:00",
  "오늘 오후 7시 전",
  "오늘 밤 10시 전",
  "내일 오전 도착",
  "내일 새벽 도착",
]

const freshnessPool = ["산지 직송", "당일 입고", "냉장 보관", "선별 포장", "신선도 점검 완료"]

const merchantPool = ["B마트", "Glider Fresh", "오늘장보기", "새벽상회"]

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length]
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "")
}

function toStockStatus(stock: number): "충분" | "보통" | "임박" {
  if (stock >= 25) return "충분"
  if (stock >= 10) return "보통"
  return "임박"
}

function makeProduct(
  idx: number,
  name: string,
  category: FoodCategory,
  subcategory: string,
  basePrice: number,
  unit: string,
  weightOrVolume: string,
  tags: string[],
): FoodProduct {
  const stock = 6 + (idx * 7) % 36
  const discount = Math.round(basePrice * (0.85 + (idx % 4) * 0.03))
  return {
    product_id: `FP-${String(idx + 1).padStart(3, "0")}`,
    product_name: name,
    normalized_name: normalizeName(name),
    category,
    subcategory,
    brand: idx % 2 === 0 ? "Glider Farm" : "FreshMate",
    description: `${name} 상품입니다. ${subcategory} 카테고리 대표 상품으로 일상 재구매에 적합합니다.`,
    accessibility_summary:
      idx % 2 === 0 ? "옵션이 단순하고 즉시 주문에 적합" : "당일 배송 가능, 재구매 수요가 높은 식료품",
    price: basePrice,
    discount_price: Math.min(basePrice, discount),
    stock,
    stock_status: toStockStatus(stock),
    options: idx % 3 === 0 ? ["기본"] : ["기본", "신선 우선 선별"],
    unit,
    weight_or_volume: weightOrVolume,
    delivery_type: idx % 2 === 0 ? "즉시배송" : "새벽배송",
    delivery_eta: pick(etaPool, idx),
    merchant_name: pick(merchantPool, idx),
    freshness_note: pick(freshnessPool, idx),
    tags,
    popularity_score: 60 + (idx * 3) % 40,
    repurchase_score: 55 + (idx * 5) % 45,
    seasonal_flag: idx % 5 === 0,
    created_at: now,
    updated_at: now,
  }
}

const productSpecs: Array<{
  name: string
  category: FoodCategory
  subcategory: string
  price: number
  unit: string
  size: string
  tags: string[]
}> = [
  { name: "애플망고 2입", category: "과일", subcategory: "열대과일", price: 12900, unit: "팩", size: "2입", tags: ["애플망고", "재구매", "과일"] },
  { name: "애플망고 3입", category: "과일", subcategory: "열대과일", price: 17900, unit: "팩", size: "3입", tags: ["애플망고", "프리미엄", "과일"] },
  { name: "태국산 애플망고 2입", category: "과일", subcategory: "열대과일", price: 14900, unit: "팩", size: "2입", tags: ["애플망고", "태국산", "과일"] },
  { name: "프리미엄 애플망고 선물팩", category: "과일", subcategory: "열대과일", price: 25900, unit: "세트", size: "4입", tags: ["애플망고", "선물", "과일"] },
  { name: "설향 딸기 500g", category: "과일", subcategory: "베리", price: 8900, unit: "팩", size: "500g", tags: ["딸기", "설향", "과일"] },
  { name: "장희 딸기 750g", category: "과일", subcategory: "베리", price: 12900, unit: "팩", size: "750g", tags: ["딸기", "장희", "과일"] },
  { name: "B마트 설향 딸기 330g", category: "과일", subcategory: "베리", price: 5900, unit: "팩", size: "330g", tags: ["딸기", "설향", "소용량", "B마트"] },
  { name: "B마트 설향 딸기 500g", category: "과일", subcategory: "베리", price: 8500, unit: "팩", size: "500g", tags: ["딸기", "설향", "재구매", "B마트"] },
  { name: "B마트 설향 딸기 1kg", category: "과일", subcategory: "베리", price: 15900, unit: "박스", size: "1kg", tags: ["딸기", "설향", "대용량", "B마트"] },
  { name: "Glider Fresh 금실 딸기 350g", category: "과일", subcategory: "베리", price: 6900, unit: "팩", size: "350g", tags: ["딸기", "금실", "프리미엄", "Glider Fresh"] },
  { name: "Glider Fresh 금실 딸기 600g", category: "과일", subcategory: "베리", price: 10900, unit: "팩", size: "600g", tags: ["딸기", "금실", "중량선택", "Glider Fresh"] },
  { name: "Glider Fresh 유기농 딸기 400g", category: "과일", subcategory: "베리", price: 9900, unit: "팩", size: "400g", tags: ["딸기", "유기농", "프리미엄", "Glider Fresh"] },
  { name: "오늘장보기 장희 딸기 450g", category: "과일", subcategory: "베리", price: 7400, unit: "팩", size: "450g", tags: ["딸기", "장희", "오늘장보기"] },
  { name: "오늘장보기 장희 딸기 900g", category: "과일", subcategory: "베리", price: 14300, unit: "박스", size: "900g", tags: ["딸기", "장희", "대용량", "오늘장보기"] },
  { name: "오늘장보기 냉동 딸기 1kg", category: "과일", subcategory: "베리", price: 8900, unit: "봉", size: "1kg", tags: ["딸기", "냉동", "대용량", "오늘장보기"] },
  { name: "새벽상회 산지직송 딸기 380g", category: "과일", subcategory: "베리", price: 6800, unit: "팩", size: "380g", tags: ["딸기", "산지직송", "새벽상회"] },
  { name: "새벽상회 산지직송 딸기 700g", category: "과일", subcategory: "베리", price: 11800, unit: "팩", size: "700g", tags: ["딸기", "산지직송", "중대용량", "새벽상회"] },
  { name: "새벽상회 못난이 딸기 1kg", category: "과일", subcategory: "베리", price: 9900, unit: "박스", size: "1kg", tags: ["딸기", "가성비", "못난이", "새벽상회"] },
  { name: "바나나 1송이", category: "과일", subcategory: "바나나", price: 3900, unit: "송이", size: "1송이", tags: ["바나나", "과일", "간식"] },
  { name: "바나나 1.2kg", category: "과일", subcategory: "바나나", price: 6200, unit: "봉", size: "1.2kg", tags: ["바나나", "대용량", "과일"] },
  { name: "샤인머스캣 1송이", category: "과일", subcategory: "포도", price: 13900, unit: "송이", size: "1송이", tags: ["샤인머스캣", "포도", "과일"] },
  { name: "사과 4입", category: "과일", subcategory: "사과/배", price: 9800, unit: "팩", size: "4입", tags: ["사과", "과일"] },
  { name: "사과 6입", category: "과일", subcategory: "사과/배", price: 13900, unit: "팩", size: "6입", tags: ["사과", "대용량", "과일"] },
  { name: "배 3입", category: "과일", subcategory: "사과/배", price: 11500, unit: "팩", size: "3입", tags: ["배", "과일"] },
  { name: "배 5입", category: "과일", subcategory: "사과/배", price: 16900, unit: "팩", size: "5입", tags: ["배", "대용량", "과일"] },
  { name: "참외 2입", category: "과일", subcategory: "멜론", price: 7900, unit: "팩", size: "2입", tags: ["참외", "과일"] },
  { name: "오렌지 6입", category: "과일", subcategory: "감귤류", price: 9900, unit: "망", size: "6입", tags: ["오렌지", "과일"] },
  { name: "레몬 5입", category: "과일", subcategory: "감귤류", price: 5900, unit: "망", size: "5입", tags: ["레몬", "과일"] },
  { name: "블루베리 125g", category: "과일", subcategory: "베리", price: 4200, unit: "팩", size: "125g", tags: ["블루베리", "과일"] },
  { name: "청포도 800g", category: "과일", subcategory: "포도", price: 11900, unit: "팩", size: "800g", tags: ["청포도", "과일"] },
  { name: "토마토 1kg", category: "채소", subcategory: "토마토", price: 6900, unit: "봉", size: "1kg", tags: ["토마토", "채소"] },
  { name: "방울토마토 500g", category: "채소", subcategory: "토마토", price: 5500, unit: "팩", size: "500g", tags: ["토마토", "간편"] },
  { name: "상추 1봉", category: "채소", subcategory: "잎채소", price: 2400, unit: "봉", size: "180g", tags: ["상추", "쌈채소"] },
  { name: "깻잎 1봉", category: "채소", subcategory: "잎채소", price: 1900, unit: "봉", size: "40장", tags: ["깻잎", "쌈채소"] },
  { name: "양배추 1통", category: "채소", subcategory: "양배추", price: 4200, unit: "통", size: "1통", tags: ["양배추", "채소"] },
  { name: "양배추 1/2통", category: "채소", subcategory: "양배추", price: 2400, unit: "봉", size: "1/2통", tags: ["양배추", "소량"] },
  { name: "대파 1단", category: "채소", subcategory: "파", price: 2500, unit: "단", size: "1단", tags: ["대파", "기본재료"] },
  { name: "쪽파 1봉", category: "채소", subcategory: "파", price: 2700, unit: "봉", size: "200g", tags: ["쪽파", "기본재료"] },
  { name: "오이 3입", category: "채소", subcategory: "오이", price: 3300, unit: "봉", size: "3입", tags: ["오이", "채소"] },
  { name: "오이 5입", category: "채소", subcategory: "오이", price: 4900, unit: "봉", size: "5입", tags: ["오이", "대용량"] },
  { name: "애호박 1개", category: "채소", subcategory: "호박", price: 1800, unit: "개", size: "1개", tags: ["애호박", "채소"] },
  { name: "양파 3입", category: "채소", subcategory: "양파", price: 2800, unit: "망", size: "3입", tags: ["양파", "기본재료"] },
  { name: "양파 5입", category: "채소", subcategory: "양파", price: 4200, unit: "망", size: "5입", tags: ["양파", "대용량"] },
  { name: "감자 1kg", category: "채소", subcategory: "감자", price: 5200, unit: "봉", size: "1kg", tags: ["감자", "채소"] },
  { name: "감자 2kg", category: "채소", subcategory: "감자", price: 9200, unit: "봉", size: "2kg", tags: ["감자", "대용량"] },
  { name: "고구마 1kg", category: "채소", subcategory: "고구마", price: 6900, unit: "봉", size: "1kg", tags: ["고구마", "채소"] },
  { name: "당근 2입", category: "채소", subcategory: "당근", price: 2200, unit: "봉", size: "2입", tags: ["당근", "기본재료"] },
  { name: "버섯 모둠팩", category: "두부/콩나물/버섯", subcategory: "버섯", price: 4500, unit: "팩", size: "300g", tags: ["버섯", "모둠"] },
  { name: "팽이버섯 1봉", category: "두부/콩나물/버섯", subcategory: "버섯", price: 1200, unit: "봉", size: "150g", tags: ["팽이버섯", "버섯"] },
  { name: "새송이버섯 1팩", category: "두부/콩나물/버섯", subcategory: "버섯", price: 2400, unit: "팩", size: "300g", tags: ["새송이버섯", "버섯"] },
  { name: "샐러드 채소 믹스 150g", category: "샐러드/간편채소", subcategory: "샐러드", price: 3900, unit: "팩", size: "150g", tags: ["샐러드", "간편채소"] },
  { name: "어린잎 채소 100g", category: "샐러드/간편채소", subcategory: "샐러드", price: 3200, unit: "팩", size: "100g", tags: ["어린잎", "샐러드"] },
  { name: "대란 10구", category: "계란", subcategory: "계란", price: 5200, unit: "판", size: "10구", tags: ["계란", "재구매"] },
  { name: "대란 15구", category: "계란", subcategory: "계란", price: 7600, unit: "판", size: "15구", tags: ["계란", "대용량"] },
  { name: "무항생제 계란 10구", category: "계란", subcategory: "계란", price: 6900, unit: "판", size: "10구", tags: ["계란", "무항생제"] },
  { name: "두부 부침용 300g", category: "두부/콩나물/버섯", subcategory: "두부", price: 1900, unit: "모", size: "300g", tags: ["두부", "부침"] },
  { name: "두부 찌개용 300g", category: "두부/콩나물/버섯", subcategory: "두부", price: 1900, unit: "모", size: "300g", tags: ["두부", "찌개"] },
  { name: "연두부 1개", category: "두부/콩나물/버섯", subcategory: "두부", price: 1700, unit: "개", size: "250g", tags: ["연두부", "간편"] },
  { name: "콩나물 300g", category: "두부/콩나물/버섯", subcategory: "콩나물", price: 1500, unit: "봉", size: "300g", tags: ["콩나물", "반찬"] },
  { name: "숙주나물 300g", category: "두부/콩나물/버섯", subcategory: "콩나물", price: 1600, unit: "봉", size: "300g", tags: ["숙주", "반찬"] },
  { name: "우유 1L", category: "우유/요거트", subcategory: "우유", price: 2980, unit: "팩", size: "1L", tags: ["우유", "재구매"] },
  { name: "저지방 우유 1L", category: "우유/요거트", subcategory: "우유", price: 3180, unit: "팩", size: "1L", tags: ["우유", "저지방"] },
  { name: "플레인 요거트 450g", category: "우유/요거트", subcategory: "요거트", price: 4200, unit: "통", size: "450g", tags: ["요거트", "플레인"] },
  { name: "딸기 요거트 4입", category: "우유/요거트", subcategory: "요거트", price: 4900, unit: "세트", size: "4입", tags: ["요거트", "딸기"] },
  { name: "치즈 슬라이스 10매", category: "우유/요거트", subcategory: "치즈", price: 5300, unit: "팩", size: "10매", tags: ["치즈", "유제품"] },
  { name: "생수 2L 6개입", category: "생수", subcategory: "생수", price: 5900, unit: "묶음", size: "2L*6", tags: ["생수", "재구매"] },
  { name: "생수 500mL 20개입", category: "생수", subcategory: "생수", price: 8800, unit: "묶음", size: "500mL*20", tags: ["생수", "대용량"] },
  { name: "탄산수 350mL 6개입", category: "생수", subcategory: "탄산수", price: 4200, unit: "묶음", size: "350mL*6", tags: ["탄산수", "음료"] },
  { name: "오렌지 주스 1L", category: "주스/두유", subcategory: "주스", price: 3800, unit: "팩", size: "1L", tags: ["주스", "오렌지"] },
  { name: "사과 주스 1L", category: "주스/두유", subcategory: "주스", price: 3600, unit: "팩", size: "1L", tags: ["주스", "사과"] },
  { name: "무설탕 두유 24팩", category: "주스/두유", subcategory: "두유", price: 16900, unit: "박스", size: "190mL*24", tags: ["두유", "무설탕", "재구매"] },
  { name: "검은콩 두유 24팩", category: "주스/두유", subcategory: "두유", price: 17900, unit: "박스", size: "190mL*24", tags: ["두유", "검은콩"] },
  { name: "고단백 두유 16팩", category: "주스/두유", subcategory: "두유", price: 14900, unit: "박스", size: "190mL*16", tags: ["두유", "고단백"] },
  { name: "어린이 두유 24팩", category: "주스/두유", subcategory: "두유", price: 15900, unit: "박스", size: "120mL*24", tags: ["두유", "어린이"] },
  { name: "백미 10kg", category: "쌀/잡곡", subcategory: "백미", price: 32900, unit: "포", size: "10kg", tags: ["쌀", "백미"] },
  { name: "백미 4kg", category: "쌀/잡곡", subcategory: "백미", price: 14900, unit: "포", size: "4kg", tags: ["쌀", "백미"] },
  { name: "현미 4kg", category: "쌀/잡곡", subcategory: "현미", price: 16900, unit: "포", size: "4kg", tags: ["쌀", "현미"] },
  { name: "잡곡 혼합미 2kg", category: "쌀/잡곡", subcategory: "잡곡", price: 9900, unit: "포", size: "2kg", tags: ["쌀", "잡곡"] },
  { name: "찹쌀 2kg", category: "쌀/잡곡", subcategory: "찹쌀", price: 8900, unit: "포", size: "2kg", tags: ["쌀", "찹쌀"] },
  { name: "소금 1kg", category: "기본 식재료", subcategory: "조미료", price: 1900, unit: "봉", size: "1kg", tags: ["소금", "기본재료"] },
  { name: "설탕 1kg", category: "기본 식재료", subcategory: "조미료", price: 2200, unit: "봉", size: "1kg", tags: ["설탕", "기본재료"] },
  { name: "밀가루 1kg", category: "기본 식재료", subcategory: "가루", price: 2300, unit: "봉", size: "1kg", tags: ["밀가루", "기본재료"] },
  { name: "식용유 900mL", category: "기본 식재료", subcategory: "오일", price: 5300, unit: "병", size: "900mL", tags: ["식용유", "기본재료"] },
  { name: "참기름 300mL", category: "기본 식재료", subcategory: "오일", price: 6800, unit: "병", size: "300mL", tags: ["참기름", "기본재료"] },
  { name: "간장 500mL", category: "기본 식재료", subcategory: "장류", price: 3900, unit: "병", size: "500mL", tags: ["간장", "장류"] },
  { name: "된장 500g", category: "기본 식재료", subcategory: "장류", price: 4500, unit: "통", size: "500g", tags: ["된장", "장류"] },
  { name: "고추장 500g", category: "기본 식재료", subcategory: "장류", price: 4700, unit: "통", size: "500g", tags: ["고추장", "장류"] },
  { name: "샐러드 도시락 1팩", category: "냉장 간편식", subcategory: "도시락", price: 6900, unit: "팩", size: "1인분", tags: ["샐러드", "도시락"] },
  { name: "닭가슴살 샐러드 1팩", category: "냉장 간편식", subcategory: "샐러드", price: 7500, unit: "팩", size: "1인분", tags: ["샐러드", "고단백"] },
  { name: "B마트 국물 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 7900, unit: "팩", size: "2인분/540g", tags: ["떡볶이", "밀키트", "국물", "B마트"] },
  { name: "B마트 로제 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 8900, unit: "팩", size: "2인분/580g", tags: ["떡볶이", "밀키트", "로제", "B마트"] },
  { name: "B마트 즉석 떡볶이 밀키트 3인분", category: "냉장 간편식", subcategory: "밀키트", price: 11900, unit: "팩", size: "3인분/820g", tags: ["떡볶이", "밀키트", "대용량", "B마트"] },
  { name: "Glider Fresh 매콤 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 8400, unit: "팩", size: "2인분/560g", tags: ["떡볶이", "밀키트", "매콤", "Glider Fresh"] },
  { name: "Glider Fresh 궁중 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 9200, unit: "팩", size: "2인분/600g", tags: ["떡볶이", "밀키트", "궁중", "Glider Fresh"] },
  { name: "Glider Fresh 치즈 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 9500, unit: "팩", size: "2인분/610g", tags: ["떡볶이", "밀키트", "치즈", "Glider Fresh"] },
  { name: "오늘장보기 짜장 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 8300, unit: "팩", size: "2인분/550g", tags: ["떡볶이", "밀키트", "짜장", "오늘장보기"] },
  { name: "오늘장보기 라볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 8700, unit: "팩", size: "2인분/620g", tags: ["떡볶이", "밀키트", "라볶이", "오늘장보기"] },
  { name: "오늘장보기 순한맛 떡볶이 밀키트 1인분", category: "냉장 간편식", subcategory: "밀키트", price: 5200, unit: "팩", size: "1인분/320g", tags: ["떡볶이", "밀키트", "소용량", "오늘장보기"] },
  { name: "새벽상회 부산식 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 8800, unit: "팩", size: "2인분/570g", tags: ["떡볶이", "밀키트", "부산식", "새벽상회"] },
  { name: "새벽상회 쌀떡 떡볶이 밀키트 3인분", category: "냉장 간편식", subcategory: "밀키트", price: 12400, unit: "팩", size: "3인분/900g", tags: ["떡볶이", "밀키트", "쌀떡", "새벽상회"] },
  { name: "새벽상회 밀떡 떡볶이 밀키트 2인분", category: "냉장 간편식", subcategory: "밀키트", price: 7900, unit: "팩", size: "2인분/530g", tags: ["떡볶이", "밀키트", "밀떡", "새벽상회"] },
  { name: "생연어 필렛 200g", category: "소량 신선식품", subcategory: "수산", price: 8900, unit: "팩", size: "200g", tags: ["생연어", "필렛", "소용량"] },
  { name: "생연어 필렛 300g", category: "소량 신선식품", subcategory: "수산", price: 12900, unit: "팩", size: "300g", tags: ["생연어", "필렛", "재구매"] },
  { name: "생연어 필렛 500g", category: "소량 신선식품", subcategory: "수산", price: 19900, unit: "팩", size: "500g", tags: ["생연어", "필렛", "대용량"] },
  { name: "B마트 노르웨이 생연어 180g", category: "소량 신선식품", subcategory: "수산", price: 7900, unit: "팩", size: "180g", tags: ["생연어", "노르웨이", "B마트"] },
  { name: "B마트 노르웨이 생연어 350g", category: "소량 신선식품", subcategory: "수산", price: 14900, unit: "팩", size: "350g", tags: ["생연어", "노르웨이", "중량선택", "B마트"] },
  { name: "Glider Fresh 연어회용 생연어 250g", category: "소량 신선식품", subcategory: "수산", price: 11900, unit: "팩", size: "250g", tags: ["생연어", "회용", "Glider Fresh"] },
  { name: "Glider Fresh 연어회용 생연어 400g", category: "소량 신선식품", subcategory: "수산", price: 17800, unit: "팩", size: "400g", tags: ["생연어", "회용", "대용량", "Glider Fresh"] },
  { name: "오늘장보기 숙성 생연어 200g", category: "소량 신선식품", subcategory: "수산", price: 9800, unit: "팩", size: "200g", tags: ["생연어", "숙성", "오늘장보기"] },
  { name: "오늘장보기 숙성 생연어 450g", category: "소량 신선식품", subcategory: "수산", price: 18900, unit: "팩", size: "450g", tags: ["생연어", "숙성", "오늘장보기", "대용량"] },
  { name: "새벽상회 생연어 횟감 슬라이스 220g", category: "소량 신선식품", subcategory: "수산", price: 10900, unit: "팩", size: "220g", tags: ["생연어", "슬라이스", "새벽상회"] },
  { name: "새벽상회 생연어 횟감 슬라이스 480g", category: "소량 신선식품", subcategory: "수산", price: 19500, unit: "팩", size: "480g", tags: ["생연어", "슬라이스", "새벽상회", "대용량"] },
  { name: "컵과일 1팩", category: "소량 신선식품", subcategory: "간편과일", price: 4500, unit: "컵", size: "1컵", tags: ["컵과일", "간편"] },
  { name: "손질 채소팩", category: "소량 신선식품", subcategory: "손질채소", price: 5200, unit: "팩", size: "300g", tags: ["손질채소", "간편"] },
  { name: "즉석 미역국 2인분", category: "냉장 간편식", subcategory: "국/탕", price: 5900, unit: "팩", size: "2인분", tags: ["즉석국", "미역국"] },
  { name: "즉석 된장국 2인분", category: "냉장 간편식", subcategory: "국/탕", price: 5600, unit: "팩", size: "2인분", tags: ["즉석국", "된장국"] },
  { name: "냉장 반찬 1팩", category: "냉장 간편식", subcategory: "반찬", price: 4900, unit: "팩", size: "200g", tags: ["반찬", "간편식"] },
  { name: "계란말이 반찬팩", category: "냉장 간편식", subcategory: "반찬", price: 6200, unit: "팩", size: "250g", tags: ["계란말이", "반찬"] },
  { name: "두부 샐러드 세트", category: "냉장 간편식", subcategory: "샐러드", price: 6800, unit: "세트", size: "1인분", tags: ["두부", "샐러드"] },
]

const extended = Array.from({ length: 29 }).map((_, i) => ({
  name: `신선 추천 식료품 ${i + 1}`,
  category: (["과일", "채소", "우유/요거트", "주스/두유", "소량 신선식품"] as FoodCategory[])[i % 5],
  subcategory: "추천상품",
  price: 2500 + i * 310,
  unit: "팩",
  size: `${200 + i * 20}g`,
  tags: ["식료품", "추천", i % 2 === 0 ? "재구매" : "신선"],
}))

const allSpecs = [...productSpecs, ...extended]

export const FOOD_PRODUCTS_SEED: FoodProduct[] = allSpecs.map((spec, idx) =>
  makeProduct(idx, spec.name, spec.category, spec.subcategory, spec.price, spec.unit, spec.size, spec.tags),
)
