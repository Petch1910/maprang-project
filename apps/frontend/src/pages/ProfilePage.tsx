import { Link } from 'react-router-dom'
import { Coins, ShieldCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { savePersonaDraft, selectPersonaDraft } from '../store/slices/draftsSlice'
import { selectIsLowToken, selectTokenBalance } from '../store/slices/walletSlice'

const personaTemplate = [
  'Name:',
  'Pronouns:',
  'Roleplay style:',
  'Boundaries:',
  'Preferred tone:',
  'Things characters should remember:',
].join('\n')

export function ProfilePage() {
  const dispatch = useAppDispatch()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isLowToken = useAppSelector(selectIsLowToken)
  const personaDraft = useAppSelector(selectPersonaDraft)
  const personaLength = personaDraft.trim().length

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
      <section className="rounded-lg border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black">Profile / Persona</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              This persona is auto-saved locally and attached to every chat request as stable player context.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Auto-saved</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            className="min-h-10 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:bg-white"
            onClick={() => dispatch(savePersonaDraft(personaDraft.trim() ? `${personaDraft}\n\n${personaTemplate}` : personaTemplate))}
            type="button"
          >
            Insert template
          </button>
          <button
            className="min-h-10 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-sm font-black text-slate-700 transition hover:bg-white"
            onClick={() => dispatch(savePersonaDraft(''))}
            type="button"
          >
            Clear persona
          </button>
          <div className="flex min-h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-bold text-slate-500">
            {personaLength.toLocaleString()} characters
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-black text-slate-600">Persona draft</span>
          <textarea
            className="mt-2 min-h-56 w-full resize-y rounded-lg border border-slate-900/10 p-4 text-sm leading-7 outline-none focus:border-blue-500"
            onChange={(event) => dispatch(savePersonaDraft(event.target.value))}
            placeholder="Name, pronouns, roleplay persona, boundaries..."
            value={personaDraft}
          />
        </label>
        <div className="mt-4 rounded-lg border border-blue-500/15 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          Keep this concise. Best results come from stable identity, roleplay preferences, and hard boundaries instead of long backstory.
        </div>
      </section>

      <aside className="rounded-lg border border-slate-900/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-slate-500">Token balance</p>
        <p className="mt-2 text-4xl font-black">{tokenBalance.toLocaleString()}</p>
        {isLowToken && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">Token balance is low.</p>}
        <div className="mt-5 space-y-2 text-sm text-slate-600">
          <p className="m-0 font-bold text-slate-900">Usage notes</p>
          <p className="m-0">Streaming disables repeat sends while the model is replying.</p>
          <p className="m-0">Long persona text increases prompt size, so keep it focused.</p>
        </div>

        <div className="mt-5 border-t border-slate-900/10 pt-5">
          <p className="m-0 text-sm font-black text-slate-900">Account tools</p>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-black text-white transition hover:bg-amber-600"
            to="/wallet"
          >
            <Coins size={17} />
            Wallet usage
          </Link>
          <Link
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
            to="/moderation"
          >
            <ShieldCheck size={17} />
            Moderation queue
          </Link>
        </div>
      </aside>
    </div>
  )
}
