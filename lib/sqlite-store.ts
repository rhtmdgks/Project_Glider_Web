import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"

const DB_PATH = join(process.cwd(), "data", "glider-mvp.sqlite")

let db: DatabaseSync | null = null

function ensureDb() {
  if (db) return db
  mkdirSync(dirname(DB_PATH), { recursive: true })
  db = new DatabaseSync(DB_PATH)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      voice_style TEXT NOT NULL,
      accessibility_json TEXT NOT NULL,
      default_payment_method TEXT NOT NULL,
      default_address TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name_snapshot TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      selected_options TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      merchant_name TEXT NOT NULL,
      status TEXT NOT NULL,
      eta TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `)

  const exists = db.prepare("SELECT user_id FROM user_settings WHERE user_id = ?").get("demo-user") as
    | { user_id: string }
    | undefined
  if (!exists) {
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO user_settings (user_id, voice_style, accessibility_json, default_payment_method, default_address, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      "demo-user",
      "차분한 음성",
      JSON.stringify({
        largeText: true,
        highContrast: false,
        simplifiedMode: true,
        voiceFeedback: true,
      }),
      "국민카드",
      "서울특별시 강남구 테헤란로 123, 101동 1201호",
      now,
    )
  }
  return db
}

export function getUserSettings(userId = "demo-user") {
  const row = ensureDb()
    .prepare(
      "SELECT user_id, voice_style, accessibility_json, default_payment_method, default_address, updated_at FROM user_settings WHERE user_id = ?",
    )
    .get(userId) as
    | {
        user_id: string
        voice_style: string
        accessibility_json: string
        default_payment_method: string
        default_address: string
        updated_at: string
      }
    | undefined

  if (!row) return null
  return {
    userId: row.user_id,
    voiceStyle: row.voice_style,
    accessibility: JSON.parse(row.accessibility_json),
    defaultPaymentMethod: row.default_payment_method,
    defaultAddress: row.default_address,
    updatedAt: row.updated_at,
  }
}

export function updateUserSettings(
  userId: string,
  patch: {
    voiceStyle?: string
    accessibility?: Record<string, boolean>
    defaultPaymentMethod?: string
    defaultAddress?: string
  },
) {
  const current = getUserSettings(userId)
  if (!current) return null
  const now = new Date().toISOString()
  const next = {
    voiceStyle: patch.voiceStyle ?? current.voiceStyle,
    accessibility: patch.accessibility ?? current.accessibility,
    defaultPaymentMethod: patch.defaultPaymentMethod ?? current.defaultPaymentMethod,
    defaultAddress: patch.defaultAddress ?? current.defaultAddress,
  }
  ensureDb()
    .prepare(
      `UPDATE user_settings
       SET voice_style = ?, accessibility_json = ?, default_payment_method = ?, default_address = ?, updated_at = ?
       WHERE user_id = ?`,
    )
    .run(
      next.voiceStyle,
      JSON.stringify(next.accessibility),
      next.defaultPaymentMethod,
      next.defaultAddress,
      now,
      userId,
    )
  return getUserSettings(userId)
}

export function createVirtualOrder(input: {
  userId: string
  productId: string
  productName: string
  quantity: number
  selectedOptions: string[]
  paymentMethod: string
  merchantName: string
  eta: string
  totalAmount: number
}) {
  const now = new Date().toISOString()
  const orderId = `GLD-ORD-${Math.random().toString(36).slice(2, 9).toUpperCase()}`
  ensureDb()
    .prepare(
      `INSERT INTO orders
       (order_id, user_id, product_id, product_name_snapshot, quantity, selected_options, payment_method, merchant_name, status, eta, total_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      orderId,
      input.userId,
      input.productId,
      input.productName,
      input.quantity,
      JSON.stringify(input.selectedOptions),
      input.paymentMethod,
      input.merchantName,
      "결제완료",
      input.eta,
      input.totalAmount,
      now,
      now,
    )

  const insertEvent = ensureDb().prepare(
    "INSERT INTO delivery_events (order_id, status, message, created_at) VALUES (?, ?, ?, ?)",
  )
  insertEvent.run(orderId, "결제완료", `${input.paymentMethod} 결제가 완료되었습니다.`, now)
  insertEvent.run(orderId, "상품준비중", "상품을 포장하고 있습니다.", now)
  insertEvent.run(orderId, "배송예정", `${input.eta} 도착 예정입니다.`, now)
  return getOrderById(orderId)
}

export function listOrders(userId = "demo-user") {
  const rows = ensureDb()
    .prepare(
      `SELECT order_id, user_id, product_id, product_name_snapshot, quantity, selected_options, payment_method, merchant_name, status, eta, total_amount, created_at, updated_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as Array<any>
  return rows.map((row) => ({
    orderId: row.order_id,
    userId: row.user_id,
    productId: row.product_id,
    productName: row.product_name_snapshot,
    quantity: row.quantity,
    selectedOptions: JSON.parse(row.selected_options),
    paymentMethod: row.payment_method,
    merchantName: row.merchant_name,
    status: row.status,
    eta: row.eta,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export function getOrderById(orderId: string) {
  const row = ensureDb()
    .prepare(
      `SELECT order_id, user_id, product_id, product_name_snapshot, quantity, selected_options, payment_method, merchant_name, status, eta, total_amount, created_at, updated_at
       FROM orders WHERE order_id = ?`,
    )
    .get(orderId) as any
  if (!row) return null
  return {
    orderId: row.order_id,
    userId: row.user_id,
    productId: row.product_id,
    productName: row.product_name_snapshot,
    quantity: row.quantity,
    selectedOptions: JSON.parse(row.selected_options),
    paymentMethod: row.payment_method,
    merchantName: row.merchant_name,
    status: row.status,
    eta: row.eta,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getDeliveryEvents(orderId: string) {
  const rows = ensureDb()
    .prepare("SELECT status, message, created_at FROM delivery_events WHERE order_id = ? ORDER BY id ASC")
    .all(orderId) as Array<any>
  return rows.map((row) => ({
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
  }))
}
