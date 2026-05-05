import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../lib/api'

type MessageBubbleProps = {
  chat: ChatMessage
}

export function MessageBubble({ chat }: MessageBubbleProps) {
  const isUser = chat.role === 'user'

  return (
    <article
      className={`grid max-w-[min(760px,92%)] items-end gap-3 ${
        isUser ? 'grid-cols-[minmax(0,auto)_40px] self-end' : 'grid-cols-[40px_minmax(0,auto)] self-start'
      }`}
    >
      <div
        className={`grid size-10 place-items-center rounded-full text-xs font-extrabold ${
          isUser ? 'col-start-2 row-start-1 bg-slate-900 text-white' : 'bg-orange-100 text-orange-900'
        }`}
      >
        {isUser ? 'คุณ' : 'AI'}
      </div>

      <div
        className={`min-w-0 rounded-[18px] px-4 py-3.5 leading-relaxed shadow-[0_16px_44px_rgba(61,79,112,0.10)] ${
          isUser ? 'col-start-1 row-start-1 bg-blue-600 text-white' : 'bg-white text-slate-700'
        } ${isUser ? '' : 'markdown-body'}`}
      >
        {isUser ? (
          <p className="m-0 whitespace-pre-wrap break-words">{chat.content}</p>
        ) : chat.content.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{chat.content}</ReactMarkdown>
        ) : (
          <p className="m-0 text-slate-400">กำลังเริ่มตอบ...</p>
        )}
      </div>
    </article>
  )
}
