// @ts-nocheck
"use client"

import { useRef, useState, forwardRef, useImperativeHandle, useEffect } from "react"
import { Send, Loader2, Plus, Mic } from "lucide-react"
import ComposerActionsPopover from "./ComposerActionsPopover"
import { cls } from "./utils"

const Composer = forwardRef(function Composer({ onSend, onVoiceInput, isListening, busy }, ref) {
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)
  const [lineCount, setLineCount] = useState(1)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current
      const lineHeight = 24
      const minHeight = 24

      textarea.style.height = "auto"
      const scrollHeight = textarea.scrollHeight
      const calculatedLines = Math.max(1, Math.ceil(scrollHeight / lineHeight))

      setLineCount(calculatedLines)

      if (calculatedLines <= 12) {
        textarea.style.height = `${Math.max(minHeight, scrollHeight)}px`
        textarea.style.overflowY = "hidden"
      } else {
        textarea.style.height = `${12 * lineHeight}px`
        textarea.style.overflowY = "auto"
      }
    }
  }, [value])

  useImperativeHandle(
    ref,
    () => ({
      insertTemplate: (templateContent) => {
        setValue((prev) => {
          const newValue = prev ? `${prev}\n\n${templateContent}` : templateContent
          setTimeout(() => {
            inputRef.current?.focus()
            const length = newValue.length
            inputRef.current?.setSelectionRange(length, length)
          }, 0)
          return newValue
        })
      },
      focus: () => {
        inputRef.current?.focus()
      },
    }),
    [],
  )

  async function handleSend() {
    if (!value.trim() || sending) return
    setSending(true)
    try {
      await onSend?.(value)
      setValue("")
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  const hasContent = value.trim().length > 0

  return (
    <div className="border-t border-zinc-200/60 p-4 dark:border-zinc-800">
      <div
        className={cls(
          "flex w-full flex-col rounded-3xl border bg-white shadow-sm dark:bg-zinc-950 transition-all duration-200",
          "border-zinc-200 dark:border-zinc-800",
        )}
      >
        {/* Textarea area - grows upward */}
        <div className="flex-1 px-4 pt-4 pb-2">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="무엇을 도와드릴까요?"
            rows={1}
            className={cls(
              "w-full resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400 transition-all duration-200",
              "min-h-[24px] text-left leading-6",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
        </div>

        {/* Bottom toolbar: + on left, mic/send on right */}
        <div className="flex items-center justify-between px-3 pb-3">
          <ComposerActionsPopover>
            <button
              className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              title="첨부 추가"
            >
              <Plus className="h-5 w-5" />
            </button>
          </ComposerActionsPopover>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onVoiceInput}
              className="inline-flex items-center justify-center rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 transition-colors"
              title={isListening ? "음성 인식 중지" : "음성 입력"}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={sending || busy || !hasContent}
              className={cls(
                "inline-flex shrink-0 items-center justify-center rounded-full p-2.5 transition-colors",
                hasContent
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed",
              )}
            >
              {sending || busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 w-full px-1 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        AI 응답에는 오류가 있을 수 있어요. 중요한 정보는 꼭 확인해 주세요.
      </div>
    </div>
  )
})

export default Composer
