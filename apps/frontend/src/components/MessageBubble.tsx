import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../lib/api'

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

export function MessageBubble({
  assistantAvatarUrl,
  assistantName = 'Maprang',
  chat,
  isReporting = false,
  onReport,
}: MessageBubbleProps) {
  const isUser = chat.role === 'user'
  const canReport = chat.role !== 'system' && chat.content.trim().length > 0 && Boolean(onReport)

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

      <div
        className={`group min-w-0 max-w-[min(720px,78%)] px-4 py-3 text-sm leading-7 shadow-[0_18px_46px_rgba(0,0,0,0.24)] ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-white text-slate-950'
            : 'markdown-body rounded-2xl rounded-bl-md border border-white/10 bg-[#1b1c21]/86 text-white backdrop-blur-xl'
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
            className="mt-2 inline-flex min-h-7 rounded-full border border-white/10 bg-white/5 px-2.5 text-xs font-bold text-white/58 transition hover:bg-white/10 hover:text-white disabled:opacity-60 sm:hidden sm:group-hover:inline-flex"
            data-testid={`message-report-${chat.id}`}
            disabled={isReporting}
            onClick={() => onReport?.(chat)}
            type="button"
          >
            {isReporting ? 'กำลังรายงาน...' : 'รายงาน'}
          </button>
        )}
      </div>

      {isUser && (
        <div className="mb-1 grid size-8 flex-none place-items-center rounded-lg bg-white text-[10px] font-black text-slate-950 shadow-[0_10px_26px_rgba(0,0,0,0.22)]">
          คุณ
        </div>
      )}
    </article>
  )
}
