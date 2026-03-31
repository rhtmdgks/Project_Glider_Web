// @ts-nocheck
"use client"

import { useState, forwardRef, useImperativeHandle, useRef } from "react"
import { Pencil, RefreshCw, Check, X, Square } from "lucide-react"
import Message from "./Message"
import Composer from "./Composer"
import { cls, timeAgo } from "./utils"

function ThinkingMessage({ onPause }) {
  return (
    <Message role="assistant">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
        </div>
        <span className="text-sm text-zinc-500">답변을 생성하고 있어요...</span>
        <button
          onClick={onPause}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Square className="h-3 w-3" /> 중지
        </button>
      </div>
    </Message>
  )
}

const ChatPane = forwardRef(function ChatPane(
  {
    conversation,
    onSend,
    onVoiceInput,
    isListening,
    onQuickAction,
    onEditMessage,
    onResendMessage,
    isThinking,
    onPauseThinking,
  },
  ref,
) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const composerRef = useRef(null)

  useImperativeHandle(
    ref,
    () => ({
      insertTemplate: (templateContent) => {
        composerRef.current?.insertTemplate(templateContent)
      },
    }),
    [],
  )

  if (!conversation) return null

  const tags = ["검증됨", "맞춤형", "경험 기반", "도움 중심"]
  const messages = Array.isArray(conversation.messages) ? conversation.messages : []
  const count = messages.length || conversation.messageCount || 0

  function startEdit(m) {
    setEditingId(m.id)
    setDraft(m.content)
  }
  function cancelEdit() {
    setEditingId(null)
    setDraft("")
  }
  function saveEdit() {
    if (!editingId) return
    onEditMessage?.(editingId, draft)
    cancelEdit()
  }
  function saveAndResend() {
    if (!editingId) return
    onEditMessage?.(editingId, draft)
    onResendMessage?.(editingId)
    cancelEdit()
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-6 lg:px-8">
        <div className="w-full space-y-5">
          <div className="mb-2 text-3xl font-serif tracking-tight sm:text-4xl md:text-5xl">
            <span className="block leading-[1.05] font-sans text-2xl">{conversation.title}</span>
          </div>
          <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            업데이트됨 {timeAgo(conversation.updatedAt)} · {count}개 메시지
          </div>

          <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-5 dark:border-zinc-800">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:text-zinc-200"
              >
                {t}
              </span>
            ))}
          </div>

          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              아직 메시지가 없어요. 먼저 인사해 보세요.
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className="space-y-2">
                {editingId === m.id ? (
                  <div className={cls("rounded-2xl border p-2", "border-zinc-200 dark:border-zinc-800")}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full resize-y rounded-xl bg-transparent p-2 text-sm outline-none"
                      rows={3}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-white dark:bg-white dark:text-zinc-900"
                      >
                        <Check className="h-3.5 w-3.5" /> 저장
                      </button>
                      <button
                        onClick={saveAndResend}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> 저장 후 다시 보내기
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
                      >
                        <X className="h-3.5 w-3.5" /> 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <Message role={m.role}>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.role === "assistant" && Array.isArray(m.payload?.candidateCards) && m.payload.candidateCards.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {m.payload.candidateCards.map((card, idx) => (
                          <div key={idx} className="rounded-lg border border-zinc-200 p-2 text-xs break-words dark:border-zinc-800">
                            <div className="mb-1 font-semibold">
                              {idx + 1}. {card.title}
                            </div>
                            <div>판매처: {card.merchantName}</div>
                            <div>가격: {card.price.toLocaleString("ko-KR")}원</div>
                            <div>재고: {card.stockStatus}</div>
                            <div>배송 ETA: {card.eta}</div>
                            <div>추천 이유: {card.recommendationReason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && m.payload?.orderSummary && (
                      <div className="mt-2 rounded-lg border border-zinc-200 p-2 text-xs break-words dark:border-zinc-800">
                        <div className="mb-1 font-semibold">주문 요약</div>
                        <div>주문번호: {m.payload.orderSummary.orderId}</div>
                        <div>상품: {m.payload.orderSummary.productName}</div>
                        <div>수량: {m.payload.orderSummary.quantity}개</div>
                        <div>결제수단: {m.payload.orderSummary.paymentMethod}</div>
                        <div>결제금액: {m.payload.orderSummary.totalAmount.toLocaleString("ko-KR")}원</div>
                        <div>배송 ETA: {m.payload.orderSummary.eta}</div>
                      </div>
                    )}
                    {m.role === "assistant" && m.payload?.statusMessages?.length > 0 && (
                      <div
                        className="mt-2 space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
                        aria-live="polite"
                      >
                        {m.payload.statusMessages.map((s, idx) => (
                          <div key={idx}>- {s}</div>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && m.payload?.cards?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {m.payload.cards.map((card, idx) => (
                          <div key={idx} className="rounded-lg border border-zinc-200 p-2 text-xs break-words dark:border-zinc-800">
                            <div className="mb-1 font-semibold">{card.title}</div>
                            {card.lines.map((line, li) => (
                              <div key={li}>{line}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && Array.isArray(m.payload?.uiActions) && m.payload.uiActions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.payload.uiActions.slice(0, 4).map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => onQuickAction?.(action)}
                            className="rounded-full border border-zinc-300 px-2.5 py-1 text-[11px] hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            {action.replace(/^prompt:/, "")}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.role === "user" && (
                      <div className="mt-1 flex gap-2 text-[11px] text-zinc-500">
                        <button className="inline-flex items-center gap-1 hover:underline" onClick={() => startEdit(m)}>
                          <Pencil className="h-3.5 w-3.5" /> 수정
                        </button>
                        <button
                          className="inline-flex items-center gap-1 hover:underline"
                          onClick={() => onResendMessage?.(m.id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> 다시 보내기
                        </button>
                      </div>
                    )}
                  </Message>
                )}
                </div>
              ))}
              {isThinking && <ThinkingMessage onPause={onPauseThinking} />}
            </>
          )}
        </div>
      </div>

      <Composer
        ref={composerRef}
        onVoiceInput={onVoiceInput}
        isListening={isListening}
        onSend={async (text) => {
          if (!text.trim()) return
          setBusy(true)
          await onSend?.(text)
          setBusy(false)
        }}
        busy={busy}
      />
    </div>
  )
})

export default ChatPane
