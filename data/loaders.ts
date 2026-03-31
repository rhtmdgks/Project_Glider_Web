import purchaseHistorySeed from "./purchase-history.seed.json"
import { FOOD_PRODUCTS_SEED } from "./products.seed"
import type { FoodProduct, PurchaseHistoryItem } from "../lib/ucp-types"

export function loadFoodProducts(): FoodProduct[] {
  if (FOOD_PRODUCTS_SEED.length < 100) {
    throw new Error(`products.seed.ts must contain at least 100 rows. current=${FOOD_PRODUCTS_SEED.length}`)
  }
  return FOOD_PRODUCTS_SEED
}

export function loadPurchaseHistory(): PurchaseHistoryItem[] {
  const rows = purchaseHistorySeed as PurchaseHistoryItem[]
  return rows.map((row) => ({
    ...row,
    selected_options: row.selected_options?.length ? row.selected_options : ["기본"],
  }))
}
