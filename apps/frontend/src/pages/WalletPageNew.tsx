import { useCallback, useEffect, useState } from 'react'
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Award,
  Calendar,
  Zap,
  Gift,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  fetchUsageSummary,
  logUnexpectedError,
  type UsageSummary,
} from '../lib/api'
import { useAppDispatch } from '../store/hooks'
import { setTokenBalance } from '../store/slices/walletSlice'
import { LoadingSkeleton, LoadingSpinner } from '../components/LoadingSkeleton'
import { AchievementBadges, mockAchievements } from '../components/AchievementBadges'
import { DailyLoginButton } from '../components/DailyLoginButton'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    CHAT_USAGE: 'ใช้แชท AI',
    ADMIN_ADJUSTMENT: 'ผู้ดูแลปรับยอด',
    PROMOTION: 'โปรโมชัน',
    PURCHASE: 'เติมโทเคน',
    REFUND: 'คืนโทเคน',
    DAILY_LOGIN: 'เข้าสู่ระบบประจำวัน',
    ACHIEVEMENT: 'รางวัลความสำเร็จ',
    PENALTY: 'หักโทเคน',
    EXPIRY: 'โทเคนหมดอายุ',
  }
  return labels[type] || type
}

function transactionIcon(type: string) {
  switch (type) {
    case 'DAILY_LOGIN':
      return <Calendar className="h-5 w-5 text-blue-400" />
    case 'ACHIEVEMENT':
      return <Award className="h-5 w-5 text-yellow-400" />
    case 'CHAT_USAGE':
      return <Zap className="h-5 w-5 text-purple-400" />
    case 'PROMOTION':
    case 'PURCHASE':
      return <Gift className="h-5 w-5 text-green-400" />
    case 'PENALTY':
    case 'EXPIRY':
      return <AlertCircle className="h-5 w-5 text-red-400" />
    default:
      return <Coins className="h-5 w-5 text-slate-400" />
  }
}

export function WalletPageNew() {
  const dispatch = useAppDispatch()
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWallet = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchUsageSummary()
      setSummary(data)
      dispatch(setTokenBalance(data.user.tokenBalance))
    } catch (err) {
      logUnexpectedError('โหลดกระเป๋าโทเคนไม่สำเร็จ:', err)
      setError('โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setIsLoading(false)
    }
  }, [dispatch])

  useEffect(() => {
    loadWallet()
  }, [loadWallet])

  // Calculate statistics
  const stats = {
    balance: summary?.user.tokenBalance || 0,
    totalSpent: summary?.wallet?.transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0,
    totalEarned: summary?.wallet?.transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0) || 0,
    transactionCount: summary?.wallet?.transactions.length || 0,
  }

  // Mock daily login streak (TODO: integrate with real data)
  const loginStreak = 7

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="mx-auto max-w-6xl">
          <LoadingSpinner size="lg" message="กำลังโหลดข้อมูล..." />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <p className="mt-4 text-red-300">{error}</p>
            <button
              type="button"
              onClick={loadWallet}
              className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-red-300 hover:bg-red-500/30"
            >
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">กระเป๋าโทเคน</h1>
            <p className="mt-1 text-slate-400">จัดการและติดตามการใช้งานโทเคนของคุณ</p>
          </div>
          <div className="flex items-center gap-3">
            <DailyLoginButton onClaim={loadWallet} />
            <button
              type="button"
              onClick={loadWallet}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-4 py-2 text-slate-300 transition-all hover:bg-slate-700/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Balance */}
          <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">ยอดคงเหลือ</p>
                <p className="mt-2 text-3xl font-bold text-white">{stats.balance.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-300">โทเคน</p>
              </div>
              <div className="rounded-full bg-purple-500/20 p-3">
                <Coins className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Earned */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">รับทั้งหมด</p>
                <p className="mt-2 text-2xl font-bold text-green-400">+{stats.totalEarned.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-400">โทเคน</p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <ArrowUpRight className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Spent */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">ใช้ทั้งหมด</p>
                <p className="mt-2 text-2xl font-bold text-red-400">-{stats.totalSpent.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-400">โทเคน</p>
              </div>
              <div className="rounded-full bg-red-500/10 p-3">
                <ArrowDownRight className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>

          {/* Login Streak */}
          <div className="rounded-xl bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Streak</p>
                <p className="mt-2 text-3xl font-bold text-yellow-400">{loginStreak}</p>
                <p className="mt-1 text-xs text-slate-300">วันติดต่อกัน 🔥</p>
              </div>
              <div className="rounded-full bg-yellow-500/20 p-3">
                <Calendar className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
          <AchievementBadges achievements={mockAchievements} />
        </div>

        {/* Transaction History */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">ประวัติการทำรายการ</h2>

          {!summary?.wallet?.transactions || summary.wallet.transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Coins className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">ยังไม่มีประวัติการทำรายการ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.wallet.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg bg-slate-700/30 p-4 transition-colors hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-slate-800/50 p-2">
                      {transactionIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">{transactionLabel(tx.type)}</p>
                      <p className="text-sm text-slate-400">{formatDate(tx.createdAt)}</p>
                      {tx.reason && (
                        <p className="text-xs text-slate-500 mt-0.5">{tx.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      ยอดคงเหลือ: {tx.balanceAfter.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
