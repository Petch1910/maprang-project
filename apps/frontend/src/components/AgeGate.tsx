import { useAppDispatch, useAppSelector } from '../store/hooks'
import { selectContentSettings, setAdultStatus } from '../store/slices/contentSlice'

export function AgeGate() {
  const dispatch = useAppDispatch()
  const content = useAppSelector(selectContentSettings)
  if (content.ageGateAnswered) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-lg border border-white/10 bg-white p-5 shadow-2xl">
        <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Content preference</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Choose your browsing mode</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Maprang supports relationship-heavy roleplay. Mature discovery stays hidden unless you confirm adult mode.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-16 rounded-lg border border-slate-900/10 bg-slate-50 px-4 text-left transition hover:bg-white"
            onClick={() => dispatch(setAdultStatus(false))}
            type="button"
          >
            <span className="block text-sm font-black text-slate-900">Teen mode</span>
            <span className="mt-1 block text-xs font-bold text-slate-500">General and softer romance only.</span>
          </button>
          <button
            className="min-h-16 rounded-lg bg-slate-950 px-4 text-left text-white transition hover:bg-slate-800"
            onClick={() => dispatch(setAdultStatus(true))}
            type="button"
          >
            <span className="block text-sm font-black">Adult mode</span>
            <span className="mt-1 block text-xs font-bold text-white/70">Enables mature and restricted discovery controls.</span>
          </button>
        </div>
      </section>
    </div>
  )
}
