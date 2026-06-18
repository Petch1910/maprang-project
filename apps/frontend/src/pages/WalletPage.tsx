import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Coins, Gauge, KeyRound, RefreshCw, ReceiptText, TrendingDown, X } from 'lucide-react'
import {
  adjustAdminUserTokens,
  ApiError,
  clearAdminApiKey,
  fetchUsageSummary,
  logUnexpectedError,
  setAdminApiKey,
  type UsageSummary,
} from '../lib/api'
import { safeGetStorageItem } from '../lib/safeStorage'
import { useAppDispatch } from '../store/hooks'
import { setTokenBalance } from '../store/slices/walletSlice'

type WalletTransaction = NonNullable<UsageSummary['wallet']>['transactions'][number]

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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 404) return 'ไม่พบข้อมูลการใช้งานของบัญชีนี้'
  if (error instanceof ApiError && error.status === 401) return 'กรุณาเข้าสู่ระบบอีกครั้งเพื่อดูข้อมูลโทเคน'
  return 'โหลดข้อมูลกระเป๋าโทเคนไม่สำเร็จ'
}

function transactionLabel(type: WalletTransaction['type']) {
  const labels: Record<WalletTransaction['type'], string> = {
    CHAT_USAGE: 'ใช้แชท AI',
    IMAGE_GENERATION: 'สร้างรูป AI',
    ADMIN_ADJUSTMENT: 'ผู้ดูแลปรับยอด',
    PROMOTION: 'โปรโมชัน',
    PURCHASE: 'เติมโทเคน',
    REFUND: 'คืนโทเคน',
    DAILY_LOGIN: 'รางวัลเข้าใช้งานประจำวัน',
    ACHIEVEMENT: 'รางวัลความสำเร็จ',
    PENALTY: 'หักโทเคน',
    EXPIRY: 'โทเคนหมดอายุ',
  }
  return labels[type] || type
}

export function WalletPage() {
  const dispatch = useAppDispatch()
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('1000')
  const [adminKeyInput, setAdminKeyInput] = useState(() =>
    typeof window === 'undefined' ? '' : safeGetStorageItem(window.localStorage, 'maprang:adminKey') || '',
  )
  const [note, setNote] = useState('กำลังโหลดกระเป๋าโทเคน...')

  const maxDailyTokens = useMemo(
    () => Math.max(...(summary?.usage.daily.map((item) => item.tokens) ?? [0]), 1),
    [summary],
  )
  const normalizedAdjustAmount = useMemo(() => {
    const amount = Number(adjustAmount)
    if (!Number.isFinite(amount)) return 0
    return Math.trunc(Math.abs(amount))
  }, [adjustAmount])
  const hasAdminKey = adminKeyInput.trim().length > 0
  const adjustTokenDisabledReason = !summary
    ? 'โหลดข้อมูลกระเป๋าก่อนปรับยอด'
    : isAdjusting
      ? 'กำลังปรับยอดโทเคน'
      : normalizedAdjustAmount <= 0
        ? 'ใส่จำนวนโทเคนมากกว่า 0'
        : !hasAdminKey
          ? 'บันทึก ADMIN_API_KEY ก่อนปรับโทเคน'
          : ''

  const balanceLabel = summary ? `${summary.user.tokenBalance.toLocaleString()} โทเคน` : isLoading ? 'กำลังโหลด...' : '0 โทเคน'
  const totalTokensLabel = summary ? summary.usage.totalTokens.toLocaleString() : isLoading ? '...' : '0'
  const requestCountLabel = summary ? summary.usage.requestCount.toLocaleString() : isLoading ? '...' : '0'
  const totalCostLabel = summary ? formatCost(summary.usage.totalCost) : isLoading ? '...' : '$0.000000'
  const estimatedRemainingLabel = summary
    ? summary.usage.estimate.estimatedRemainingRequests === null
      ? 'ยังประเมินไม่ได้'
      : `${summary.usage.estimate.estimatedRemainingRequests.toLocaleString()} รอบ`
    : isLoading
      ? '...'
      : '0 รอบ'

  const loadWallet = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchUsageSummary()
      setSummary(data)
      dispatch(setTokenBalance(data.user.tokenBalance))
      setNote('ข้อมูลโทเคนอัปเดตแล้ว')
    } catch (error) {
      logUnexpectedError('โหลดกระเป๋าโทเคนไม่สำเร็จ:', error)
      setNote(errorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [dispatch])

  async function adjustTokens(amount: number) {
    if (!summary || isAdjusting || adjustTokenDisabledReason) return
    setIsAdjusting(true)
    try {
      const data = await adjustAdminUserTokens(summary.user.id, amount, amount > 0 ? 'ผู้ดูแลเพิ่มโทเคน' : 'ผู้ดูแลหักโทเคน')
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
      logUnexpectedError('ปรับโทเคนไม่สำเร็จ:', error)
      setNote(
        error instanceof ApiError && error.status === 401
          ? 'ADMIN_API_KEY ไม่ถูกต้องหรือยังไม่ได้บันทึกในเบราว์เซอร์นี้'
          : error instanceof ApiError && error.status === 403
            ? 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลสำหรับปรับโทเคน'
            : 'ปรับโทเคนไม่สำเร็จ',
      )
    } finally {
      setIsAdjusting(false)
    }
  }

  function saveAdminKey() {
    const key = adminKeyInput.trim()
    if (!key) {
      clearAdminApiKey()
      setAdminKeyInput('')
      setNote('ล้าง ADMIN_API_KEY แล้ว')
      return
    }
    setAdminApiKey(key)
    setAdminKeyInput(key)
    setNote('บันทึก ADMIN_API_KEY สำหรับเครื่องนี้แล้ว')
  }

  function removeAdminKey() {
    clearAdminApiKey()
    setAdminKeyInput('')
    setNote('ล้าง ADMIN_API_KEY แล้ว')
  }

  useEffect(() => {
    loadWallet()
  }, [loadWallet])

  return (
    <main className="missai-shell space-y-5 text-white">
      <section className="missai-card overflow-hidden rounded-2xl">
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:p-6">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-[#ac4bff] uppercase">
              <Coins size={16} />
              กระเป๋าโทเคน
            </p>
            <h1 className="font-display m-0 mt-2 break-words text-3xl font-black tracking-normal text-[#f9c86d]">
              {balanceLabel}
            </h1>
            <p className="m-0 mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#9ca3af]">
              ดูยอดโทเคน การใช้งานล่าสุด ต้นทุนตามโมเดล และประเมินจำนวนรอบแชทที่ยังใช้ได้
            </p>
            {note && (
              <p className="missai-empty m-0 mt-4 border-[#ac4bff]/20 bg-[#ac4bff]/10 p-3 text-sm text-[#d9b3ff]" data-testid="wallet-note">
                {note}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <button
              aria-disabled={isLoading}
              className="missai-button-primary disabled:opacity-50"
              data-testid="wallet-refresh"
              disabled={isLoading}
              onClick={loadWallet}
              title={isLoading ? 'กำลังโหลดกระเป๋าโทเคน' : 'รีเฟรชข้อมูลกระเป๋าโทเคน'}
              type="button"
            >
              <RefreshCw size={16} />
              รีเฟรช
            </button>
            <Link className="missai-button-secondary" to="/profile">
              แก้โปรไฟล์ผู้เล่น
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">ใช้ไปทั้งหมด</p>
          <p className="font-display m-0 mt-2 text-2xl font-black text-white">{totalTokensLabel}</p>
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">จำนวนคำขอ</p>
          <p className="font-display m-0 mt-2 text-2xl font-black text-white">{requestCountLabel}</p>
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">ค่าใช้จ่ายรวม</p>
          <p className="font-display m-0 mt-2 text-2xl font-black text-white">{totalCostLabel}</p>
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 flex items-center gap-2 text-sm font-black text-white/48">
            <Gauge size={16} />
            คาดว่าคุยได้อีก
          </p>
          <p className="font-display m-0 mt-2 text-2xl font-black text-[#f9c86d]">{estimatedRemainingLabel}</p>
          <p className="m-0 mt-1 text-xs font-bold text-white/35">
            เฉลี่ย {summary?.usage.estimate.averageTokensPerRequest.toLocaleString() ?? 0} โทเคน/รอบ
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="missai-card rounded-2xl p-5" data-testid="wallet-cost-by-model">
          <div className="mb-4">
            <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <BarChart3 size={17} className="text-[#ac4bff]" />
              ต้นทุนแยกตามโมเดล
            </p>
            <p className="m-0 mt-1 text-xs font-bold text-white/45">ดูว่าโมเดลไหนใช้โทเคนและต้นทุนมากที่สุด</p>
          </div>

          {isLoading ? (
            <div className="py-5 text-sm font-bold text-white/55">กำลังโหลดสรุปโมเดล...</div>
          ) : !summary || summary.usage.byModel.length === 0 ? (
            <div className="py-5 text-sm font-bold text-white/55">ยังไม่มีข้อมูลต้นทุนแยกตามโมเดล</div>
          ) : (
            <div className="grid gap-2">
              {summary.usage.byModel.map((item) => {
                const tokenShare = summary.usage.totalTokens > 0 ? Math.round((item.tokens / summary.usage.totalTokens) * 100) : 0
                return (
                  <article className="missai-card rounded-xl p-3.5" key={item.modelName ?? 'unknown-model'}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="m-0 min-w-0 truncate text-sm font-black text-white">
                        {item.modelName ?? 'โมเดลไม่ระบุ'}
                      </p>
                      <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-black text-[#f9c86d]">
                        {formatCost(item.cost)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6]" style={{ width: `${Math.max(tokenShare, 4)}%` }} />
                    </div>
                    <p className="m-0 mt-2 text-xs font-bold text-white/45">
                      {item.tokens.toLocaleString()} โทเคน / {item.requestCount.toLocaleString()} คำขอ / {tokenShare}%
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="missai-card rounded-2xl p-5" data-testid="wallet-usage-trend">
          <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
            <TrendingDown size={17} className="text-[#ac4bff]" />
            การใช้ 7 วันล่าสุด
          </p>
          <p className="m-0 mt-1 text-xs font-bold text-white/45">ใช้ดูจังหวะการกินโทเคนเพื่อประเมินงบและโปรโมชัน</p>

          {isLoading ? (
            <div className="py-5 text-sm font-bold text-white/55">กำลังโหลดกราฟการใช้งาน...</div>
          ) : !summary || summary.usage.daily.every((item) => item.tokens === 0) ? (
            <div className="py-5 text-sm font-bold text-white/55">ยังไม่มีการใช้โทเคนใน 7 วันล่าสุด</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {summary.usage.daily.map((item) => {
                const width = Math.max(Math.round((item.tokens / maxDailyTokens) * 100), item.tokens > 0 ? 6 : 0)
                return (
                  <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3" key={item.date}>
                    <span className="text-xs font-black text-white/45">{formatShortDate(item.date)}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-[#ac4bff]" style={{ width: `${width}%` }} />
                    </div>
                    <span className="min-w-[4rem] text-right text-xs font-black text-white/70">{item.tokens.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="missai-card rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <KeyRound size={17} className="text-[#ac4bff]" />
              สิทธิ์ผู้ดูแลสำหรับเครื่องนี้
            </p>
            <p className="m-0 mt-1 text-sm font-bold leading-6 text-white/55">
              ใช้เฉพาะ local/dev เพื่อเรียก endpoint ผู้ดูแล เช่น เพิ่มหรือหักโทเคน คีย์เก็บใน localStorage ของเบราว์เซอร์นี้
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              className="missai-input min-h-11 min-w-0 rounded-xl px-3 text-sm"
              data-testid="wallet-admin-key-input"
              onChange={(event) => setAdminKeyInput(event.target.value)}
              placeholder="วาง ADMIN_API_KEY"
              type="password"
              value={adminKeyInput}
            />
            <button className="missai-button-secondary bg-white text-slate-950 hover:bg-white/90" data-testid="wallet-admin-key-save" onClick={saveAdminKey} type="button">
              บันทึกคีย์
            </button>
            <button className="missai-button-secondary" data-testid="wallet-admin-key-clear" onClick={removeAdminKey} type="button">
              <X size={16} />
              ล้าง
            </button>
          </div>
        </div>
      </section>

      <section className="missai-card rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="m-0 text-sm font-black text-white">ปรับโทเคนโดยผู้ดูแล</p>
            <p className="m-0 mt-1 text-sm font-bold leading-6 text-white/55">
              ใช้ดูแลยอดโทเคนของบัญชีปัจจุบันสำหรับแคมเปญ เครดิตช่วยเหลือ หรือการแก้ไขรายการ
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              className="missai-input min-h-11 min-w-0 rounded-xl px-3 text-sm"
              data-testid="wallet-adjust-amount"
              inputMode="numeric"
              onChange={(event) => setAdjustAmount(event.target.value)}
              value={adjustAmount}
            />
            <button
              aria-disabled={Boolean(adjustTokenDisabledReason)}
              className="missai-button-primary bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-60"
              data-testid="wallet-adjust-add"
              disabled={Boolean(adjustTokenDisabledReason)}
              onClick={() => adjustTokens(normalizedAdjustAmount)}
              title={adjustTokenDisabledReason || 'เพิ่มโทเคนให้ผู้ใช้ปัจจุบัน'}
              type="button"
            >
              เพิ่ม
            </button>
            <button
              aria-disabled={Boolean(adjustTokenDisabledReason)}
              className="missai-button-danger border border-rose-300/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 disabled:opacity-60"
              data-testid="wallet-adjust-debit"
              disabled={Boolean(adjustTokenDisabledReason)}
              onClick={() => adjustTokens(-normalizedAdjustAmount)}
              title={adjustTokenDisabledReason || 'หักโทเคนจากผู้ใช้ปัจจุบัน'}
              type="button"
            >
              หัก
            </button>
          </div>
        </div>
        {!hasAdminKey && (
          <p className="missai-empty m-0 mt-3 border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
            ใส่และบันทึก ADMIN_API_KEY ก่อน จึงจะใช้ปุ่มเพิ่ม/หักโทเคนได้
          </p>
        )}
      </section>

      <section className="missai-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/10 p-4">
          <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
            <ReceiptText size={17} className="text-[#ac4bff]" />
            ประวัติธุรกรรมโทเคน
          </p>
          <p className="m-0 mt-1 text-xs font-bold text-white/45">รายการเพิ่ม/หักยอดที่ตรวจสอบย้อนหลังได้</p>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm font-bold text-white/55">กำลังโหลดธุรกรรม...</div>
        ) : !summary || !summary.wallet?.transactions.length ? (
          <div className="p-5 text-sm font-bold text-white/55">ยังไม่มีธุรกรรมโทเคน</div>
        ) : (
          <div className="divide-y divide-white/10">
            {summary.wallet.transactions.map((item) => (
              <article className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-black text-white">{transactionLabel(item.type)}</p>
                  <p className="m-0 mt-1 truncate text-xs font-bold text-white/45">
                    {formatDate(item.createdAt)} / คงเหลือ {item.balanceAfter.toLocaleString()} โทเคน
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${
                    item.amount >= 0
                      ? 'border border-emerald-300/25 bg-emerald-400/12 text-emerald-100'
                      : 'border border-rose-300/25 bg-rose-400/12 text-rose-100'
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

      <section className="missai-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/10 p-4">
          <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
            <ReceiptText size={17} className="text-[#ac4bff]" />
            การใช้งานล่าสุด
          </p>
          <p className="m-0 mt-1 text-xs font-bold text-white/45">รายการใช้ AI ล่าสุดที่ระบบบันทึกไว้</p>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm font-bold text-white/55">กำลังโหลดการใช้งาน...</div>
        ) : !summary || summary.usage.recent.length === 0 ? (
          <div className="p-5 text-sm font-bold text-white/55">ยังไม่มีการใช้โทเคน</div>
        ) : (
          <div className="divide-y divide-white/10">
            {summary.usage.recent.map((item) => (
              <article className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-black text-white">{item.modelName ?? 'โมเดลไม่ระบุ'}</p>
                  <p className="m-0 mt-1 text-xs font-bold text-white/45">{formatDate(item.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/25 bg-rose-400/12 px-2.5 py-1 text-xs font-black text-rose-100">
                    <TrendingDown size={14} />
                    {item.tokens.toLocaleString()} โทเคน
                  </span>
                  <span className="missai-badge text-white/65">{formatCost(item.cost)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
