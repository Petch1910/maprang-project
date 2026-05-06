import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, RefreshCw, ReceiptText, TrendingDown } from 'lucide-react'
import { ApiError, fetchUsageSummary, type UsageSummary } from '../lib/api'
import { useAppDispatch } from '../store/hooks'
import { setTokenBalance } from '../store/slices/walletSlice'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatCost(value: string | null) {
  const cost = Number(value ?? 0)
  if (!Number.isFinite(cost) || cost <= 0) return '$0.000000'
  return `$${cost.toFixed(6)}`
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 404) return 'Usage profile was not found for this account.'
  if (error instanceof ApiError && error.status === 401) return 'Please sign in again to view wallet usage.'
  return 'Could not load wallet usage.'
}

export function WalletPage() {
  const dispatch = useAppDispatch()
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState('Loading wallet...')

  const usageCost = useMemo(
    () => summary?.usage.recent.reduce((total, item) => total + Number(item.cost ?? 0), 0) ?? 0,
    [summary],
  )

  async function loadWallet() {
    setIsLoading(true)
    try {
      const data = await fetchUsageSummary()
      setSummary(data)
      dispatch(setTokenBalance(data.user.tokenBalance))
      setNote('Wallet is up to date.')
    } catch (error) {
      console.error('Load wallet error:', error)
      setNote(errorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWallet()
  }, [])

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-sm">
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-6">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
              <Coins size={16} />
              Wallet
            </p>
            <h1 className="m-0 mt-2 text-3xl font-black tracking-normal text-slate-950">
              {summary ? summary.user.tokenBalance.toLocaleString() : '0'} Tokens
            </h1>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Track AI token spend, recent requests, and whether the account has enough balance for longer scenes.
            </p>
            {note && <p className="m-0 mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{note}</p>}
          </div>

          <div className="grid gap-2">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              disabled={isLoading}
              onClick={loadWallet}
              type="button"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              to="/profile"
            >
              Edit persona
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <p className="m-0 text-sm font-black text-slate-500">Total used</p>
          <p className="m-0 mt-2 text-2xl font-black text-slate-950">{(summary?.usage.totalTokens ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <p className="m-0 text-sm font-black text-slate-500">Requests</p>
          <p className="m-0 mt-2 text-2xl font-black text-slate-950">{(summary?.usage.requestCount ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <p className="m-0 text-sm font-black text-slate-500">Recent cost</p>
          <p className="m-0 mt-2 text-2xl font-black text-slate-950">${usageCost.toFixed(6)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 p-4">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
              <ReceiptText size={17} />
              Recent usage
            </p>
            <p className="m-0 mt-1 text-xs font-bold text-slate-400">Latest AI requests recorded by the backend.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm font-bold text-slate-500">Loading usage...</div>
        ) : !summary || summary.usage.recent.length === 0 ? (
          <div className="p-5 text-sm font-bold text-slate-500">No token usage yet.</div>
        ) : (
          <div className="divide-y divide-slate-900/10">
            {summary.usage.recent.map((item) => (
              <article className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-black text-slate-950">{item.modelName ?? 'unknown model'}</p>
                  <p className="m-0 mt-1 text-xs font-bold text-slate-400">{formatDate(item.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
                    <TrendingDown size={14} />
                    {item.tokens.toLocaleString()} tokens
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {formatCost(item.cost)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="m-0 font-black">Token guard</p>
        <p className="m-0 mt-1">
          Chat actions already disable repeat sends during streaming. Next production step is connecting this page to payments,
          promo grants, or manual admin top-ups.
        </p>
      </section>
    </div>
  )
}
