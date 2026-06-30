import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Copy, Edit3, Flag, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import type { ChatMessage } from '../lib/api'
import { getSafeClipboard, safeWriteClipboardText } from '../lib/safeClipboard'

const MessageMarkdown = lazy(() =>
  import('./MessageMarkdown').then((module) => ({ default: module.MessageMarkdown })),
)

type MessageBubbleProps = {
  assistantAvatarUrl?: string | null
  assistantName?: string
  chat: ChatMessage
  isReporting?: boolean
  onReport?: (chat: ChatMessage) => void
}

function avatarInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'M'
}

function PlainMessageFallback({ content }: { content: string }) {
  return <p className="m-0 whitespace-pre-wrap break-words">{content}</p>
}

export function MessageBubble({
  assistantAvatarUrl,
  assistantName = 'Maprang',
  chat,
  isReporting = false,
  onReport,
}: MessageBubbleProps) {
  const isUser = chat.role === 'user'
  const canReport = chat.role !== 'system' && chat.content.trim().length > 0 && Boolean(onReport)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [copyNotice, setCopyNotice] = useState('')
  const menuRef = useRef<HTMLDivElement | null>(null)
  const reportDisabledReason = isReporting ? 'กำลังส่งรายงานข้อความนี้' : ''
  const unavailableActionReason = 'ยังไม่มีระบบแก้ไข ลบ หรือสร้างคำตอบใหม่เฉพาะข้อความนี้ใน API ปัจจุบัน'

  useEffect(() => {
    if (!isMenuOpen) return

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false)
    }

    const closeOnEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    window.addEventListener('pointerdown', closeOnPointerDown)
    window.addEventListener('keydown', closeOnEsc)
    return () => {
      window.removeEventListener('pointerdown', closeOnPointerDown)
      window.removeEventListener('keydown', closeOnEsc)
    }
  }, [isMenuOpen])

  const copyMessage = () => {
    void safeWriteClipboardText(getSafeClipboard(), chat.content).then((copied) => {
      setCopyNotice(copied ? 'คัดลอกแล้ว' : 'คัดลอกไม่ได้ในเบราว์เซอร์นี้')
      window.setTimeout(() => setCopyNotice(''), 1600)
    })
    setIsMenuOpen(false)
  }

  return (
    <article className={`flex w-full items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        assistantAvatarUrl ? (
          <img
            alt=""
            className="mb-1 size-8 flex-none rounded-lg object-cover ring-1 ring-white/14 shadow-[0_10px_26px_rgba(0,0,0,0.28)]"
            src={assistantAvatarUrl}
          />
        ) : (
          <div className="mb-1 grid size-8 flex-none place-items-center rounded-lg border border-white/10 bg-white/9 text-[10px] font-black text-white/70 shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
            {avatarInitial(assistantName)}
          </div>
        )
      )}

      <div className="group relative min-w-0 max-w-[min(720px,78%)]">
        <div
          className={`px-4 py-3 text-sm leading-7 shadow-[0_18px_46px_rgba(0,0,0,0.24)] ${
            isUser
              ? 'rounded-2xl rounded-br-md bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.2)]'
              : 'markdown-body rounded-2xl rounded-bl-md border border-[#2e2e44] bg-[#1e1e34]/90 text-slate-100 backdrop-blur-xl'
          }`}
        >
          {isUser ? (
            <p className="m-0 whitespace-pre-wrap break-words">{chat.content}</p>
          ) : chat.content.trim() ? (
            <Suspense fallback={<PlainMessageFallback content={chat.content} />}>
              <MessageMarkdown content={chat.content} />
            </Suspense>
          ) : (
            <p className="m-0 text-white/55">กำลังพิมพ์...</p>
          )}
        </div>

        <div
          className={`absolute top-1 ${isUser ? 'left-[-2.25rem]' : 'right-[-2.25rem]'}`}
          ref={menuRef}
        >
          <button
            aria-expanded={isMenuOpen}
            aria-label="เปิดเมนูข้อความ"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-[#11111c]/92 text-white/58 opacity-100 shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition hover:bg-white/12 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
            data-testid={`message-actions-${chat.id}`}
            onClick={() => setIsMenuOpen((current) => !current)}
            title="เมนูข้อความ"
            type="button"
          >
            <MoreHorizontal size={16} />
          </button>
          {isMenuOpen && (
            <div
              className={`absolute top-9 z-30 w-56 rounded-xl border border-[#2e2e44] bg-[#171726] p-1.5 text-sm font-bold text-white shadow-[0_20px_70px_rgba(0,0,0,0.65)] ${
                isUser ? 'left-0' : 'right-0'
              }`}
              data-testid={`message-action-menu-${chat.id}`}
            >
              <button
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-white/78 hover:bg-white/8 hover:text-white"
                data-testid={`message-copy-${chat.id}`}
                onClick={copyMessage}
                title="คัดลอกข้อความ"
                type="button"
              >
                <Copy size={16} />
                คัดลอกข้อความ
              </button>
              <button
                aria-disabled={isReporting || !canReport}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-white/78 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid={`message-report-${chat.id}`}
                disabled={isReporting || !canReport}
                onClick={() => {
                  setIsMenuOpen(false)
                  onReport?.(chat)
                }}
                title={reportDisabledReason || (canReport ? 'รายงานข้อความนี้' : 'ข้อความนี้ยังรายงานไม่ได้')}
                type="button"
              >
                <Flag size={16} />
                {isReporting ? 'กำลังรายงาน...' : 'รายงานข้อความ'}
              </button>
              <button
                aria-disabled="true"
                className="flex min-h-10 w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 text-left text-white/38"
                data-testid={`message-edit-disabled-${chat.id}`}
                disabled
                title={unavailableActionReason}
                type="button"
              >
                <Edit3 size={16} />
                แก้ไขข้อความ
              </button>
              <button
                aria-disabled="true"
                className="flex min-h-10 w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 text-left text-white/38"
                data-testid={`message-regenerate-disabled-${chat.id}`}
                disabled
                title={unavailableActionReason}
                type="button"
              >
                <RotateCcw size={16} />
                สร้างคำตอบใหม่
              </button>
              <button
                aria-disabled="true"
                className="flex min-h-10 w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 text-left text-rose-200/45"
                data-testid={`message-delete-disabled-${chat.id}`}
                disabled
                title={unavailableActionReason}
                type="button"
              >
                <Trash2 size={16} />
                ลบข้อความ
              </button>
            </div>
          )}
        </div>

        {copyNotice && (
          <p
            className={`absolute -bottom-7 m-0 rounded-full border border-white/10 bg-[#11111c]/92 px-2.5 py-1 text-[11px] font-bold text-white/70 shadow-lg ${
              isUser ? 'right-0' : 'left-0'
            }`}
          >
            {copyNotice}
          </p>
        )}
      </div>

      {isUser && (
        <div className="mb-1 grid size-8 flex-none place-items-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-[10px] font-black text-white shadow-[0_4px_12px_rgba(168,85,247,0.2)]">
          คุณ
        </div>
      )}
    </article>
  )
}
