import { FastForward, Plus, Sparkles } from 'lucide-react'

type ComposerProps = {
  disabled: boolean
  message: string
  onMessageChange: (message: string) => void
  onSubmit: () => void
}

export function Composer({ disabled, message, onMessageChange, onSubmit }: ComposerProps) {
  return (
    <form
      className="mx-auto w-full max-w-5xl px-4 pb-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid grid-cols-[44px_minmax(0,1fr)_52px] items-center gap-2 rounded-lg border border-white/10 bg-[#18181b]/85 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <button
          className="grid size-11 place-items-center rounded-md bg-white/8 text-white transition hover:bg-white/12 disabled:opacity-50"
          disabled={disabled}
          title="เพิ่มตัวเลือก"
          type="button"
        >
          <Plus size={18} />
        </button>
        <label className="relative block min-w-0">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" size={16} />
          <input
            className="min-h-14 w-full rounded-md border border-white/8 bg-black/25 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/25"
            disabled={disabled}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="พิมพ์ข้อความถึงตัวละคร..."
            value={message}
          />
        </label>
        <button
          className="grid size-12 place-items-center rounded-md bg-white text-slate-950 transition hover:bg-white/90 disabled:opacity-50"
          disabled={disabled || !message.trim()}
          title="ส่งข้อความ"
          type="submit"
        >
          <FastForward size={20} />
        </button>
      </div>
    </form>
  )
}
