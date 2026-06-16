import { useState } from 'react'
import { Trophy, Star, MessageSquare, Users, Sparkles, UserCheck } from 'lucide-react'

interface Creator {
  rank: number
  name: string
  avatarLetter: string
  badge: 'platinum' | 'gold' | 'silver' | 'bronze'
  badgeLabel: string
  creationsCount: number
  totalChats: string
  popularCharacter: string
  popularTag: string
}

const mockCreators: Creator[] = [
  {
    rank: 1,
    name: 'มิตซึไอเลิฟเวอร์',
    avatarLetter: 'ม',
    badge: 'platinum',
    badgeLabel: 'นักเขียนสัญญาพันธมิตร',
    creationsCount: 24,
    totalChats: '1.2m',
    popularCharacter: 'คุณหนูริน (Tsundere)',
    popularTag: 'โรแมนติก'
  },
  {
    rank: 2,
    name: 'สไลม์นักโรลเพลย์',
    avatarLetter: 'ส',
    badge: 'gold',
    badgeLabel: 'นักเขียนเหรียญทอง',
    creationsCount: 18,
    totalChats: '840k',
    popularCharacter: 'อาจารย์เซน (Mentor)',
    popularTag: 'ฝึกตน/กำลังภายใน'
  },
  {
    rank: 3,
    name: 'คุณหมอสายแฟนตาซี',
    avatarLetter: 'ค',
    badge: 'silver',
    badgeLabel: 'ผู้เชี่ยวชาญเนื้อหา',
    creationsCount: 15,
    totalChats: '520k',
    popularCharacter: 'เอลฟ์อาเรีย (Magic Companion)',
    popularTag: 'แฟนตาซี'
  },
  {
    rank: 4,
    name: 'แมวส้มขี้เล่น',
    avatarLetter: 'ม',
    badge: 'bronze',
    badgeLabel: 'นักสร้างหน้าใหม่ไฟแรง',
    creationsCount: 9,
    totalChats: '290k',
    popularCharacter: 'เนโกะจัง (Playful Neko)',
    popularTag: 'ค่อยๆ สนิท'
  },
  {
    rank: 5,
    name: 'ผู้พิทักษ์บอร์ดแชท',
    avatarLetter: 'ผ',
    badge: 'bronze',
    badgeLabel: 'นักเขียนบทระดับทั่วไป',
    creationsCount: 12,
    totalChats: '180k',
    popularCharacter: 'ร้อยตำรวจเอก สมศักดิ์ (Rival)',
    popularTag: 'สืบสวน'
  }
]

export function CreatorsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'weekly' | 'alltime'>('all')

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-br from-[#f9c86d] to-[#f99c00] text-[#1a1206] font-black missai-glow'
      case 2: return 'bg-slate-300 text-slate-950 font-black'
      case 3: return 'bg-gradient-to-br from-[#d97706] to-[#b45309] text-white font-black'
      default: return 'border border-white/10 bg-white/5 text-slate-300 font-black'
    }
  }

  const getCreatorBadgeClass = (badge: Creator['badge']) => {
    switch (badge) {
      case 'platinum': return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
      case 'gold': return 'border-[#f9c86d]/30 bg-[#f9c86d]/10 text-[#f9c86d]'
      case 'silver': return 'border-slate-300/30 bg-slate-300/10 text-slate-300'
      case 'bronze': return 'border-purple-400/30 bg-purple-400/10 text-purple-300'
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header Banner */}
      <section className="missai-card flex flex-col gap-3 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-bold text-[#d8b4fe]">
          <Trophy size={16} className="text-[#f9c86d]" />
          <span className="font-black">อันดับผู้สร้าง</span>
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-2.5 py-0.5 text-[10px] text-yellow-400">
            ซีซั่นล่าสุด
          </span>
        </div>
        <h1 className="font-display m-0 text-2xl font-black text-white sm:text-3xl">ทำเนียบนักสร้างยอดนิยม</h1>
        <p className="m-0 text-sm font-semibold leading-6 text-[#9ca3af]">
          ทำความรู้จักและติดตามผู้สร้างสรรค์การ์ดตัวละครโรลเพลย์ที่มียอดความนิยมสูงสุดในระบบ Maprang AI
        </p>
      </section>

      {/* Tabs / Period Filters */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`min-h-9 px-4 rounded-full text-xs font-black transition border ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] border-[#ac4bff]/50 text-white missai-glow'
              : 'border-white/10 bg-[#080a1a]/60 text-slate-400 hover:border-[#ac4bff]/40 hover:text-white'
          }`}
        >
          ความนิยมสะสม
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`min-h-9 px-4 rounded-full text-xs font-black transition border ${
            activeTab === 'weekly'
              ? 'bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] border-[#ac4bff]/50 text-white missai-glow'
              : 'border-white/10 bg-[#080a1a]/60 text-slate-400 hover:border-[#ac4bff]/40 hover:text-white'
          }`}
        >
          มาแรงประจำสัปดาห์
        </button>
      </div>

      {/* Leaderboard Table / Grid */}
      <div className="grid gap-4 md:grid-cols-1">
        {mockCreators.map((creator) => (
          <div
            key={creator.rank}
            className="missai-card flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[#ac4bff]/50 hover:shadow-[0_8px_26px_rgba(172,75,255,0.15)]"
          >
            {/* Rank, Profile, Badge */}
            <div className="flex items-center gap-4">
              <span className={`grid size-9 place-items-center rounded-xl text-sm font-black shadow-inner ${getRankBadgeColor(creator.rank)}`}>
                {creator.rank}
              </span>
              <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-lg font-black text-white missai-glow">
                {creator.avatarLetter}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="m-0 text-base font-black text-white">{creator.name}</h3>
                  {creator.rank <= 3 && <Sparkles className="size-4 text-yellow-400 animate-pulse" />}
                </div>
                <span className={`mt-1 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${getCreatorBadgeClass(creator.badge)}`}>
                  <UserCheck size={10} />
                  {creator.badgeLabel}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-4 md:border-t-0 md:pt-0">
              <div className="text-center md:text-left">
                <span className="flex items-center justify-center md:justify-start gap-1 text-[11px] font-bold text-slate-500">
                  <Star size={12} />
                  ตัวละคร
                </span>
                <span className="mt-1 block text-base font-black text-white">{creator.creationsCount} ตัว</span>
              </div>
              <div className="text-center md:text-left">
                <span className="flex items-center justify-center md:justify-start gap-1 text-[11px] font-bold text-slate-500">
                  <MessageSquare size={12} />
                  ยอดการคุย
                </span>
                <span className="mt-1 block text-base font-black text-white">{creator.totalChats}</span>
              </div>
              <div className="text-center md:text-left">
                <span className="flex items-center justify-center md:justify-start gap-1 text-[11px] font-bold text-slate-500">
                  <Users size={12} />
                  ผลงานเด่น
                </span>
                <span className="mt-1 block truncate text-xs font-black text-[#d8b4fe] max-w-[120px] md:max-w-none">
                  {creator.popularCharacter}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
