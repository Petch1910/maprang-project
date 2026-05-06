import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../lib/api'

type MessageBubbleProps = {
  chat: ChatMessage
  isReporting?: boolean
  onReport?: (chat: ChatMessage) => void
}

export function MessageBubble({ chat, isReporting = false, onReport }: MessageBubbleProps) {
  const isUser = chat.role === 'user'
  const canReport = chat.role !== 'system' && chat.content.trim().length > 0 && Boolean(onReport)

  return (
    <article className={`flex w-full items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mb-1 grid size-8 flex-none place-items-center rounded-full bg-white/12 text-[11px] font-black text-white ring-1 ring-white/12">
          AI
        </div>
      )}

      <div
        className={`group min-w-0 max-w-[min(760px,84%)] rounded-2xl px-4 py-3 text-sm leading-7 shadow-[0_14px_42px_rgba(0,0,0,0.22)] ${
          isUser
            ? 'rounded-br-md bg-white text-slate-950'
            : 'rounded-bl-md border border-white/10 bg-black/38 text-white backdrop-blur-md markdown-body'
        }`}
      >
        {isUser ? (
          <p className="m-0 whitespace-pre-wrap break-words">{chat.content}</p>
        ) : chat.content.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.content}</ReactMarkdown>
        ) : (
          <p className="m-0 text-white/55">กำลังพิมพ์...</p>
        )}
        {canReport && !isUser && (
          <button
            className="mt-2 hidden min-h-7 rounded-full border border-white/10 bg-white/5 px-2.5 text-xs font-bold text-white/50 transition hover:bg-white/10 hover:text-white group-hover:inline-flex disabled:opacity-60"
            disabled={isReporting}
            onClick={() => onReport?.(chat)}
            type="button"
          >
            {isReporting ? 'กำลังรายงาน...' : 'รายงาน'}
          </button>
        )}
      </div>

      {isUser && (
        <div className="mb-1 grid size-8 flex-none place-items-center rounded-full bg-white text-[11px] font-black text-slate-950">
          คุณ
        </div>
      )}
    </article>
  )
}
