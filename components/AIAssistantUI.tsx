// @ts-nocheck
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, LayoutGrid, Menu, MoreHorizontal } from "lucide-react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import ChatPane from "./ChatPane"
import GhostIconButton from "./GhostIconButton"
import ThemeToggle from "./ThemeToggle"
import { INITIAL_CONVERSATIONS, INITIAL_TEMPLATES, INITIAL_FOLDERS } from "./mockData"
import { createInitialAgentMessage, runCommerceAgent } from "../lib/commerce-agent"
import { useVoiceAssistant } from "../hooks/use-voice-assistant"
import type { VoiceStyle } from "../lib/voice-presets"

export default function AIAssistantUI() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState("light")
  const [themeInitialized, setThemeInitialized] = useState(false)
  const [prefsInitialized, setPrefsInitialized] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme")
      if (saved === "dark" || saved === "light") {
        setTheme(saved)
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark")
      }
    } catch {}
    setThemeInitialized(true)
  }, [])

  useEffect(() => {
    if (!themeInitialized) return
    try {
      if (theme === "dark") document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
      document.documentElement.setAttribute("data-theme", theme)
      document.documentElement.style.colorScheme = theme
      localStorage.setItem("theme", theme)
    } catch {}
  }, [theme, themeInitialized])

  useEffect(() => {
    try {
      const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)")
      if (!media) return
      const listener = (e) => {
        const saved = localStorage.getItem("theme")
        if (!saved) setTheme(e.matches ? "dark" : "light")
      }
      media.addEventListener("change", listener)
      return () => media.removeEventListener("change", listener)
    } catch {}
  }, [])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState({ pinned: true, recent: false, folders: true, templates: true })
  useEffect(() => {
    if (!prefsInitialized) return
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed))
    } catch {}
  }, [collapsed, prefsInitialized])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!prefsInitialized) return
    try {
      localStorage.setItem("sidebar-collapsed-state", JSON.stringify(sidebarCollapsed))
    } catch {}
  }, [sidebarCollapsed, prefsInitialized])

  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS)
  const [selectedId, setSelectedId] = useState(null)
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES)
  const [folders, setFolders] = useState(INITIAL_FOLDERS)

  const [query, setQuery] = useState("")
  const searchRef = useRef(null)

  const [isThinking, setIsThinking] = useState(false)
  const [thinkingConvId, setThinkingConvId] = useState(null)
  const agentStateRef = useRef({})
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>("차분한 음성")
  const { supported: voiceSupported, isListening, startListening, stopListening } = useVoiceAssistant()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        createNewChat()
      }
      if (!e.metaKey && !e.ctrlKey && e.key === "/") {
        const tag = document.activeElement?.tagName?.toLowerCase()
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarOpen, conversations])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/settings")
        const data = await res.json()
        if (data?.voiceStyle) setVoiceStyle(data.voiceStyle)
      } catch {}
    })()
  }, [])

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem("sidebar-collapsed")
      if (raw) setCollapsed(JSON.parse(raw))
    } catch {}
    try {
      const saved = localStorage.getItem("sidebar-collapsed-state")
      if (saved) setSidebarCollapsed(JSON.parse(saved))
    } catch {}
    setPrefsInitialized(true)
  }, [])

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      createNewChat()
    }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.toLowerCase()
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q))
  }, [conversations, query])

  const pinned = filtered.filter((c) => c.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

  const recent = filtered
    .filter((c) => !c.pinned)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 10)

  const folderCounts = React.useMemo(() => {
    const map = Object.fromEntries(folders.map((f) => [f.name, 0]))
    for (const c of conversations) if (map[c.folder] != null) map[c.folder] += 1
    return map
  }, [conversations, folders])

  function togglePin(id) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }

  function createNewChat() {
    const id = Math.random().toString(36).slice(2)
    const now = new Date().toISOString()
    const introMessage = {
      id: Math.random().toString(36).slice(2),
      role: "assistant",
      content: createInitialAgentMessage(),
      createdAt: now,
      payload: null,
    }
    const item = {
      id,
      title: "UCP 구매 지원",
      updatedAt: now,
      messageCount: 1,
      preview: "원하는 상품을 말하면 비교/주문까지 도와드립니다.",
      pinned: false,
      folder: "업무 프로젝트",
      messages: [introMessage],
    }
    agentStateRef.current[id] = { stage: "idle" }
    setConversations((prev) => [item, ...prev])
    setSelectedId(id)
    setSidebarOpen(false)
  }

  function createFolder() {
    const name = prompt("폴더 이름")
    if (!name) return
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) return alert("이미 존재하는 폴더입니다.")
    setFolders((prev) => [...prev, { id: Math.random().toString(36).slice(2), name }])
  }

  async function sendMessage(convId, content) {
    if (!content.trim()) return
    const now = new Date().toISOString()
    const userMsg = { id: Math.random().toString(36).slice(2), role: "user", content, createdAt: now }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = [...(c.messages || []), userMsg]
        return {
          ...c,
          messages: msgs,
          updatedAt: now,
          messageCount: msgs.length,
          preview: content.slice(0, 80),
        }
      }),
    )

    setIsThinking(true)
    setThinkingConvId(convId)

    const currentConvId = convId
    let assistantText = ""
    let assistantPayload = null

    try {
      const currentConversation = conversations.find((c) => c.id === currentConvId)
      const history = (currentConversation?.messages || [])
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }))
        .filter((m) => m.role === "user" || m.role === "assistant")

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history, sessionId: currentConvId, userId: "demo-user" }),
      })

      if (!res.ok) {
        throw new Error("RAG API 호출 실패")
      }
      const data = await res.json()
      assistantText = data?.mainMessage || data?.message || "응답을 생성하지 못했습니다."
      assistantPayload = data
    } catch {
      const prevAgentState = agentStateRef.current[currentConvId]
      const result = runCommerceAgent(content, prevAgentState)
      agentStateRef.current[currentConvId] = result.nextState
      assistantText = result.message
    } finally {
      setIsThinking(false)
      setThinkingConvId(null)
    }

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== currentConvId) return c
        const asstMsg = {
          id: Math.random().toString(36).slice(2),
          role: "assistant",
          content: assistantText,
          createdAt: new Date().toISOString(),
          payload: assistantPayload,
        }
        const msgs = [...(c.messages || []), asstMsg]
        return {
          ...c,
          messages: msgs,
          updatedAt: new Date().toISOString(),
          messageCount: msgs.length,
          preview: asstMsg.content.slice(0, 80),
        }
      }),
    )
  }

  function editMessage(convId, messageId, newContent) {
    const now = new Date().toISOString()
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c
        const msgs = (c.messages || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent, editedAt: now } : m,
        )
        return {
          ...c,
          messages: msgs,
          preview: msgs[msgs.length - 1]?.content?.slice(0, 80) || c.preview,
        }
      }),
    )
  }

  function resendMessage(convId, messageId) {
    const conv = conversations.find((c) => c.id === convId)
    const msg = conv?.messages?.find((m) => m.id === messageId)
    if (!msg) return
    sendMessage(convId, msg.content)
  }

  function pauseThinking() {
    setIsThinking(false)
    setThinkingConvId(null)
  }

  function handleUseTemplate(template) {
    // This will be passed down to the Composer component
    // The Composer will handle inserting the template content
    if (composerRef.current) {
      composerRef.current.insertTemplate(template.content)
    }
  }

  const composerRef = useRef(null)

  const selected = conversations.find((c) => c.id === selectedId) || null

  if (!mounted) {
    return <div className="h-dvh w-full bg-zinc-50 dark:bg-zinc-950" />
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-zinc-200/60 bg-white/80 px-3 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="ml-1 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="사이드바 열기"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="inline-flex h-4 w-4 items-center justify-center">✱</span> Glider
        </div>
        <div className="ml-auto flex items-center gap-2">
          <GhostIconButton label="일정">
            <Calendar className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="앱">
            <LayoutGrid className="h-4 w-4" />
          </GhostIconButton>
          <GhostIconButton label="더보기">
            <MoreHorizontal className="h-4 w-4" />
          </GhostIconButton>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </div>

      <div className="flex h-[calc(100dvh-0px)] w-full">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          setTheme={setTheme}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          conversations={conversations}
          pinned={pinned}
          recent={recent}
          folders={folders}
          folderCounts={folderCounts}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createFolder={createFolder}
          createNewChat={createNewChat}
          templates={templates}
          setTemplates={setTemplates}
          onUseTemplate={handleUseTemplate}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          <Header createNewChat={createNewChat} sidebarCollapsed={sidebarCollapsed} setSidebarOpen={setSidebarOpen} />
          <ChatPane
            ref={composerRef}
            conversation={selected}
            onSend={(content) => selected && sendMessage(selected.id, content)}
            onVoiceInput={() => {
              if (!voiceSupported) return
              if (isListening) stopListening()
              else
                startListening((text) => {
                  if (selected) sendMessage(selected.id, text)
                })
            }}
            isListening={isListening}
            onQuickAction={(action) => {
              if (!selected) return
              if (typeof action === "string" && action.startsWith("prompt:")) {
                sendMessage(selected.id, action.replace("prompt:", ""))
              }
            }}
            onEditMessage={(messageId, newContent) => selected && editMessage(selected.id, messageId, newContent)}
            onResendMessage={(messageId) => selected && resendMessage(selected.id, messageId)}
            isThinking={isThinking && thinkingConvId === selected?.id}
            onPauseThinking={pauseThinking}
          />
        </main>
      </div>
    </div>
  )
}
