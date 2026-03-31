import { NextResponse } from "next/server"
import { getUserSettings, updateUserSettings } from "../../../lib/sqlite-store"
import { VOICE_STYLES, type VoiceStyle } from "../../../lib/voice-presets"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId") || "demo-user"
  const settings = getUserSettings(userId)
  return NextResponse.json({
    mainMessage: "설정 조회 완료",
    statusMessages: ["설정 조회 완료"],
    candidateCards: [],
    orderSummary: null,
    uiActions: ["open_settings"],
    settings,
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId?: string
    voiceStyle?: string
    defaultAddress?: string
    defaultPaymentMethod?: string
    accessibility?: Record<string, boolean>
  }
  const userId = body.userId || "demo-user"
  const voiceStyle = VOICE_STYLES.includes(body.voiceStyle as VoiceStyle) ? (body.voiceStyle as VoiceStyle) : undefined
  const updated = updateUserSettings(userId, {
    voiceStyle,
    defaultAddress: body.defaultAddress,
    defaultPaymentMethod: body.defaultPaymentMethod,
    accessibility: body.accessibility,
  })
  return NextResponse.json({
    mainMessage: "설정 업데이트 완료",
    statusMessages: ["설정 업데이트 완료"],
    candidateCards: [],
    orderSummary: null,
    uiActions: ["refresh_settings"],
    settings: updated,
  })
}
