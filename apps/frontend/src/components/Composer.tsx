type ComposerProps = {
  disabled: boolean
  message: string
  onMessageChange: (message: string) => void
  onSubmit: () => void
}

export function Composer({ disabled, message, onMessageChange, onSubmit }: ComposerProps) {
  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-slate-900/10 bg-white/70 px-4 py-4 backdrop-blur-xl sm:px-8 sm:pb-7"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <input
        className="min-h-13 w-full rounded-2xl border border-slate-900/15 bg-white px-4.5 text-slate-900 outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15"
        value={message}
        onChange={(event) => onMessageChange(event.target.value)}
        placeholder="Type a message to Maprang..."
        disabled={disabled}
      />
      <button
        className="min-h-13 min-w-18 rounded-2xl border-0 bg-linear-to-br from-blue-600 to-orange-400 px-4 font-extrabold text-white transition hover:brightness-105 disabled:opacity-60"
        disabled={disabled || !message.trim()}
        type="submit"
      >
        Send
      </button>
    </form>
  )
}
