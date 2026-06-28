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
  const submitLockRef = useRef(false)
  const canSend = !disabled && canSubmit && message.trim().length > 0
  const busyDisabledReason = disabled ? 'ระบบกำลังตอบอยู่ รอให้จบก่อนใช้งาน' : ''
  const sendButtonTitle = canSend
    ? 'ส่งข้อความ'
    : busyDisabledReason || (!canSubmit ? sendDisabledReason || 'เครดิตไม่พอสำหรับส่งข้อความ' : 'พิมพ์ข้อความก่อนส่ง')

  const handleSubmitRequest = () => {
    if (!canSend || submitLockRef.current) return
    submitLockRef.current = true
    Promise.resolve(onSubmit()).finally(() => {
      submitLockRef.current = false
    })
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const nextHeight = Math.min(textarea.scrollHeight, 128)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > 128 ? 'auto' : 'hidden'
  }, [message])

  useEffect(() => {
    if (!disabled) submitLockRef.current = false
  }, [disabled, message])

  return (
    <form
      className="mx-auto w-full max-w-[820px] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-5"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmitRequest()
      }}
    >
      {isToolTrayOpen && (
        <div className="missai-card mb-2 rounded-2xl p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 flex-1 basis-full items-center gap-2 rounded-xl bg-white/7 px-3 text-xs font-black text-[var(--color-text-muted)] sm:basis-auto">
              <Sparkles size={15} />
              ตัวช่วยข้อความ
            </span>
            {suggestionPrompts.map((item) => (
              <button
                className="missai-button-secondary min-h-9 flex-1 basis-[9rem] rounded-xl px-3 text-xs"
                aria-disabled={disabled}
                data-testid={`chat-suggestion-${item.label}`}
                disabled={disabled}
                key={item.label}
                onClick={() => {
                  onMessageChange(item.value)
                  setIsToolTrayOpen(false)
                }}
                title={busyDisabledReason || item.label}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="missai-card grid grid-cols-[38px_minmax(0,1fr)_42px] items-center gap-2 rounded-2xl p-2 shadow-[0_22px_70px_rgba(0,0,0,0.48)] sm:grid-cols-[40px_minmax(0,1fr)_46px]">
        <button
          aria-label="เปิดตัวช่วยข้อความ"
          aria-expanded={isToolTrayOpen}
          aria-disabled={disabled}
          className={`grid size-9 place-items-center rounded-xl transition hover:bg-white/12 hover:text-white disabled:opacity-50 sm:size-10 ${
            isToolTrayOpen ? 'bg-[var(--color-accent-purple)]/20 text-white' : 'bg-white/8 text-[var(--color-text-muted)]'
          }`}
          disabled={disabled}
          onClick={() => setIsToolTrayOpen((current) => !current)}
          data-testid="chat-composer-tools"
          title={busyDisabledReason || 'เพิ่มตัวช่วยข้อความ'}
          type="button"
        >
          <Plus size={18} />
        </button>
        <label className="block min-w-0">
          <textarea
            className="max-h-32 min-h-11 w-full resize-none overflow-hidden rounded-xl border border-transparent bg-transparent px-2 py-3 text-sm font-semibold leading-6 text-[var(--color-text-main)] outline-none placeholder:text-white/32 focus:border-white/12 focus:bg-black/18"
            data-testid="chat-composer-input"
            disabled={disabled}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.shiftKey || !canSend) return
              event.preventDefault()
              handleSubmitRequest()
            }}
            placeholder="พิมพ์ข้อความ..."
            ref={textareaRef}
            rows={1}
            title={busyDisabledReason || 'พิมพ์ข้อความถึงตัวละคร'}
            value={message}
          />
        </label>
        <button type="submit"
          aria-label="ส่งข้อความ"
          aria-disabled={!canSend}
          className={`grid size-10 place-items-center rounded-xl transition sm:size-11 ${
            canSend
              ? 'bg-gradient-to-r from-[var(--color-accent-purple)] to-[#8b5cf6] text-white shadow-[0_10px_26px_rgba(172,75,255,0.28)] hover:brightness-110'
              : 'bg-white/14 text-white/35'
          }`}
          data-testid="chat-composer-submit"
          disabled={!canSend}
          title={sendButtonTitle}
        >
          <SendHorizontal size={19} />
        </button>
      </div>
    </form>
  )
}
