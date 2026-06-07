import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Settings, LogOut, Mail, Shield, Clock, Edit2, Camera } from 'lucide-react'
import { useAppSelector } from '../store/hooks'
import { selectTokenBalance } from '../store/slices/walletSlice'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function ProfilePage() {
  const navigate = useNavigate()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState({
    name: 'ผู้ใช้งาน',
    email: 'user@example.com',
    avatarUrl: null,
    joinedAt: new Date().toISOString(),
    isAdult: false,
    maxRating: 'general' as const,
  })

  useEffect(() => {
    // Simulate loading user data
    setTimeout(() => setIsLoading(false), 500)
  }, [])

  const formatJoinDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="mx-auto max-w-4xl">
          <LoadingSkeleton variant="card" count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-6">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">โปรไฟล์</h1>
          <p className="mt-2 text-slate-400">จัดการข้อมูลและการตั้งค่าของคุณ</p>
        </div>

        {/* Profile Card */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-800/30 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Avatar */}
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-purple-600/30"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 ring-4 ring-purple-600/30">
                  <User className="h-12 w-12 text-white" />
                </div>
              )}
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-purple-600 p-2 text-white transition hover:bg-purple-500"
                title="เปลี่ยนรูปโปรไฟล์"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <p className="mt-1 text-slate-400">{user.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  เข้าร่วมเมื่อ {formatJoinDate(user.joinedAt)}
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
            >
              <Edit2 className="h-4 w-4" />
              แก้ไข
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{tokenBalance.toLocaleString()}</div>
            <div className="mt-1 text-sm text-slate-400">โทเคนคงเหลือ</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">0</div>
            <div className="mt-1 text-sm text-slate-400">ตัวละครที่สร้าง</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-center">
            <div className="text-3xl font-bold text-green-400">0</div>
            <div className="mt-1 text-sm text-slate-400">การสนทนาทั้งหมด</div>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">การตั้งค่า</h3>

          {/* Account Settings */}
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-left transition hover:border-purple-500/50 hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-600/20 p-2">
                <User className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">ข้อมูลบัญชี</div>
                <div className="text-sm text-slate-400">แก้ไขชื่อ อีเมล และรหัสผ่าน</div>
              </div>
            </div>
          </button>

          {/* Content Settings */}
          <button
            type="button"
            onClick={() => navigate('/settings/content')}
            className="w-full rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-left transition hover:border-purple-500/50 hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-600/20 p-2">
                <Shield className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">การตั้งค่าเนื้อหา</div>
                <div className="text-sm text-slate-400">
                  {user.isAdult ? 'ผู้ใหญ่ (18+)' : 'ทั่วไป'} · ระดับ {user.maxRating}
                </div>
              </div>
            </div>
          </button>

          {/* Privacy Settings */}
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-left transition hover:border-purple-500/50 hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600/20 p-2">
                <Settings className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">ความเป็นส่วนตัว</div>
                <div className="text-sm text-slate-400">จัดการการมองเห็นและข้อมูลส่วนตัว</div>
              </div>
            </div>
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="w-full rounded-xl border border-slate-800 bg-slate-800/30 p-4 text-left transition hover:border-purple-500/50 hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-600/20 p-2">
                <Mail className="h-5 w-5 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">การแจ้งเตือน</div>
                <div className="text-sm text-slate-400">อีเมล, Push notifications</div>
              </div>
            </div>
          </button>

          {/* Logout */}
          <button
            type="button"
            className="w-full rounded-xl border border-red-800/50 bg-red-900/20 p-4 text-left transition hover:border-red-500/50 hover:bg-red-900/30"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-600/20 p-2">
                <LogOut className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-red-300">ออกจากระบบ</div>
                <div className="text-sm text-red-400/70">ล็อกเอาท์จากบัญชีนี้</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
