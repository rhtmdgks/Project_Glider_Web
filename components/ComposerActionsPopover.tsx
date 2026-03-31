// @ts-nocheck
"use client"
import { useState } from "react"
import { Paperclip, Bot, Search, Palette, BookOpen, MoreHorizontal, Globe, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"

export default function ComposerActionsPopover({ children }) {
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const mainActions = [
    {
      icon: Paperclip,
      label: "사진 및 파일 추가",
      action: () => console.log("사진 및 파일 추가"),
    },
    {
      icon: Bot,
      label: "에이전트 모드",
      badge: "신규",
      action: () => console.log("에이전트 모드"),
    },
    {
      icon: Search,
      label: "심층 리서치",
      action: () => console.log("심층 리서치"),
    },
    {
      icon: Palette,
      label: "이미지 생성",
      action: () => console.log("이미지 생성"),
    },
    {
      icon: BookOpen,
      label: "학습/스터디",
      action: () => console.log("학습/스터디"),
    },
  ]

  const moreActions = [
    {
      icon: Globe,
      label: "웹 검색",
      action: () => console.log("웹 검색"),
    },
    {
      icon: Palette,
      label: "캔버스",
      action: () => console.log("캔버스"),
    },
    {
      icon: () => (
        <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 via-green-400 to-yellow-400 flex items-center justify-center">
          <div className="h-2.5 w-2.5 bg-white rounded-sm" />
        </div>
      ),
      label: "Google Drive 연결",
      action: () => console.log("Google Drive 연결"),
    },
    {
      icon: () => (
        <div className="h-5 w-5 rounded bg-blue-500 flex items-center justify-center">
          <div className="h-2.5 w-2.5 bg-white rounded-sm" />
        </div>
      ),
      label: "OneDrive 연결",
      action: () => console.log("OneDrive 연결"),
    },
    {
      icon: () => (
        <div className="h-5 w-5 rounded bg-teal-500 flex items-center justify-center">
          <div className="h-2.5 w-2.5 bg-white rounded-sm" />
        </div>
      ),
      label: "Sharepoint 연결",
      action: () => console.log("Sharepoint 연결"),
    },
  ]

  const handleAction = (action) => {
    action()
    setOpen(false)
    setShowMore(false)
  }

  const handleMoreClick = () => {
    setShowMore(true)
  }

  const handleBackClick = () => {
    setShowMore(false)
  }

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen)
    if (!newOpen) {
      setShowMore(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="top">
        {!showMore ? (
          <div className="p-2 min-w-[220px]">
            <div className="space-y-0.5">
              {mainActions.map((action, index) => {
                const IconComponent = action.icon
                return (
                  <button
                    key={index}
                    onClick={() => handleAction(action.action)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <IconComponent className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <span>{action.label}</span>
                    {action.badge && (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full font-medium">
                        {action.badge}
                      </span>
                    )}
                  </button>
                )
              })}
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
              <button
                onClick={handleMoreClick}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <MoreHorizontal className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <span>더보기</span>
                <ChevronRight className="h-4 w-4 ml-auto text-zinc-400" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-[min(440px,92vw)] flex-col sm:min-w-[440px] sm:flex-row">
            <div className="flex-1 border-b border-zinc-200 p-2 dark:border-zinc-700 sm:border-b-0 sm:border-r">
              <div className="space-y-0.5">
                {mainActions.map((action, index) => {
                  const IconComponent = action.icon
                  return (
                    <button
                      key={index}
                      onClick={() => handleAction(action.action)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <IconComponent className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                      <span>{action.label}</span>
                      {action.badge && (
                        <span className="ml-auto px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full font-medium">
                          {action.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
                <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
                <button
                  onClick={handleBackClick}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors bg-zinc-100 dark:bg-zinc-800"
                >
                  <MoreHorizontal className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  <span>더보기</span>
                  <ChevronRight className="h-4 w-4 ml-auto text-zinc-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-2">
              <div className="space-y-0.5">
                {moreActions.map((action, index) => {
                  const IconComponent = action.icon
                  return (
                    <button
                      key={index}
                      onClick={() => handleAction(action.action)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      {typeof IconComponent === "function" ? (
                        <IconComponent />
                      ) : (
                        <IconComponent className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                      )}
                      <span>{action.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
