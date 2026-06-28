import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, CheckCircle2, Copy, Image as ImageIcon, Pause, Play } from 'lucide-react'
import type { CreatorAiDraftResponse } from '../../lib/api'
import type { AiCreatorGeneratedItem } from '../../lib/aiCreator'

type AiCreatorResultPreviewProps = {
  result: AiCreatorGeneratedItem | null
  copiedPrompt: boolean
  onSaveToStudio: (response: CreatorAiDraftResponse) => void
  onCopySystemPrompt: () => void
}

export function AiCreatorResultPreview({
  result,
  copiedPrompt,
  onSaveToStudio,
  onCopySystemPrompt,
}: AiCreatorResultPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [playProgress, setPlayProgress] = useState(0)
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoDuration = result?.duration || 5
  const videoTemplate = result?.motionTemplate || 'local-preview'

  useEffect(() => {
    setPlayProgress(0)
    setIsPlaying(true)
  }, [result?.id])

  useEffect(() => {
    if (result?.type === 'video' && isPlaying) {
      const intervalMs = 100
      const step = (intervalMs / (videoDuration * 1000)) * 100

      videoTimerRef.current = setInterval(() => {
        setPlayProgress((prev) => (prev >= 100 ? 0 : prev + step))
      }, intervalMs)
    } else if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current)
      videoTimerRef.current = null
    }

    return () => {
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current)
        videoTimerRef.current = null
      }
    }
  }, [result?.type, isPlaying, videoDuration])

  if (!result) {
    return (
      <div className="flex min-h-[34rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-[#111327]/76 p-10 text-center shadow-[0_18px_48px_rgba(0,0,0,0.38)]">
        <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/10 bg-[#080a1a] text-[#ac4bff]">
          <ImageIcon size={28} />
        </div>
        <h2 className="text-lg font-black text-white">ยังไม่มีผลลัพธ์</h2>
        <p className="mt-2 max-w-sm text-sm font-bold leading-6 text-slate-500">
          เลือกแม่แบบ ใส่คำสั่ง แล้วกดสร้าง ผลลัพธ์จะมาแสดงตรงนี้พร้อมปุ่มส่งต่อไปยังหน้าสร้างตัวละคร
        </p>
      </div>
    )
  }

  return (
    <div className="missai-card rounded-3xl p-6 shadow-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-white">
          <CheckCircle2 size={18} className="text-emerald-400" />
          {result.type === 'video' ? 'พรีวิววิดีโอพร้อมใช้งาน' : 'รูปและเนื้อหาพร้อมใช้งาน'}
        </h2>

        <button
          className="missai-button-primary min-h-10 rounded-xl px-4 text-xs"
          onClick={() => onSaveToStudio(result.response)}
          title="ส่งผลลัพธ์นี้ไปยังหน้าสตูดิโอสร้างตัวละคร"
          type="button"
        >
          <BookOpen size={14} />
          ส่งไปสร้างตัวละคร
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(12rem,18rem)_1fr]">
        <div className="space-y-4">
          {result.type === 'video' ? (
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[#080a1a] shadow-2xl">
              <img
                alt="พรีวิววิดีโอ"
                className={`h-full w-full object-cover transition duration-700 ${isPlaying ? 'scale-105 saturate-110' : 'scale-100'}`}
                src={result.url}
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/45 px-3 py-2 text-[10px] font-black text-slate-300">
                <span>บันทึก {videoDuration}s</span>
                <span>{videoTemplate}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#080a1a]/90 p-3">
                <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-[#ac4bff] to-cyan-400" style={{ width: `${playProgress}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <button
                    aria-label={isPlaying ? 'หยุดพรีวิว' : 'เล่นพรีวิว'}
                    className="missai-icon-button size-8 rounded-lg"
                    onClick={() => setIsPlaying((playing) => !playing)}
                    title={isPlaying ? 'หยุดพรีวิว' : 'เล่นพรีวิว'}
                    type="button"
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <span>{Math.floor((playProgress / 100) * videoDuration)}s / {videoDuration}s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[#080a1a] shadow-2xl">
              {result.url ? (
                <img alt={result.response.draft.name} className="h-full w-full object-cover" src={result.url} />
              ) : (
                <div className="grid h-full place-items-center p-6 text-center text-xs font-bold text-slate-500">
                  ยังไม่มี URL รูปภาพ
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#080a1a]/55 p-4 text-[11px] font-bold leading-6 text-slate-400">
            <p>ประเภท: <span className="text-white">{result.type === 'video' ? 'วิดีโอ' : 'รูปภาพ'}</span></p>
            <p className="line-clamp-3">คำสั่ง: <span className="text-white">{result.prompt || 'ไม่มีคำสั่งที่บันทึกไว้'}</span></p>
          </div>
        </div>

        <div className="max-h-[35rem] space-y-5 overflow-y-auto pr-1">
          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">ชื่อตัวละครจาก draft</p>
            <p className="mt-1 text-2xl font-black text-white">{result.response.draft.name}</p>
          </section>

          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">คำอธิบาย</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-400">{result.response.draft.description}</p>
          </section>

          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">บทสนทนาแรก</p>
            <p className="mt-2 rounded-xl border-l-2 border-[#ac4bff] bg-[#ac4bff]/10 p-3 text-sm font-bold leading-6 text-[#d9b3ff]">
              “{result.response.draft.greeting}”
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">คำสั่งระบบ</p>
              <button
                className="inline-flex items-center gap-1 text-xs font-black text-[#ac4bff] hover:text-[#c084fc]"
                onClick={onCopySystemPrompt}
                title="คัดลอก system prompt"
                type="button"
              >
                {copiedPrompt ? (
                  <>
                    <Check size={12} />
                    คัดลอกแล้ว
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    คัดลอก
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-[#080a1a] p-3.5 text-[11px] font-bold leading-6 text-slate-400">
              {result.response.draft.systemPrompt}
            </pre>
          </section>
        </div>
      </div>
    </div>
  )
}
