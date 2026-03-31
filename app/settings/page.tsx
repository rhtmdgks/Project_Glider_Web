"use client"

import { useEffect, useState } from "react"
import { VOICE_PITCH, VOICE_RATE, VOICE_STYLES, type VoiceStyle } from "../../lib/voice-presets"

type Settings = {
  voiceStyle: VoiceStyle
  defaultAddress: string
  defaultPaymentMethod: string
  accessibility: {
    largeText: boolean
    highContrast: boolean
    simplifiedMode: boolean
    voiceFeedback: boolean
  }
  updatedAt: string
}

export default function SettingsPage() {
  function previewVoice(style: VoiceStyle) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const utter = new SpeechSynthesisUtterance(`현재 선택된 음성은 ${style}입니다.`)
    utter.lang = "ko-KR"
    utter.rate = VOICE_RATE[style]
    utter.pitch = VOICE_PITCH[style]
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }

  const [settings, setSettings] = useState<Settings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  async function load() {
    const res = await fetch("/api/settings")
    const data = (await res.json()) as Settings
    setSettings(data)
  }

  async function save(
    patch: Partial<Pick<Settings, "voiceStyle" | "defaultAddress" | "defaultPaymentMethod" | "accessibility">>,
  ) {
    setIsSaving(true)
    setStatusMessage("")
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    await load()
    setIsSaving(false)
    setStatusMessage("설정이 저장되었습니다.")
  }

  useEffect(() => {
    load()
  }, [])

  if (!settings) return <main className="p-6">설정을 불러오는 중...</main>

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">설정 및 관리</h1>
      <p className="text-sm text-zinc-500">최근 수정: {new Date(settings.updatedAt).toLocaleString("ko-KR")}</p>
      {statusMessage ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm">{statusMessage}</div> : null}

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">기본 결제수단</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={settings.defaultPaymentMethod}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, defaultPaymentMethod: e.target.value } : prev))}
            placeholder="예: 국민카드"
          />
          <button
            disabled={isSaving}
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            onClick={() => save({ defaultPaymentMethod: settings.defaultPaymentMethod })}
          >
            저장
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">기본 배송지</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            value={settings.defaultAddress}
            onChange={(e) => setSettings((prev) => (prev ? { ...prev, defaultAddress: e.target.value } : prev))}
            placeholder="예: 서울특별시 강남구 ..."
          />
          <button
            disabled={isSaving}
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60"
            onClick={() => save({ defaultAddress: settings.defaultAddress })}
          >
            저장
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">AI 음성 종류(하드코딩)</h2>
        <div className="mb-2 text-sm">{settings.voiceStyle}</div>
        <div className="flex flex-wrap gap-2">
          {VOICE_STYLES.map((v) => (
            <button
              key={v}
              className={`rounded border px-3 py-1 text-sm ${settings.voiceStyle === v ? "border-zinc-900 bg-zinc-100" : ""}`}
              onClick={() => save({ voiceStyle: v })}
            >
              {v}
            </button>
          ))}
        </div>
        <button className="mt-2 rounded border px-3 py-1 text-sm" onClick={() => previewVoice(settings.voiceStyle)}>
          음성 미리 듣기
        </button>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 font-medium">접근성 설정</h2>
        <div className="grid gap-2 text-sm">
          {[
            { key: "largeText", label: "큰 글씨" },
            { key: "highContrast", label: "고대비" },
            { key: "simplifiedMode", label: "간소화 모드" },
            { key: "voiceFeedback", label: "음성 피드백" },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between rounded border px-3 py-2">
              <span>{item.label}</span>
              <input
                type="checkbox"
                checked={settings.accessibility[item.key as keyof Settings["accessibility"]]}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          accessibility: {
                            ...prev.accessibility,
                            [item.key]: e.target.checked,
                          },
                        }
                      : prev,
                  )
                }
              />
            </label>
          ))}
        </div>
        <button
          disabled={isSaving}
          className="mt-3 rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60"
          onClick={() => save({ accessibility: settings.accessibility })}
        >
          접근성 설정 저장
        </button>
      </section>
    </main>
  )
}
