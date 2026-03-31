"use client"

import { useCallback, useMemo, useRef, useState } from "react"

type BrowserWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => any
    webkitSpeechRecognition?: new () => any
  }

export function useVoiceAssistant() {
  const [isListening, setIsListening] = useState(false)
  const recRef = useRef<any>(null)

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window
  }, [])

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!supported || typeof window === "undefined") return
    const browserWindow = window as BrowserWindow
    const SpeechRecognitionCtor = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return
    const rec = new SpeechRecognitionCtor()
    rec.lang = "ko-KR"
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript || ""
      if (text) onResult(text)
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    recRef.current = rec
    setIsListening(true)
    rec.start()
  }, [supported])

  const stopListening = useCallback(() => {
    recRef.current?.stop?.()
    setIsListening(false)
  }, [])

  return { supported, isListening, startListening, stopListening }
}
