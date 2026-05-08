import { useEffect, useRef, useState } from 'react'
import { Plus, SendHorizontal, Sparkles } from 'lucide-react'

type ComposerProps = {
  canSubmit?: boolean
  disabled: boolean
  message: string
  onMessageChange: (message: string) => void
  onSubmit: () => void
  sendDisabledReason?: string
}

const suggestionPrompts = [
  {
    label: 'ดำเนินเรื่องต่อ',
    value: 'ดำเนินเรื่องต่อจากจังหวะล่าสุดอย่างเป็นธรรมชาติ โดยให้ตัวละครเป็นฝ่ายขยับบทสนทนา',
  },
  {
    label: 'ถามกลับ',
    value: 'ให้ตัวละครถามกลับหนึ่งคำถามที่เข้ากับอารมณ์และความสัมพันธ์ตอนนี้',
  },
  {
    label: 'เพิ่มบรรยากาศ',
    value: 'เพิ่มรายละเอียดฉาก สีหน้า น้ำเสียง และบรรยากาศรอบตัวแบบพอดี ไม่ยืดเกินไป',
  },
]

export function Composer({
  canSubmit = true,
  disabled,
  message,
  onMessageChange,
  onSubmit,
  sendDisabledReason,
}: ComposerProps) {
  const [isToolTrayOpen, setIsToolTrayOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const canSend = !disabled && canSubmit && message.trim().length > 0

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const nextHeight = Math.min(textarea.scrollHeight, 128)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > 128 ? 'auto' : 'hidden'
  }, [message])

  return (
    <form
      className="mx-auto w-full max-w-[820px] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSend) onSubmit()
      }}
    >
      {isToolTrayOpen && (
        <div className="mb-2 rounded-2xl border border-white/10 bg-[#17181d]/92 p-2 shadow-[0_18px_55px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 flex-1 basis-full items-center gap-2 rounded-xl bg-white/7 px-3 text-xs font-black text-white/62 sm:basis-auto">
              <Sparkles size={15} />
              ตัวช่วยข้อความ
            </span>
            {suggestionPrompts.map((item) => (
              <button
                className="min-h-9 flex-1 basis-[9rem] rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-white/78 transition hover:bg-white/12 hover:text-white"
                data-testid={`chat-suggestion-${item.label}`}
                disabled={disabled}
                key={item.label}
                onClick={() => {
                  onMessageChange(item.value)
                  setIsToolTrayOpen(false)
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[38px_minmax(0,1fr)_42px] items-center gap-2 rounded-2xl border border-white/10 bg-[#17181d]/94 p-2 shadow-[0_22px_70px_rgba(0,0,0,0.48)] backdrop-blur-2xl sm:grid-cols-[40px_minmax(0,1fr)_46px]">
        <button
          aria-label="เปิดตัวช่วยข้อความ"
          aria-expanded={isToolTrayOpen}
          className={`grid size-9 place-items-center rounded-xl text-white/78 transition hover:bg-white/12 hover:text-white disabled:opacity-50 sm:size-10 ${
            isToolTrayOpen ? 'bg-white/14 text-white' : 'bg-white/8'
          }`}
          disabled={disabled}
          onClick={() => setIsToolTrayOpen((current) => !current)}
          data-testid="chat-composer-tools"
          title="เพิ่มตัวช่วยข้อความ"
          type="button"
        >
          <Plus size={18} />
        </button>
        <label className="block min-w-0">
          <textarea
            className="max-h-32 min-h-11 w-full resize-none overflow-hidden rounded-xl border border-transparent bg-transparent px-2 py-3 text-sm font-semibold leading-6 text-white outline-none placeholder:text-white/32 focus:border-white/12 focus:bg-black/18"
            data-testid="chat-composer-input"
            disabled={disabled}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.shiftKey || !canSend) return
              event.preventDefault()
              onSubmit()
            }}
            placeholder="พิมพ์ข้อความ..."
            ref={textareaRef}
            rows={1}
            value={message}
          />
        </label>
        <button type="submit"
          aria-label="ส่งข้อความ"
          className={`grid size-10 place-items-center rounded-xl transition sm:size-11 ${
            canSend ? 'bg-white text-slate-950 hover:bg-white/90' : 'bg-white/18 text-white/35'
          }`}
          data-testid="chat-composer-submit"
          disabled={!canSend}
          title={canSubmit ? 'ส่งข้อความ' : sendDisabledReason || 'ยังส่งข้อความไม่ได้'}
        >
          <SendHorizontal size={19} />
        </button>
      </div>
    </form>
  )
}
