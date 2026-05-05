import { useAppDispatch, useAppSelector } from '../store/hooks'
import { savePersonaDraft, selectPersonaDraft } from '../store/slices/draftsSlice'
import { selectIsLowToken, selectTokenBalance } from '../store/slices/walletSlice'

export function ProfilePage() {
  const dispatch = useAppDispatch()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isLowToken = useAppSelector(selectIsLowToken)
  const personaDraft = useAppSelector(selectPersonaDraft)

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
      <section className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-black">Profile / Persona</h1>
        <p className="mt-2 text-slate-600">Persona, content preferences, favorites, and created characters will live here.</p>
        <label className="mt-6 block">
          <span className="text-sm font-black text-slate-600">Persona draft</span>
          <textarea
            className="mt-2 min-h-40 w-full rounded-2xl border border-slate-900/10 p-4 text-sm outline-none focus:border-blue-500"
            onChange={(event) => dispatch(savePersonaDraft(event.target.value))}
            placeholder="Name, pronouns, roleplay persona, boundaries..."
            value={personaDraft}
          />
        </label>
      </section>

      <aside className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-slate-500">Token balance</p>
        <p className="mt-2 text-4xl font-black">{tokenBalance.toLocaleString()}</p>
        {isLowToken && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-700">Token balance is low.</p>}
      </aside>
    </div>
  )
}
