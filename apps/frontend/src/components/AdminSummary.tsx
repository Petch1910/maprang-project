import type { AdminSummary as AdminSummaryData } from '../lib/api'

type AdminSummaryProps = {
  summary: AdminSummaryData | null
  onRefresh: () => Promise<void>
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-900/10 bg-white/75 p-3">
      <p className="m-0 text-[11px] font-bold tracking-widest text-slate-400 uppercase">{label}</p>
      <strong className="mt-1 block text-lg text-slate-900">{value}</strong>
    </div>
  )
}

export function AdminSummary({ summary, onRefresh }: AdminSummaryProps) {
  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">Admin</p>
          <h2 className="m-0 text-lg font-bold text-slate-900">ภาพรวมระบบ</h2>
        </div>
        <button
          className="min-h-8 rounded-full border border-slate-900/10 bg-white px-3 text-xs font-bold text-slate-700"
          onClick={onRefresh}
          type="button"
        >
          รีเฟรช
        </button>
      </div>

      {summary ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="characters" value={summary.totals.characters.toLocaleString()} />
            <Metric label="published" value={summary.totals.publishedCharacters.toLocaleString()} />
            <Metric label="chats" value={summary.totals.chats.toLocaleString()} />
            <Metric label="tokens" value={summary.totals.tokens.toLocaleString()} />
          </div>

          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-bold text-slate-500">
            <div className="flex flex-wrap gap-2">
              <span>{summary.totals.messages.toLocaleString()} messages</span>
              <span>{summary.totals.loreEntries.toLocaleString()} lore</span>
              <span>{summary.totals.favorites.toLocaleString()} favorites</span>
              <span>${Number(summary.totals.cost).toFixed(6)}</span>
            </div>
          </div>

          {summary.topCharacters.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {summary.topCharacters.slice(0, 3).map((character) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border border-slate-900/10 bg-white/70 p-2.5 text-xs"
                  key={character.id}
                >
                  <strong className="truncate text-slate-800">{character.name}</strong>
                  <span className="font-bold text-slate-400">Q {character.qualityScore}</span>
                  <span className="truncate text-slate-500">
                    {character.chatCount} chats · {character.viewCount} views · {character.favoriteCount} favs
                  </span>
                  <span className="font-bold text-slate-400">{character.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="m-0 rounded-lg border border-dashed border-slate-900/15 bg-white/60 p-3 text-sm text-slate-500">
          ยังไม่มีข้อมูล dashboard
        </p>
      )}
    </section>
  )
}
