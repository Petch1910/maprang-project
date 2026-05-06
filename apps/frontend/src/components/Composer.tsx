import { Plus, SendHorizontal } from 'lucide-react'

type ComposerProps = {
  disabled: boolean
  message: string
  onMessageChange: (message: string) => void
  onSubmit: () => void
}

export function Composer({ disabled, message, onMessageChange, onSubmit }: ComposerProps) {
  return (
    <form
      className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_44px] items-center gap-2 rounded-2xl border border-white/10 bg-[#18181b]/90 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.40)] backdrop-blur-xl">
        <button
          className="grid size-10 place-items-center rounded-xl bg-white/8 text-white transition hover:bg-white/12 disabled:opacity-50"
          disabled={disabled}
          title="เพิ่มตัวเลือก"
          type="button"
        >
          <Plus size={18} />
        </button>
        <label className="block min-w-0">
          <input
            className="min-h-11 w-full rounded-xl border border-transparent bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/12 focus:bg-black/18"
            disabled={disabled}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="พิมพ์ข้อความ..."
            value={message}
          />
        </label>
        <button
          className="grid size-11 place-items-center rounded-xl bg-white text-slate-950 transition hover:bg-white/90 disabled:opacity-45"
          disabled={disabled || !message.trim()}
          title="ส่งข้อความ"
          type="submit"
        >
          <SendHorizontal size={19} />
        </button>
      </div>
    </form>
  )
}
