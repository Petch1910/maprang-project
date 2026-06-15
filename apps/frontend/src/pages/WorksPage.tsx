import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Folder, Plus, MessageSquare, Eye, Edit, CheckCircle, EyeOff } from 'lucide-react'
import { fetchCharacters, type Character } from '../lib/api'

export function WorksPage() {
  const [works, setWorks] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadWorks() {
      setIsLoading(true)
      try {
        const data = await fetchCharacters({ view: 'admin' })
        setWorks(data.characters ?? [])
      } catch {
        setError('โหลดข้อมูลผลงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setIsLoading(false)
      }
    }
    void loadWorks()
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header Banner */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#2e2e44] bg-[#1e1e34]/90 p-6 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#d8b4fe]">
            <Folder size={16} className="text-blue-400" />
            <span>ผลงานของฉัน</span>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-[10px] text-blue-300">
              {works.length} ตัวละคร
            </span>
          </div>
          <Link
            to="/create"
            className="flex min-h-9 items-center gap-1.5 rounded-lg bg-[#a855f7] px-4 text-xs font-bold text-white transition hover:bg-[#a855f7]/95 shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
          >
            <Plus size={14} />
            <span>สร้างใหม่</span>
          </Link>
        </div>
        <h1 className="m-0 text-2xl font-black text-white sm:text-3xl">ผลงานสร้างสรรค์ของฉัน</h1>
        <p className="m-0 text-sm font-semibold leading-6 text-[#9ca3af]">
          จัดการ ดูแล และตรวจสอบประสิทธิภาพสถิติของตัวละครที่คุณเป็นผู้สร้างสรรค์ขึ้นมา
        </p>
      </section>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="h-[140px] animate-pulse rounded-2xl bg-[#1e1e34] border border-[#2e2e44]" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">
          {error}
        </div>
      ) : works.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((character) => (
            <div
              key={character.id}
              className="flex gap-4 rounded-2xl border border-[#2e2e44] bg-[#1e1e34]/70 p-4 transition duration-300 hover:bg-[#1e1e34] hover:border-slate-500"
            >
              {/* Left Column: Avatar */}
              <div className="relative size-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#080A1A]">
                {character.avatarUrl ? (
                  <img alt={character.name} className="h-full w-full object-cover" src={character.avatarUrl} />
                ) : (
                  <div className="grid h-full place-items-center bg-gradient-to-br from-[#1e1e34] via-[#080a1a] to-[#2e2e44] text-2xl font-black text-slate-500">
                    {character.name.slice(0, 1)}
                  </div>
                )}
              </div>

              {/* Right Column: Name & Details */}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="m-0 truncate text-sm font-black text-white">{character.name}</h3>
                    {character.visibility === 'PUBLIC' ? (
                      <span className="flex items-center gap-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                        <CheckCircle size={10} /> สาธารณะ
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 rounded bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                        <EyeOff size={10} /> ส่วนตัว
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#9ca3af]">
                    {character.description || character.greeting || 'ตัวละครยังไม่มีคำอธิบายย่อ'}
                  </p>
                </div>

                {/* Stats Row */}
                <div className="mt-3 flex items-center justify-between border-t border-[#2e2e44]/40 pt-2 text-[10px] font-semibold text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} />
                      {character.chatCount || 0} แชท
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={11} />
                      {character.viewCount || 0} วิว
                    </span>
                  </div>
                  <Link
                    to={`/characters/${character.id}`}
                    className="flex items-center gap-1 font-bold text-[#d8b4fe] hover:text-white transition"
                  >
                    <Edit size={10} />
                    <span>จัดการ</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2e2e44] bg-[#1e1e34]/30 py-20 text-center text-slate-500">
          <Folder size={48} className="mb-4 text-blue-400/30" />
          <h3 className="m-0 text-base font-black text-white">ยังไม่มีผลงานที่สร้าง</h3>
          <p className="m-0 mt-2 text-sm text-[#9ca3af]">
            คุณยังไม่ได้สร้างตัวละครใดๆ เริ่มสร้างตัวละครตัวแรกของคุณบนแพลตฟอร์ม Maprang AI ได้เลย!
          </p>
          <Link
            to="/create"
            className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#a855f7] px-6 text-sm font-black text-white transition hover:bg-[#a855f7]/90 shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
          >
            <Plus size={15} />
            สร้างตัวละครตัวแรก
          </Link>
        </div>
      )}
    </main>
  )
}
