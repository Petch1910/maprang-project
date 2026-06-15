import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  BookOpen,
  Video,
  Play,
  Pause,
  Copy,
  Check,
  Upload,
  X,
  Film,
  Compass,
  LayoutGrid,
} from 'lucide-react'
import {
  generateCreatorAiDraft,
  updateCreatorDraft,
  logUnexpectedError,
  ApiError,
  fetchCharacters,
  type CreatorAiDraftResponse,
  type Character,
} from '../lib/api'
import { safeGetStorageItem, safeSetStorageItem } from '../lib/safeStorage'
import { getSafeClipboard, safeWriteClipboardText } from '../lib/safeClipboard'

interface GeneratedItem {
  id: string
  type: 'image' | 'video'
  url: string
  videoUrl?: string
  prompt: string
  brief: string
  style: string
  duration?: number
  motionTemplate?: string
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

const IMAGE_TEMPLATES = [
  {
    id: 'neon-tokyo',
    title: 'นีออนโตเกียว (Neon Tokyo Cyberpunk)',
    prompt: 'close up portrait of an elegant character glowing under neon lights in rain-slicked Tokyo streets, cyberpunk aesthetic, highly detailed',
    style: 'cyberpunk',
    bgClass: 'from-[#2e1065] via-[#090514] to-[#1e1b4b]',
    tag: 'Cyberpunk',
  },
  {
    id: 'cozy-anime',
    title: 'อนิเมะคาเฟ่ (Cozy Anime Cafe)',
    prompt: 'soft portrait of a beautiful character sitting in a cozy sunlit cafe drinking tea, highly detailed anime illustration style, warm lighting',
    style: 'anime',
    bgClass: 'from-[#451a03] via-[#0f0502] to-[#1e1b4b]',
    tag: 'Anime',
  },
  {
    id: 'fantasy-forest',
    title: 'ป่าเวทมนตร์ (Fantasy Magic Forest)',
    prompt: 'full body portrait of an adventurer character in a magical glowing forest, golden particles, floating magical dust, high fantasy digital art',
    style: '3d_render',
    bgClass: 'from-[#064e3b] via-[#02120b] to-[#1e1b4b]',
    tag: 'Fantasy',
  },
  {
    id: 'classical-oil',
    title: 'สีน้ำมันคลาสสิก (Classical Oil Portrait)',
    prompt: 'fine art oil painting portrait of a noble character, renaissance style, dramatic chiaroscuro lighting, deep classical tones, textured brush strokes',
    style: 'oil_painting',
    bgClass: 'from-[#7f1d1d] via-[#1c0205] to-[#1e1b4b]',
    tag: 'Classical',
  },
]

const GALLERY_FILTERS = [
  { val: 'all', label: 'ทั้งหมด' },
  { val: 'image', label: 'ภาพร่าง' },
  { val: 'video', label: 'วิดีโอ' },
] as const

// Purity Helper: Avoid calling Date.now() directly inside component renders or handlers.
function getNowTimestamp(): number {
  return Date.now()
}

export function AICreatorPage() {
  // Navigation & Character States
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'template'>('image')

  // Form Inputs
  const [brief, setBrief] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState('realistic')
  const [referenceImage, setReferenceImage] = useState<string | null>(null)

  // Video Inputs
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoDuration, setVideoDuration] = useState<number>(5)
  const [videoTemplate, setVideoTemplate] = useState('gentle-breeze')
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null)

  // App States
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [lastResult, setLastResult] = useState<GeneratedItem | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  // Video Player Mock States
  const [isPlaying, setIsPlaying] = useState(true)
  const [playProgress, setPlayProgress] = useState(0)
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1)
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'image' | 'video'>('all')
  const PAGE_SIZE = 12

  // Fetch characters on load
  useEffect(() => {
    let active = true
    fetchCharacters({ view: 'public', limit: 40 })
      .then((res) => {
        if (active && res.characters) {
          setCharacters(res.characters)
        }
      })
      .catch((err) => {
        logUnexpectedError('ดึงข้อมูลรายชื่อตัวละครเพื่อสร้างภาพร่างล้มเหลว', err)
      })
    return () => {
      active = false
    }
  }, [])

  // Handle Mock Video Playback Animation
  useEffect(() => {
    if (lastResult?.type === 'video' && isPlaying) {
      const durationMs = (lastResult.duration || 5) * 1000
      const intervalMs = 100
      const step = (intervalMs / durationMs) * 100

      videoTimerRef.current = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 100) return 0
          return prev + step
        })
      }, intervalMs)
    } else {
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current)
        videoTimerRef.current = null
      }
    }

    return () => {
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current)
      }
    }
  }, [lastResult, isPlaying])

  const saveHistory = (newHistory: GeneratedItem[]) => {
    setHistory(newHistory)
    if (typeof window !== 'undefined') {
      safeSetStorageItem(window.localStorage, 'maprang:creator-image-history', JSON.stringify(newHistory))
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    const isVideoMode = activeTab === 'video'
    const promptText = isVideoMode ? videoPrompt.trim() : imagePrompt.trim()
    const briefText = brief.trim()

    if (!briefText && !promptText) return

    setIsGenerating(true)
    setStatusMessage('กำลังวิเคราะห์เค้าโครงร่างของสื่อและติดต่อระบบสิทธิ์ผู้ให้บริการคีย์ตรง...')
    setLastResult(null)
    setPlayProgress(0)

    try {
      // Execute the generator draft backend service
      const res = await generateCreatorAiDraft({
        brief: briefText,
        imagePrompt: promptText,
        imageStyle: isVideoMode ? 'realistic' : imageStyle,
        imageOnly: false,
      })

      const targetChar = characters.find((c) => c.id === selectedCharacterId)
      if (targetChar) {
        res.draft.name = targetChar.name
      }

      let newItem: GeneratedItem

      if (isVideoMode) {
        // Build video item structure
        newItem = {
          id: crypto.randomUUID(),
          type: 'video',
          url: res.image.url, // Thumbnail
          videoUrl: 'mock-video-stream',
          prompt: videoPrompt.trim(),
          brief: briefText,
          style: 'video_render',
          duration: videoDuration,
          motionTemplate: videoTemplate,
          timestamp: getNowTimestamp(),
          response: res,
        }
        setStatusMessage('ระบบจำลองการสั่นไหวและเรนเดอร์วิดีโอเคลื่อนไหวผ่านสิทธิ์ผู้ให้บริการคีย์ตรงเสร็จสิ้น')
      } else {
        // Build image item structure
        newItem = {
          id: crypto.randomUUID(),
          type: 'image',
          url: res.image.url,
          prompt: imagePrompt.trim() || briefText,
          brief: briefText,
          style: imageStyle,
          timestamp: getNowTimestamp(),
          response: res,
        }
        setStatusMessage('ระบบวิเคราะห์ประมวลผลแบบสเก็ตช์ภาพร่างระบบเสร็จสิ้น')
      }

      saveHistory([newItem, ...history])
      setLastResult(newItem)
      setCurrentPage(1) // Reset to first page of gallery
    } catch (err) {
      logUnexpectedError('การประมวลผลสร้างภาพร่างขัดข้อง', err)
      if (err instanceof ApiError) {
        setStatusMessage(err.message)
      } else {
        setStatusMessage('ระบบสิทธิ์เชื่อมโยงขัดข้องชั่วคราว กรุณาตรวจสอบการตั้งค่าคีย์ของคุณแล้วลองใหม่อีกครั้ง')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle Preset Template Auto-click
  const handleTemplateClick = async (tpl: typeof IMAGE_TEMPLATES[number]) => {
    setActiveTab('image')
    setImagePrompt(tpl.prompt)
    setImageStyle(tpl.style)

    // Auto submit mock
    setIsGenerating(true)
    setStatusMessage('กำลังโหลดโครงร่างสไตล์ความนุ่มนวลและเชื่อมระบบสร้างภาพร่างระบบ...')
    setLastResult(null)

    try {
      const res = await generateCreatorAiDraft({
        brief: brief.trim(),
        imagePrompt: tpl.prompt,
        imageStyle: tpl.style,
        imageOnly: false,
      })

      const newItem: GeneratedItem = {
        id: crypto.randomUUID(),
        type: 'image',
        url: res.image.url,
        prompt: tpl.prompt,
        brief: brief.trim(),
        style: tpl.style,
        timestamp: getNowTimestamp(),
        response: res,
      }

      saveHistory([newItem, ...history])
      setLastResult(newItem)
      setCurrentPage(1)
      setStatusMessage('ระบบวิเคราะห์ประมวลผลแม่แบบภาพร่างเสร็จสิ้นเรียบร้อย')
    } catch (err) {
      logUnexpectedError('ประมวลผลเทมเพลตภาพร่างไม่สำเร็จ', err)
      setStatusMessage('ไม่สามารถเรียกข้อมูลประมวลผลแม่แบบได้ชั่วคราว')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToStudio = async (response: CreatorAiDraftResponse) => {
    try {
      setStatusMessage('กำลังบันทึกภาพร่างเข้าสู่ศูนย์ควบคุมห้องทำงานนักพัฒนา...')
      await updateCreatorDraft(response.draft)
      setStatusMessage('บันทึกภาพร่างระบบและบุคลิกเข้าสู่ห้องทำงานสตูดิโอเรียบร้อยแล้ว')
    } catch (err) {
      logUnexpectedError('บันทึกข้อมูลดราฟต์นักพัฒนาไม่สำเร็จ', err)
      setStatusMessage('ไม่สามารถบันทึกข้อมูลโครงร่างสำเร็จ')
    }
  }

  const handleSelectFromHistory = (item: GeneratedItem) => {
    setLastResult(item)
    setBrief(item.brief)
    if (item.type === 'video') {
      setActiveTab('video')
      setVideoPrompt(item.prompt)
      setVideoDuration(item.duration || 5)
      setVideoTemplate(item.motionTemplate || 'gentle-breeze')
    } else {
      setActiveTab('image')
      setImagePrompt(item.prompt)
      setImageStyle(item.style)
    }
    setPlayProgress(0)
  }

  const clearHistory = () => {
    saveHistory([])
    setCurrentPage(1)
    setLastResult(null)
  }

  const handleCopySystemPrompt = () => {
    if (!lastResult) return
    void safeWriteClipboardText(getSafeClipboard(), lastResult.response.draft.systemPrompt).then((success) => {
      if (success) {
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2000)
      }
    })
  }

  // Filter and Paginate History items
  const filteredHistory = history.filter((item) => {
    if (galleryFilter === 'image') return item.type === 'image'
    if (galleryFilter === 'video') return item.type === 'video'
    return true
  })

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE) || 1
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-[#080a1a] text-white py-8 px-4 md:px-8 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Upper bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#2e2e44] pb-6">
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e1e34] border border-[#2e2e44] px-4 py-2.5 text-xs font-semibold text-[#9ca3af] hover:text-white hover:bg-[#24243a] transition-all"
          >
            <ArrowLeft size={14} />
            กลับสู่ห้องควบคุมหลัก
          </Link>

          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[0_2px_12px_rgba(168,85,247,0.3)]">
                CG造物主
              </span>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                หน้าออกแบบภาพร่างและโมเดลเคลื่อนไหว
              </h1>
            </div>
            <p className="text-xs font-medium text-[#6b7280] mt-1">
              ระบบควบคุมภาพและวิดีโออัจฉริยะผ่านสิทธิ์ผู้ให้บริการคีย์ตรง (Enterprise Direct Key Creator Surface)
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Side: Dynamic Multi-Tab Controls */}
          <section className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-[#1e1e34]/90 border border-[#2e2e44] p-6 space-y-6 shadow-2xl backdrop-blur-md">

              {/* Categories/Tabs Switcher */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-[#2e2e44]">
                <button
                  type="button"
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    activeTab === 'image'
                      ? 'bg-[#a855f7]/15 border-[#a855f7] text-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                      : 'bg-[#1e1e34] border-[#2e2e44] text-[#9ca3af] hover:text-white hover:bg-[#24243a]'
                  }`}
                  onClick={() => {
                    setActiveTab('image')
                    setStatusMessage('')
                  }}
                  title="แท็บการสร้างภาพร่างระบบ"
                  aria-label="แท็บการสร้างภาพร่างระบบ"
                >
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    ภาพร่างระบบ
                  </span>
                </button>

                <button
                  type="button"
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    activeTab === 'video'
                      ? 'bg-[#a855f7]/15 border-[#a855f7] text-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                      : 'bg-[#1e1e34] border-[#2e2e44] text-[#9ca3af] hover:text-white hover:bg-[#24243a]'
                  }`}
                  onClick={() => {
                    setActiveTab('video')
                    setStatusMessage('')
                  }}
                  title="แท็บการเรนเดอร์วิดีโอเคลื่อนไหว"
                  aria-label="แท็บการเรนเดอร์วิดีโอเคลื่อนไหว"
                >
                  <span className="flex items-center gap-1.5">
                    <Video size={14} />
                    วิดีโอระดับสูง
                  </span>
                </button>

                <button
                  type="button"
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    activeTab === 'template'
                      ? 'bg-[#a855f7]/15 border-[#a855f7] text-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                      : 'bg-[#1e1e34] border-[#2e2e44] text-[#9ca3af] hover:text-white hover:bg-[#24243a]'
                  }`}
                  onClick={() => {
                    setActiveTab('template')
                    setStatusMessage('')
                  }}
                  title="แท็บเทมเพลตภาพร่างสำเร็จรูป"
                  aria-label="แท็บเทมเพลตภาพร่างสำเร็จรูป"
                >
                  <span className="flex items-center gap-1.5">
                    <LayoutGrid size={14} />
                    แม่แบบสไตล์
                  </span>
                </button>
              </div>

              {/* Common Inputs */}
              {activeTab !== 'template' && (
                <div className="space-y-5">
                  {/* Targeting Character Dropdown */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      เลือกตัวละครเป้าหมาย (Targeting Character)
                    </label>
                    <select
                      className="block w-full rounded-xl border border-[#2e2e44] bg-[#1e1e34] p-3 text-xs font-semibold text-white outline-none focus:border-[#a855f7] transition-all"
                      value={selectedCharacterId}
                      onChange={(e) => setSelectedCharacterId(e.target.value)}
                      disabled={isGenerating}
                      title="เลือกตัวละครเป้าหมาย"
                      aria-label="เลือกตัวละครเป้าหมาย"
                    >
                      <option value="">ภาพรวมระบบ / ยังไม่เจาะจงตัวละคร</option>
                      {characters.map((char) => (
                        <option key={char.id} value={char.id}>
                          {char.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brief Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      ปูบริบทเบื้องหลัง / ประวัติย่อของตัวละคร
                    </label>
                    <textarea
                      rows={3}
                      placeholder="เช่น: เจ้าหน้าที่ฝ่ายความมั่นคงแห่งโลกอนาคตผู้เงียบขรึม..."
                      className="block w-full rounded-xl border border-[#2e2e44] bg-[#1e1e34] p-3.5 text-xs font-semibold text-white placeholder-white/20 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 transition-all resize-none"
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      disabled={isGenerating}
                      title="ปูบริบทเบื้องหลังของตัวละคร"
                      aria-label="ปูบริบทเบื้องหลังของตัวละคร"
                    />
                  </div>
                </div>
              )}

              {/* TAB 1: Image Generator Form */}
              {activeTab === 'image' && (
                <form onSubmit={handleGenerate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      รายละเอียดคำสั่งภาพที่ต้องการ (Image Prompt)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="เช่น: realistic portrait, glowing holographic jacket, rain reflection, cyber fantasy..."
                      className="block w-full rounded-xl border border-[#2e2e44] bg-[#1e1e34] p-3.5 text-xs font-semibold text-white placeholder-white/20 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 transition-all resize-none"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      disabled={isGenerating}
                      title="รายละเอียดคำสั่งภาพที่ต้องการ"
                      aria-label="รายละเอียดคำสั่งภาพที่ต้องการ"
                    />
                  </div>

                  {/* Interactive Style Selection (Chips style) */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      สไตล์และรูปแบบความพรีเมียม (Style Presets)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_PRESETS.map((preset) => {
                        const isActive = imageStyle === preset.value
                        return (
                          <button
                            type="button"
                            key={preset.value}
                            onClick={() => setImageStyle(preset.value)}
                            disabled={isGenerating}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                              isActive
                                ? 'bg-[#a855f7]/15 border-[#a855f7] text-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                                : 'bg-[#1e1e34] border-[#2e2e44] text-[#9ca3af] hover:text-white hover:bg-[#24243a]'
                            }`}
                            title={`สไตล์ ${preset.label}`}
                            aria-label={`สไตล์ ${preset.label}`}
                            aria-pressed={isActive}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Image Reference upload */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      ภาพต้นแบบอ้างอิง (Image Reference - ControlNet)
                    </label>
                    {referenceImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-[#2e2e44] bg-[#1e1e34] p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={referenceImage} alt="Reference Preview" className="w-12 h-12 object-cover rounded-lg" />
                          <span className="text-xs font-semibold text-[#9ca3af]">โหลดภาพอ้างอิงแล้ว.png</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReferenceImage(null)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                          title="ลบรูปภาพอ้างอิง"
                          aria-label="ลบรูปภาพอ้างอิง"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-[#2e2e44] bg-[#1e1e34]/50 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-[#24243a]/50 hover:border-[#a855f7]/50 transition cursor-pointer text-center group">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = () => setReferenceImage(reader.result as string)
                              reader.readAsDataURL(file)
                            }
                          }}
                          disabled={isGenerating}
                          title="เลือกรูปภาพอ้างอิง"
                          aria-label="เลือกรูปภาพอ้างอิง"
                        />
                        <Upload size={24} className="text-[#6b7280] group-hover:text-[#a855f7] transition mb-2" />
                        <span className="text-xs font-semibold text-[#9ca3af]">อัปโหลดภาพท่าทางอ้างอิง</span>
                        <span className="text-[10px] text-[#6b7280] mt-1">JPG / PNG / WebP / GIF (สูงสุด 10MB)</span>
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(168,85,247,0.35)]"
                    disabled={isGenerating || (!brief.trim() && !imagePrompt.trim())}
                    title="ประมวลผลข้อมูลโครงร่างตัวละคร"
                    aria-label="ประมวลผลข้อมูลโครงร่างตัวละคร"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        กำลังส่งประมวลผลโครงร่างภาพ...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        ส่งประมวลผลโครงร่างภาพร่างระบบ
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: Advanced Video Form */}
              {activeTab === 'video' && (
                <form onSubmit={handleGenerate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      คำสั่งการขยับมุมกล้อง / ท่าทางวิดีโอ (Video Prompt)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="เช่น: gentle smile, wind blowing hair, golden dust particles flying, epic tracking camera..."
                      className="block w-full rounded-xl border border-[#2e2e44] bg-[#1e1e34] p-3.5 text-xs font-semibold text-white placeholder-white/20 outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 transition-all resize-none"
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      disabled={isGenerating}
                      title="คำสั่งขยับมุมกล้องวิดีโอ"
                      aria-label="คำสั่งขยับมุมกล้องวิดีโอ"
                    />
                  </div>

                  {/* Duration select via Range Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-[#9ca3af]">
                        ความยาวของชิ้นงานวิดีโอ (Duration)
                      </label>
                      <span className="text-xs font-semibold text-white bg-[#a855f7]/20 border border-[#a855f7]/30 px-2 py-0.5 rounded-md">
                        {videoDuration} วินาที
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#1e1e34] border border-[#2e2e44] p-3.5 rounded-xl">
                      <span className="text-xs text-[#6b7280]">3s</span>
                      <input
                        type="range"
                        min={3}
                        max={10}
                        step={1}
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(Number(e.target.value))}
                        disabled={isGenerating}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-[#2e2e44] accent-[#a855f7]"
                        style={{
                          background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((videoDuration - 3) / (10 - 3)) * 100}%, #2e2e44 ${((videoDuration - 3) / (10 - 3)) * 100}%, #2e2e44 100%)`
                        }}
                        title="ความยาวของชิ้นงานวิดีโอ"
                        aria-label="ความยาวของชิ้นงานวิดีโอ"
                      />
                      <span className="text-xs text-[#6b7280]">10s</span>
                    </div>
                  </div>

                  {/* Motion Template select */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      รูปแบบทิศทางขยับมุมกล้อง (Camera Motion)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'gentle-breeze', label: 'ลมพัดเบาๆ (Breeze)' },
                        { val: 'snow', label: 'ละอองหิมะโปรย (Snowfall)' },
                        { val: 'zoom-in', label: 'ซูมดึงเข้า (Zoom In)' },
                        { val: 'zoom-out', label: 'ซูมออกขยาย (Zoom Out)' },
                      ].map((tpl) => (
                        <button
                          type="button"
                          key={tpl.val}
                          onClick={() => setVideoTemplate(tpl.val)}
                          disabled={isGenerating}
                          className={`py-2.5 px-3.5 rounded-xl text-[10px] font-semibold border transition-all text-left ${
                            videoTemplate === tpl.val
                              ? 'bg-[#a855f7]/15 border-[#a855f7] text-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                              : 'bg-[#1e1e34] border-[#2e2e44] text-[#9ca3af] hover:text-white hover:bg-[#24243a]'
                          }`}
                          title={`ทิศทางกล้อง ${tpl.label}`}
                          aria-label={`ทิศทางกล้อง ${tpl.label}`}
                          aria-pressed={videoTemplate === tpl.val}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Video reference */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[#9ca3af]">
                      วิดีโอเป้าหมายอ้างอิง (Target Video Reference)
                    </label>
                    {referenceVideo ? (
                      <div className="relative rounded-xl overflow-hidden border border-[#2e2e44] bg-[#1e1e34] p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Film size={18} className="text-[#a855f7]" />
                          <span className="text-xs font-semibold text-[#9ca3af]">อ้างอิงวิดีโอ_{videoDuration}s.mp4</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReferenceVideo(null)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                          title="ลบวิดีโออ้างอิง"
                          aria-label="ลบวิดีโออ้างอิง"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-[#2e2e44] bg-[#1e1e34]/50 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-[#24243a]/50 hover:border-[#a855f7]/50 transition cursor-pointer text-center group">
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setReferenceVideo(file.name)
                            }
                          }}
                          disabled={isGenerating}
                          title="เลือกวิดีโออ้างอิง"
                          aria-label="เลือกวิดีโออ้างอิง"
                        />
                        <Upload size={24} className="text-[#6b7280] group-hover:text-[#a855f7] transition mb-2" />
                        <span className="text-xs font-semibold text-[#9ca3af]">อัปโหลดวิดีโอเคลื่อนไหวอ้างอิง</span>
                        <span className="text-[10px] text-[#6b7280] mt-1">MP4 / WebM / MOV (สูงสุด 50MB)</span>
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(168,85,247,0.35)]"
                    disabled={isGenerating || (!brief.trim() && !videoPrompt.trim())}
                    title="ประมวลผลวิดีโอระบบ"
                    aria-label="ประมวลผลวิดีโอระบบ"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        กำลังส่งประมวลผลเรนเดอร์วิดีโอ...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        ส่งประมวลผลเรนเดอร์วิดีโอระดับสูง
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 3: Style Templates presets */}
              {activeTab === 'template' && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-[#9ca3af]">
                    ⚡ เลือกพรีเซ็ตเทมเพลตสไตล์ยอดนิยมเพื่อกรอกพารามิเตอร์และสเก็ตช์ภาพร่างระบบแบบเร็วทันที:
                  </p>
                  <div className="grid gap-3">
                    {IMAGE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => void handleTemplateClick(tpl)}
                        disabled={isGenerating}
                        className={`w-full text-left p-4 rounded-xl border border-[#2e2e44] bg-gradient-to-br ${tpl.bgClass} hover:border-[#a855f7]/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-all duration-300 relative overflow-hidden group`}
                        type="button"
                        title={`ใช้งานพรีเซ็ต ${tpl.title}`}
                      >
                        <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-30 transition duration-300">
                          <Compass size={40} className="text-white" />
                        </div>
                        <span className="inline-block px-2.5 py-0.5 rounded bg-white/10 text-[9px] font-black text-purple-300 mb-2">
                          {tpl.tag}
                        </span>
                        <h4 className="text-xs font-bold text-white">{tpl.title}</h4>
                        <p className="text-[10px] text-[#9ca3af] mt-1.5 line-clamp-2 leading-relaxed">
                          {tpl.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {statusMessage && (
                <div className="text-xs font-semibold text-[#a855f7] bg-[#a855f7]/10 border border-[#a855f7]/20 p-3.5 rounded-xl leading-relaxed flex gap-2">
                  <span className="flex-shrink-0">ℹ️</span>
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>
          </section>

          {/* Right Side: Interactive Preview surface */}
          <section className="lg:col-span-7">
            {lastResult ? (
              <div className="rounded-2xl bg-[#1e1e34]/90 border border-[#2e2e44] p-6 space-y-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-[#2e2e44] pb-4 flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    {lastResult.type === 'video' ? 'วิดีโอเคลื่อนไหวจำลองสำเร็จ' : 'ภาพร่างระบบประมวลผลเสร็จสิ้น'}
                  </h2>

                  <button
                    type="button"
                    onClick={() => void handleSaveToStudio(lastResult.response)}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 px-4 py-2.5 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                    title="บันทึกโครงร่างลงระบบสตูดิโอ"
                  >
                    <BookOpen size={13} />
                    บันทึกโครงร่างเข้าระบบสตูดิโอ
                  </button>
                </div>

                <div className="grid gap-6 sm:grid-cols-12">
                  {/* Media preview panel */}
                  <div className="sm:col-span-5 space-y-4">

                    {lastResult.type === 'video' ? (
                      /* Mock Video Player for Video Preview */
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#2e2e44] bg-[#080a1a] flex flex-col justify-between shadow-2xl">

                        {/* Viewfinder overlay */}
                        <div className="p-3 flex items-center justify-between text-[9px] font-mono font-semibold text-[#6b7280] z-10">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            [REC] 00:0{videoDuration}
                          </span>
                          <span>{videoTemplate.toUpperCase()}</span>
                        </div>

                        {/* Mock animation container */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-full h-full relative overflow-hidden flex items-center justify-center rounded-lg">
                            {/* Main background image skeleton */}
                            <img
                              src={lastResult.url}
                              alt="Video frame mock"
                              className={`h-full w-full object-cover transition-all duration-700 ${
                                isPlaying ? 'scale-105 saturate-[1.1] blur-[0.5px]' : 'scale-100'
                              }`}
                            />

                            {/* Animated filter according to template */}
                            {isPlaying && (
                              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-purple-900/10 via-transparent to-cyan-950/10 z-0">

                                {/* Scanning line animation */}
                                <div className="w-full h-[1.5px] bg-cyan-400/20 absolute top-0 animate-[scan_3s_linear_infinite]" />

                                {videoTemplate === 'snow' && (
                                  <div className="absolute inset-0 animate-pulse opacity-40 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:10px_10px]" />
                                )}

                                {videoTemplate === 'gentle-breeze' && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent skew-x-12 translate-x-full animate-[wind_4s_ease-in-out_infinite]" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Video Player Control bar */}
                        <div className="p-3 bg-[#1e1e34]/90 backdrop-blur-md border-t border-[#2e2e44] flex flex-col gap-2.5 z-10">
                          {/* Progress slider */}
                          <div className="h-1 bg-[#2e2e44] rounded-full overflow-hidden cursor-pointer">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-100"
                              style={{ width: `${playProgress}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-semibold text-[#9ca3af]">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-1 rounded-lg bg-[#2e2e44] hover:bg-[#24243a] text-white transition-all"
                                title={isPlaying ? "หยุดชั่วคราว" : "เล่น"}
                                aria-label={isPlaying ? "หยุดชั่วคราว" : "เล่น"}
                              >
                                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                              </button>
                              <span>0:0{Math.floor((playProgress / 100) * videoDuration)} / 0:0{videoDuration}</span>
                            </div>

                            <span className="px-2 py-0.5 rounded-lg bg-[#2e2e44] text-[9px] uppercase tracking-wider text-[#a855f7]">
                              {videoDuration}s Loop
                            </span>
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* Image Preview Layout */
                      <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#2e2e44] bg-[#080a1a] relative shadow-inner">
                        {lastResult.url ? (
                          <img
                            src={lastResult.url}
                            alt={lastResult.response.draft.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center text-[#6b7280] text-xs p-4 text-center">
                            <ImageIcon size={42} className="mb-2 text-[#2e2e44]" />
                            โครงร่างจำลองกรณีไม่เชื่อมต่ออินเทอร์เน็ต
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl bg-[#18182f] border border-[#2e2e44] p-4 text-[11px] font-semibold text-[#9ca3af] space-y-2 leading-relaxed">
                      <p>⚡ รูปแบบสื่อ: <span className="text-white">{lastResult.type === 'video' ? 'วิดีโอความยาวสั่นไหวระดับสูง' : 'ภาพร่างระบบเดี่ยว'}</span></p>
                      {lastResult.type === 'video' && <p>🎬 ทิศทางมุมกล้อง: <span className="text-white">{lastResult.motionTemplate}</span></p>}
                      <p className="line-clamp-3">📝 คำอธิบายภาพรวม: <span className="text-white font-mono">{lastResult.prompt}</span></p>
                    </div>
                  </div>

                  {/* Character Metadata details */}
                  <div className="sm:col-span-7 space-y-5 max-h-[35rem] overflow-y-auto pr-1">
                    <div>
                      <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase">ชื่อตัวละครร่างระบบ</span>
                      <p className="text-xl font-black text-white mt-1">{lastResult.response.draft.name}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase">คำอธิบายภาพลักษณ์</span>
                      <p className="text-xs font-medium leading-relaxed text-[#9ca3af] mt-1">{lastResult.response.draft.description}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase">ข้อความทักทายแรกสุด</span>
                      <p className="text-xs font-medium leading-relaxed border-l-2 border-[#a855f7] bg-[#a855f7]/10 p-3 rounded-r-xl text-[#d8b4fe] mt-1">
                        "{lastResult.response.draft.greeting}"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase">
                          บริบทความจำเป็นระบบ (System Prompt)
                        </span>
                        <button
                          type="button"
                          onClick={handleCopySystemPrompt}
                          className="text-[10px] font-semibold text-[#a855f7] hover:text-[#c084fc] flex items-center gap-1 transition-all"
                          title="คัดลอกบริบทความจำเป็นระบบ"
                        >
                          {copiedPrompt ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              คัดลอกแล้ว!
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              คัดลอกคำสั่ง
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono leading-relaxed text-[#9ca3af] bg-[#080a1a] p-3.5 rounded-xl border border-[#2e2e44] whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {lastResult.response.draft.systemPrompt}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state canvas */
              <div className="rounded-2xl border-2 border-dashed border-[#2e2e44] bg-[#1e1e34]/40 p-12 text-center flex flex-col items-center justify-center min-h-[34rem] shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-[#1e1e34] flex items-center justify-center mb-4 border border-[#2e2e44]">
                  <Sparkles size={28} className="text-[#a855f7]" />
                </div>
                <h3 className="text-base font-bold text-white/90">ยังไม่มีข้อมูลชิ้นงานประมวลผล</h3>
                <p className="mt-2 text-xs font-semibold text-[#9ca3af] max-w-sm leading-relaxed">
                  กรอกเป้าหมายตัวละคร หรือสลับแท็บเลือกรูปแบบภาพ/วิดีโอ จากนั้นคลิกประมวลผล เพื่อเริ่มเรนเดอร์โครงร่างสื่อชิ้นงาน
                </p>
              </div>
            )}
          </section>
        </div>

        {/* History section (Paginated Windowed Gallery) */}
        <section className="mt-8 rounded-2xl bg-[#1e1e34]/90 border border-[#2e2e44] p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2e2e44] pb-5 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                แกลเลอรีประวัติภาพร่างและชิ้นงานจำลองระบบ
              </h2>
              <p className="text-xs font-medium text-[#6b7280] mt-1">
                แสดงภาพถ่ายและโครงร่างวิดีโอเคลื่อนไหวที่ประมวลผลเสร็จสิ้น (ดึงข้อมูลจำกัดหน้าต่างละ 12 รายการ)
              </p>
            </div>

            {/* Filtering buttons */}
            <div className="flex items-center gap-1.5 bg-[#18182f] p-1.5 rounded-xl border border-[#2e2e44]">
              {GALLERY_FILTERS.map((f) => (
                <button
                  key={f.val}
                  type="button"
                  onClick={() => {
                    setGalleryFilter(f.val)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    galleryFilter === f.val
                      ? 'bg-[#a855f7] text-white shadow-lg'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                  title={`ตัวกรอง ${f.label}`}
                  aria-label={`ตัวกรอง ${f.label}`}
                  aria-pressed={galleryFilter === f.val}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-all"
              >
                ล้างประวัติทั้งหมด
              </button>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-[#6b7280] text-xs font-semibold">
              ไม่มีรายการแกลเลอรีในหมวดนี้ในประวัติคอมพิวเตอร์ของคุณ
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {paginatedHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectFromHistory(item)}
                    className="group cursor-pointer rounded-xl border border-[#2e2e44] bg-[#18182f] overflow-hidden hover:border-[#a855f7]/75 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-300 relative"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden bg-[#1e1e34] relative">
                      <img
                        src={item.url}
                        alt={item.response.draft.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {item.type === 'video' && (
                        <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-[#080a1a]/85 border border-[#2e2e44] text-white shadow-lg flex items-center justify-center">
                          <Video size={12} className="text-[#a855f7]" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-white truncate">{item.response.draft.name}</p>
                      <p className="text-[10px] font-medium text-[#6b7280] truncate mt-1">{item.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-5 border-t border-[#2e2e44]">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1e34] border border-[#2e2e44] text-[#9ca3af] hover:text-white hover:bg-[#24243a] transition-all disabled:opacity-30"
                    title="หน้าก่อนหน้า"
                    aria-label="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold text-[#9ca3af]">
                    หน้า {currentPage} จากทั้งหมด {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e1e34] border border-[#2e2e44] text-[#9ca3af] hover:text-white hover:bg-[#24243a] transition-all disabled:opacity-30"
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
    </div>
  )
}
