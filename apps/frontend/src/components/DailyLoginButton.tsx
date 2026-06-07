import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Gift, Zap, AlertCircle, Coins } from 'lucide-react'
import { logUnexpectedError, readApiJson } from '../lib/api'
import { toast } from './Toast'

interface DailyLoginButtonProps {
  onClaim?: () => void
}

export function DailyLoginButton({ onClaim }: DailyLoginButtonProps) {
  const [claiming, setClaiming] = useState(false)

  const handleClaim = async () => {
    setClaiming(true)

    try {
      const response = await fetch('/api/user/me/daily-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await readApiJson(response)

      if (data.rewarded) {
        toast.success(data.message, 5000)
        onClaim?.()
      } else {
        toast.info(data.message, 3000)
      }
    } catch (error) {
      logUnexpectedError('Failed to claim daily login:', error)
      toast.error('ไม่สามารถรับรางวัลได้ กรุณาลองอีกครั้ง')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClaim}
      disabled={claiming}
      title={claiming ? 'กำลังรับรางวัล...' : 'คลิกเพื่อรับรางวัลประจำวัน'}
      className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:shadow-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="relative flex items-center gap-2">
        {claiming ? (
          <>
            <Zap className="h-5 w-5 animate-spin" />
            <span>กำลังรับรางวัล...</span>
          </>
        ) : (
          <>
            <Gift className="h-5 w-5" />
            <span>รับรางวัลประจำวัน</span>
            <Calendar className="h-5 w-5" />
          </>
        )}
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform group-hover:translate-x-[100%] duration-1000" />
    </button>
  )
}

interface TokenWarningProps {
  required: number
  current: number
}

export function TokenWarning({ required, current }: TokenWarningProps) {
  const navigate = useNavigate()
  const shortage = required - current

  if (current >= required) return null

  return (
    <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-500/20 p-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-red-300">โทเคนไม่เพียงพอ</h4>
          <p className="mt-1 text-sm text-red-200">
            คุณต้องการโทเคนอีก <span className="font-bold">{shortage.toLocaleString()}</span> เพื่อดำเนินการต่อ
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-full bg-red-900/30">
              <div
                className="h-2 rounded-full bg-red-500 transition-all"
                style={{ width: `${Math.min((current / required) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-red-300">
              {current.toLocaleString()} / {required.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/wallet')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-red-300 hover:text-red-200"
          >
            <Coins className="h-4 w-4" />
            ไปเติมโทเคน →
          </button>
        </div>
      </div>
    </div>
  )
}
