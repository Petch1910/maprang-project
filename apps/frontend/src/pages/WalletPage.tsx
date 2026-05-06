import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Coins, RefreshCw, ReceiptText, TrendingDown } from 'lucide-react'
import { adjustAdminUserTokens, ApiError, fetchUsageSummary, type UsageSummary } from '../lib/api'
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
  if (error instanceof ApiError && error.status === 404) return 'ไม่พบข้อมูลการใช้งานของบัญชีนี้'
  if (error instanceof ApiError && error.status === 401) return 'กรุณาเข้าสู่ระบบอีกครั้งเพื่อดูข้อมูลโทเคน'
  return 'โหลดข้อมูลโทเคนไม่ได้'
}

function transactionLabel(type: NonNullable<UsageSummary['wallet']>['transactions'][number]['type']) {
  const labels: Record<NonNullable<UsageSummary['wallet']>['transactions'][number]['type'], string> = {
    CHAT_USAGE: 'ใช้แชท AI',
    ADMIN_ADJUSTMENT: 'ผู้ดูแลปรับยอด',
    PROMOTION: 'โปรโมชัน',
    PURCHASE: 'เติมโทเคน',
    REFUND: 'คืนโทเคน',
  }
  return labels[type]
}

export function WalletPage() {
  const dispatch = useAppDispatch()
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('1000')
  const [note, setNote] = useState('กำลังโหลดกระเป๋าโทเคน...')

  const usageCost = useMemo(
    () => summary?.usage.recent.reduce((total, item) => total + Number(item.cost ?? 0), 0) ?? 0,
    [summary],
  )

  const loadWallet = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchUsageSummary()
      setSummary(data)
      dispatch(setTokenBalance(data.user.tokenBalance))
      setNote('ข้อมูลโทเคนอัปเดตแล้ว')
    } catch (error) {
      console.error('Load wallet error:', error)
      setNote(errorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [dispatch])

  async function adjustTokens(amount: number) {
    if (!summary || isAdjusting) return
    setIsAdjusting(true)
    try {
      const data = await adjustAdminUserTokens(summary.user.id, amount, amount > 0 ? 'manual_beta_grant' : 'manual_admin_debit')
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              user: data.user,
              wallet: {
                transactions: data.transaction
                  ? [data.transaction, ...(prev.wallet?.transactions ?? [])].slice(0, 20)
                  : (prev.wallet?.transactions ?? []),
              },
            }
          : prev,
      )
      dispatch(setTokenBalance(data.user.tokenBalance))
      setNote(`${amount > 0 ? 'เพิ่ม' : 'หัก'} ${Math.abs(amount).toLocaleString()} โทเคนแล้ว`)
    } catch (error) {
      console.error('Adjust token error:', error)
      setNote(error instanceof ApiError && error.status === 403 ? 'ต้องใช้ Admin API key เพื่อปรับโทเคน' : 'ปรับโทเคนไม่ได้')
    } finally {
      setIsAdjusting(false)
    }
  }

  useEffect(() => {
    loadWallet()
  }, [loadWallet])

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-sm">
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-6">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
              <Coins size={16} />
              กระเป๋าโทเคน
            </p>
            <h1 className="m-0 mt-2 text-3xl font-black tracking-normal text-slate-950">
              {summary ? summary.user.tokenBalance.toLocaleString() : '0'} โทเคน
            </h1>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              ดูยอดโทเคน การใช้งานล่าสุด และความพร้อมสำหรับฉากยาวๆ
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
              รีเฟรช
            </button>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              to="/profile"
            >
              แก้ตัวตนผู้เล่น
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <p className="m-0 text-sm font-black text-slate-500">ใช้ไปทั้งหมด</p>
          <p className="m-0 mt-2 text-2xl font-black text-slate-950">{(summary?.usage.totalTokens ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <p className="m-0 text-sm font-black text-slate-500">จำนวนคำขอ</p>
          <p className="m-0 mt-2 text-2xl font-black text-slate-950">{(summary?.usage.requestCount ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <p className="m-0 text-sm font-black text-slate-500">ค่าใช้จ่ายล่าสุด</p>
          <p className="m-0 mt-2 text-2xl font-black text-slate-950">${usageCost.toFixed(6)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="m-0 text-sm font-black text-slate-950">ปรับโทเคนโดยผู้ดูแล</p>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
              ใช้สำหรับช่วงทดสอบ beta ก่อนเชื่อมระบบชำระเงินหรือโปรโมชันจริง
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              className="min-h-11 rounded-xl border border-slate-900/10 px-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
              inputMode="numeric"
              onChange={(event) => setAdjustAmount(event.target.value)}
              value={adjustAmount}
            />
            <button
              className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
              disabled={isAdjusting || !summary}
              onClick={() => adjustTokens(Math.abs(Number(adjustAmount) || 0))}
              type="button"
            >
              เพิ่ม
            </button>
            <button
              className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
              disabled={isAdjusting || !summary}
              onClick={() => adjustTokens(-Math.abs(Number(adjustAmount) || 0))}
              type="button"
            >
              หัก
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 p-4">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
              <ReceiptText size={17} />
              ประวัติธุรกรรมโทเคน
            </p>
            <p className="m-0 mt-1 text-xs font-bold text-slate-400">รายการเพิ่ม/หักยอดที่ใช้ตรวจสอบ wallet ได้ย้อนหลัง</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm font-bold text-slate-500">กำลังโหลดธุรกรรม...</div>
        ) : !summary || !summary.wallet?.transactions.length ? (
          <div className="p-5 text-sm font-bold text-slate-500">ยังไม่มีธุรกรรมโทเคน</div>
        ) : (
          <div className="divide-y divide-slate-900/10">
            {summary.wallet.transactions.map((item) => (
              <article className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-black text-slate-950">{transactionLabel(item.type)}</p>
                  <p className="m-0 mt-1 truncate text-xs font-bold text-slate-400">
                    {formatDate(item.createdAt)} / คงเหลือ {item.balanceAfter.toLocaleString()} โทเคน
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${
                    item.amount >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {item.amount >= 0 ? '+' : ''}
                  {item.amount.toLocaleString()}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-900/10 p-4">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
              <ReceiptText size={17} />
              การใช้งานล่าสุด
            </p>
            <p className="m-0 mt-1 text-xs font-bold text-slate-400">รายการใช้ AI ล่าสุดที่ backend บันทึกไว้</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm font-bold text-slate-500">กำลังโหลดการใช้งาน...</div>
        ) : !summary || summary.usage.recent.length === 0 ? (
          <div className="p-5 text-sm font-bold text-slate-500">ยังไม่มีการใช้โทเคน</div>
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
                    {item.tokens.toLocaleString()} โทเคน
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
        <p className="m-0 font-black">ระบบกันใช้โทเคนซ้ำ</p>
        <p className="m-0 mt-1">
          ระหว่าง AI กำลังตอบ ระบบจะปิดการส่งซ้ำเพื่อลดการยิง API ซ้ำ ขั้นตอน production ถัดไปคือเชื่อมระบบชำระเงิน โปรโมชัน หรือการเติมโทเคนโดยผู้ดูแล
        </p>
      </section>
    </div>
  )
}
