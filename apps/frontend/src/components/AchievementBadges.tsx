import { Award, Star, TrendingUp, MessageCircle, Calendar, Heart, Zap } from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  earned: boolean
  earnedAt?: Date
  progress?: number
  total?: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface AchievementBadgesProps {
  achievements: Achievement[]
}

const rarityColors = {
  common: 'from-slate-600 to-slate-500 border-slate-500/50',
  rare: 'from-blue-600 to-blue-500 border-blue-500/50',
  epic: 'from-purple-600 to-purple-500 border-purple-500/50',
  legendary: 'from-yellow-600 to-orange-500 border-yellow-500/50',
}

const rarityGlow = {
  common: 'shadow-slate-500/20',
  rare: 'shadow-blue-500/30',
  epic: 'shadow-purple-500/40',
  legendary: 'shadow-yellow-500/50',
}

export function AchievementBadges({ achievements }: AchievementBadgesProps) {
  const earnedCount = achievements.filter(a => a.earned).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">ความสำเร็จ</h2>
          <p className="text-sm text-slate-400">
            ปลดล็อกแล้ว {earnedCount} / {achievements.length}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-yellow-400">{earnedCount}</div>
          <div className="text-xs text-slate-400">รางวัล</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-full bg-slate-700/50 p-1">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${(earnedCount / achievements.length) * 100}%` }}
        />
      </div>

      {/* Achievement Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`
              group relative overflow-hidden rounded-xl border p-6 transition-all
              ${
                achievement.earned
                  ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} ${rarityGlow[achievement.rarity]} shadow-lg hover:scale-105`
                  : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
              }
            `}
          >
            {/* Icon */}
            <div
              className={`
                mb-4 inline-flex rounded-full p-3
                ${achievement.earned ? 'bg-white/10' : 'bg-slate-700/50'}
              `}
            >
              {achievement.icon}
            </div>

            {/* Title & Description */}
            <h3 className={`font-semibold ${achievement.earned ? 'text-white' : 'text-slate-400'}`}>
              {achievement.title}
            </h3>
            <p className={`mt-1 text-sm ${achievement.earned ? 'text-slate-200' : 'text-slate-500'}`}>
              {achievement.description}
            </p>

            {/* Progress */}
            {!achievement.earned && achievement.progress !== undefined && achievement.total !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>ความคืบหน้า</span>
                  <span>{achievement.progress} / {achievement.total}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Earned Badge */}
            {achievement.earned && (
              <div className="absolute right-3 top-3">
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-semibold text-white">
                  <Star className="h-3 w-3" fill="currentColor" />
                  ปลดล็อก
                </div>
              </div>
            )}

            {/* Rarity Badge */}
            {achievement.earned && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-1 text-xs font-semibold text-white">
                {achievement.rarity === 'legendary' && '✨'}
                {achievement.rarity === 'epic' && '💎'}
                {achievement.rarity === 'rare' && '⭐'}
                {achievement.rarity === 'common' && '🏅'}
                <span className="capitalize">{achievement.rarity}</span>
              </div>
            )}

            {/* Locked Overlay */}
            {!achievement.earned && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="rounded-full bg-slate-800 p-3">
                  <span className="text-2xl">🔒</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Mock achievements data
export const mockAchievements: Achievement[] = [
  {
    id: '1',
    title: 'เริ่มต้นการเดินทาง',
    description: 'สร้างการสนทนาครั้งแรก',
    icon: <MessageCircle className="h-6 w-6 text-blue-400" />,
    earned: true,
    earnedAt: new Date(),
    rarity: 'common',
  },
  {
    id: '2',
    title: 'นักสนทนาตัวยง',
    description: 'ส่งข้อความครบ 100 ครั้ง',
    icon: <TrendingUp className="h-6 w-6 text-green-400" />,
    earned: true,
    earnedAt: new Date(),
    rarity: 'rare',
  },
  {
    id: '3',
    title: 'Streak Master',
    description: 'เข้าสู่ระบบติดต่อกัน 7 วัน',
    icon: <Calendar className="h-6 w-6 text-yellow-400" />,
    earned: true,
    earnedAt: new Date(),
    rarity: 'epic',
  },
  {
    id: '4',
    title: 'ตำนานแห่งการสนทนา',
    description: 'ส่งข้อความครบ 1,000 ครั้ง',
    icon: <Award className="h-6 w-6 text-purple-400" />,
    earned: false,
    progress: 487,
    total: 1000,
    rarity: 'legendary',
  },
  {
    id: '5',
    title: 'ผู้สะสมตัวละคร',
    description: 'สร้างตัวละครครบ 5 ตัว',
    icon: <Star className="h-6 w-6 text-pink-400" />,
    earned: false,
    progress: 2,
    total: 5,
    rarity: 'rare',
  },
  {
    id: '6',
    title: 'นักรักความสัมพันธ์',
    description: 'พัฒนาความสัมพันธ์ถึงระดับ Partner',
    icon: <Heart className="h-6 w-6 text-red-400" />,
    earned: false,
    progress: 0,
    total: 1,
    rarity: 'epic',
  },
]
