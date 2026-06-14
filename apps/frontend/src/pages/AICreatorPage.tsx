import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  WandSparkles,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  BookOpen,
} from 'lucide-react'
import { generateCreatorAiDraft, updateCreatorDraft, logUnexpectedError, ApiError, type CreatorAiDraftResponse } from '../lib/api'
import { safeGetStorageItem, safeSetStorageItem } from '../lib/safeStorage'

interface GeneratedItem {
  id: string
  url: string
  prompt: string
  brief: string
  style: string
  timestamp: number
  response: CreatorAiDraftResponse
}

const STYLE_PRESETS = [
  { value: 'realistic', label: 'ภาพบุคคลสมจริง (Realistic Portrait)' },
  { value: 'anime', label: 'การ์ตูนญี่ปุ่น (Japanese Anime)' },
  { value: '3d_render', label: 'สามมิติระดับพรีเมียม (3D Render)' },
  { value: 'cyberpunk', label: 'ไซเบอร์พังก์เรืองแสง (Cyberpunk Concept)' },
  { value: 'oil_painting', label: 'จิตรกรรมสีน้ำมัน (Oil Painting Style)' },
]

export function AICreatorPage() {
  const [brief, setBrief] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState('realistic')
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [lastResult, setLastResult] = useState<CreatorAiDraftResponse | null>(null)

  // History stored in LocalStorage
  const [history, setHistory] = useState<GeneratedItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = safeGetStorageItem(window.localStorage, 'maprang:creator-image-history')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Bounded Window Pagination settings
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 12

  const saveHistory = (newHistory: GeneratedItem[]) => {
    setHistory(newHistory)
    if (typeof window !== 'undefined') {
      safeSetStorageItem(window.localStorage, 'maprang:creator-image-history', JSON.stringify(newHistory))
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brief.trim() && !imagePrompt.trim()) return

    setIsGenerating(true)
    setStatusMessage('กำลังวิเคราะห์โครงร่างคำสั่งและติดต่อผู้ให้บริการประมวลผล...')
    setLastResult(null)

    try {
      const res = await generateCreatorAiDraft({
        brief: brief.trim(),
        imagePrompt: imagePrompt.trim(),
        imageStyle,
        imageOnly: false,
      })

      setLastResult(res)

      // Save item to history
      const newItem: GeneratedItem = {
        id: crypto.randomUUID(),
        url: res.image.url,
        prompt: res.image.prompt || imagePrompt || brief,
        brief: brief,
        style: imageStyle,
        timestamp: Date.now(),
        response: res,
      }

      saveHistory([newItem, ...history])
      setCurrentPage(1) // Reset to first page to see the new item
      setStatusMessage('ระบบวิเคราะห์ประมวลผลร่างตัวละครและรูปเสร็จสิ้น')
    } catch (err) {
      logUnexpectedError('ประมวลผลข้อมูลโครงร่างตัวละครไม่สำเร็จ', err)
      if (err instanceof ApiError) {
        setStatusMessage(err.message)
      } else {
        setStatusMessage('ระบบประมวลผลขัดข้องชั่วคราว กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToStudio = async (response: CreatorAiDraftResponse) => {
    try {
      setStatusMessage('กำลังเชื่อมระบบและบันทึกประมวลผลเข้าสู่ห้องทำงานสตูดิโอ...')
      // Save draft to creator backend
      await updateCreatorDraft(response.draft)
      setStatusMessage('บันทึกภาพร่างระบบเข้าสู่ห้องทำงานสร้างตัวละครสำเร็จแล้ว')
    } catch (err) {
      logUnexpectedError('บันทึกโครงร่างเข้าสู่ห้องทำงานสตูดิโอไม่สำเร็จ', err)
      setStatusMessage('ไม่สามารถบันทึกข้อมูลโครงร่างสำเร็จ')
    }
  }

  const handleSelectFromHistory = (item: GeneratedItem) => {
    setLastResult(item.response)
    setBrief(item.brief)
    setImagePrompt(item.prompt)
    setImageStyle(item.style)
  }

  const clearHistory = () => {
    saveHistory([])
    setCurrentPage(1)
    setLastResult(null)
  }

  // Calculate paginated window items (Strict Bounded Gallery)
  const totalPages = Math.ceil(history.length / PAGE_SIZE) || 1
  const paginatedHistory = history.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-white min-h-screen">
      {/* Back button and title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/create"
          className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={16} />
          กลับสู่ระบบสตูดิโอ
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 flex items-center gap-2 justify-end">
            🎨 หน้าจอออกแบบภาพร่างระบบประมวลผลผ่านสิทธิ์ผู้ให้บริการคีย์ตรง
          </h1>
          <p className="text-xs font-bold text-white/45">
            ระบบจัดรูปทรงตัวละครอัจฉริยะ (System Draft Image Engine via Direct Key Provider)
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Generator Controls */}
        <section className="lg:col-span-5 space-y-5">
          <form onSubmit={handleGenerate} className="rounded-lg maprang-glass p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <WandSparkles size={18} className="text-purple-400" />
              กำหนดข้อมูลโครงร่างภาพถ่ายและบุคลิก
            </h2>

            <div className="space-y-1">
              <label className="block text-xs font-black text-white/70">
                ประวัติความหลังและข้อความจำเพาะตัวละคร
              </label>
              <textarea
                rows={3}
                placeholder="เช่น: นักดาบสาวจากยุคโบราณผู้พิทักษ์ประตูเวลา..."
                className="block w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm font-bold text-white placeholder-white/30 outline-none focus:border-purple-500"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                disabled={isGenerating}
                title="ประวัติความหลังและข้อความจำเพาะตัวละคร"
                aria-label="ประวัติความหลังและข้อความจำเพาะตัวละคร"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black text-white/70">
                รายละเอียดภาพร่างที่ต้องการ (Image Prompt)
              </label>
              <textarea
                rows={3}
                placeholder="เช่น: close up portrait of an elegant swordswoman, high details, cyber fantasy style..."
                className="block w-full rounded-lg border border-white/10 bg-black/40 p-3 text-sm font-bold text-white placeholder-white/30 outline-none focus:border-purple-500"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                disabled={isGenerating}
                title="รายละเอียดภาพร่างที่ต้องการ"
                aria-label="รายละเอียดภาพร่างที่ต้องการ"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-black text-white/70">
                รูปแบบโทนสีและดีไซน์ (Image Style)
              </label>
              <select
                className="block w-full rounded-lg border border-white/10 bg-black/40 p-2.5 text-sm font-bold text-white outline-none focus:border-purple-500"
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                disabled={isGenerating}
                title="รูปแบบโทนสีและดีไซน์"
                aria-label="รูปแบบโทนสีและดีไซน์"
              >
                {STYLE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full min-h-11 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 px-4 text-sm font-black text-white transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-950/20"
              disabled={isGenerating || (!brief.trim() && !imagePrompt.trim())}
              title="ประมวลผลข้อมูลโครงร่างตัวละคร"
              aria-label="ประมวลผลข้อมูลโครงร่างตัวละคร"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  กำลังประมวลผลภาพร่าง...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  ประมวลผลข้อมูลโครงร่างตัวละคร
                </>
              )}
            </button>

            {statusMessage && (
              <p className="text-xs font-bold text-purple-300 bg-purple-950/30 border border-purple-500/20 p-2.5 rounded-lg">
                ℹ️ {statusMessage}
              </p>
            )}
          </form>
        </section>

        {/* Right column: Main Preview Surface */}
        <section className="lg:col-span-7">
          {lastResult ? (
            <div className="rounded-lg maprang-glass p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  ผลลัพธ์ภาพร่างและบุคลิกตัวละคร
                </h2>
                <button
                  type="button"
                  onClick={() => handleSaveToStudio(lastResult)}
                  className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/30 transition flex items-center gap-1.5"
                >
                  <BookOpen size={13} />
                  บันทึกโครงร่างลงระบบสตูดิโอ
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-12">
                {/* Image Avatar Panel */}
                <div className="sm:col-span-5 space-y-3">
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 relative shadow-inner">
                    {lastResult.image.url ? (
                      <img
                        src={lastResult.image.url}
                        alt={lastResult.draft.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center text-white/35 text-xs p-4 text-center">
                        <ImageIcon size={42} className="mb-2 text-white/20" />
                        ภาพร่างระบบสำรองการเชื่อมต่อ
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-[11px] font-bold text-white/55 space-y-1">
                    <p>⚡ ผู้ให้บริการภาพ: {lastResult.image.provider === 'configured' ? 'ระบบหลักภาพถ่ายจริง' : 'โครงร่างภาพร่างระบบสำรอง'}</p>
                    <p className="line-clamp-2">📝 คำอธิบาย: {lastResult.image.prompt}</p>
                  </div>
                </div>

                {/* Info and Prompt parameters */}
                <div className="sm:col-span-7 space-y-4 max-h-[35rem] overflow-y-auto pr-1">
                  <div>
                    <span className="text-[10px] font-black text-white/45 tracking-wider uppercase">ชื่อตัวละคร</span>
                    <p className="text-xl font-black text-white">{lastResult.draft.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/45 tracking-wider uppercase">คำโปรยเด่น</span>
                    <p className="text-sm font-bold text-purple-300">{lastResult.draft.tagline}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/45 tracking-wider uppercase">คำอธิบายภาพรวม</span>
                    <p className="text-xs font-bold leading-5 text-white/70">{lastResult.draft.description}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/45 tracking-wider uppercase">คำพูดทักทายแรก</span>
                    <p className="text-xs font-bold leading-5 border-l-2 border-purple-500 bg-purple-950/15 p-2 rounded-r-lg text-purple-200">
                      "{lastResult.draft.greeting}"
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/45 tracking-wider uppercase">ระบบความจำเป็นตัวละคร (System Prompt)</span>
                    <p className="text-[11px] font-mono leading-4 text-white/60 bg-black/30 p-2.5 rounded-lg border border-white/5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {lastResult.draft.systemPrompt}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-white/10 bg-white/2 p-12 text-center flex flex-col items-center justify-center min-h-[30rem] maprang-glass">
              <ImageIcon size={48} className="text-white/20 mb-3" />
              <h3 className="text-base font-black text-white/70">ยังไม่มีข้อมูลภาพร่างประมวลผล</h3>
              <p className="mt-1 text-xs font-bold text-white/45 max-w-sm">
                พิมพ์เป้าหมายตัวละครทางซ้ายมือ จากนั้นกด "ประมวลผลข้อมูลโครงร่างตัวละคร" เพื่อดึงข้อมูลประมวลผลจาก AI
              </p>
            </div>
          )}
        </section>
      </div>

      {/* History section (Bounded Gallery Window) */}
      <section className="mt-8 rounded-lg maprang-glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3 mb-6">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              ประวัติประมวลผลภาพร่างผ่านสิทธิ์ผู้ให้บริการคีย์ตรง
            </h2>
            <p className="text-xs font-bold text-white/45">
              แสดงภาพร่างระบบล่าสุดในเครื่องคอมพิวเตอร์ของคุณ (แสดงสูงสุดครั้งละ 12 รูป)
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs font-black text-rose-400 hover:text-rose-300 transition"
            >
              ล้างประวัติทั้งหมด
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-white/35 text-xs font-bold">
            ไม่มีรายการประวัติประมวลผลภาพร่างในระบบเครื่องนี้
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {paginatedHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectFromHistory(item)}
                  className="group cursor-pointer rounded-lg border border-white/10 bg-black/40 overflow-hidden hover:border-purple-500/50 transition relative shadow-lg"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-black/20">
                    <img
                      src={item.url}
                      alt={item.response.draft.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-black text-white truncate">{item.response.draft.name}</p>
                    <p className="text-[10px] font-bold text-white/45 truncate mt-0.5">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bounded Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                  title="หน้าก่อนหน้า"
                  aria-label="หน้าก่อนหน้า"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-white/60">
                  หน้า {currentPage} จากทั้งหมด {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                  title="หน้าถัดไป"
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
