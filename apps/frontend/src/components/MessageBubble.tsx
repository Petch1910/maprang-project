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
    <article
      className={`grid max-w-[min(760px,92%)] items-end gap-3 ${
        isUser ? 'grid-cols-[minmax(0,auto)_40px] self-end' : 'grid-cols-[40px_minmax(0,auto)] self-start'
      }`}
    >
      <div
        className={`grid size-10 place-items-center rounded-full text-xs font-extrabold ${
          isUser ? 'col-start-2 row-start-1 bg-white text-slate-950' : 'bg-white/15 text-white ring-1 ring-white/15'
        }`}
      >
        {isUser ? 'คุณ' : 'AI'}
      </div>

      <div
        className={`min-w-0 rounded-[18px] px-4 py-3.5 leading-relaxed shadow-[0_16px_44px_rgba(0,0,0,0.22)] ${
          isUser ? 'col-start-1 row-start-1 bg-white text-slate-950' : 'border border-white/10 bg-black/35 text-white backdrop-blur-md'
        } ${isUser ? '' : 'markdown-body'}`}
      >
        {isUser ? (
          <p className="m-0 whitespace-pre-wrap break-words">{chat.content}</p>
        ) : chat.content.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.content}</ReactMarkdown>
        ) : (
          <p className="m-0 text-white/55">กำลังพิมพ์...</p>
        )}
        {canReport && (
          <div className={`mt-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <button
              className={`min-h-8 rounded-full border px-2.5 text-xs font-extrabold transition disabled:opacity-60 ${
                isUser
                  ? 'border-slate-900/15 bg-slate-900/5 text-slate-600 hover:bg-slate-900/10'
                  : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
              }`}
              disabled={isReporting}
              onClick={() => onReport?.(chat)}
              type="button"
            >
              {isReporting ? 'กำลังรายงาน...' : 'รายงาน'}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
