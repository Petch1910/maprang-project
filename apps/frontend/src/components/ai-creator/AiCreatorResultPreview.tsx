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
      <div className="rounded-2xl border-2 border-dashed border-[#2e2e44] bg-[#1e1e34]/40 p-12 text-center flex flex-col items-center justify-center min-h-[34rem] shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#1e1e34] flex items-center justify-center mb-4 border border-[#2e2e44]">
          <ImageIcon size={28} className="text-[#a855f7]" />
        </div>
        <h3 className="text-base font-bold text-white/90">ยังไม่มีข้อมูลชิ้นงานประมวลผล</h3>
        <p className="mt-2 text-xs font-semibold text-[#9ca3af] max-w-sm leading-relaxed">
          กรอกเป้าหมายตัวละคร หรือสลับแท็บเลือกรูปแบบภาพ/วิดีโอ จากนั้นคลิกประมวลผล เพื่อเริ่มเรนเดอร์โครงร่างสื่อชิ้นงาน
        </p>
      </div>
    )
  }

  return (
    <div className="missai-card rounded-3xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-2">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-400" />
          {result.type === 'video' ? 'วิดีโอเคลื่อนไหวจำลองสำเร็จ' : 'ภาพร่างระบบประมวลผลเสร็จสิ้น'}
        </h2>

        <button
          type="button"
          onClick={() => onSaveToStudio(result.response)}
          className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 px-4 py-2.5 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
          title="บันทึกโครงร่างลงระบบสตูดิโอ"
        >
          <BookOpen size={13} />
          บันทึกโครงร่างเข้าระบบสตูดิโอ
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-12">
        <div className="sm:col-span-5 space-y-4">
          {result.type === 'video' ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#2e2e44] bg-[#080a1a] flex flex-col justify-between shadow-2xl">
              <div className="p-3 flex items-center justify-between text-[9px] font-mono font-semibold text-[#6b7280] z-10">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  [REC] 00:0{videoDuration}
                </span>
                <span>{videoTemplate.toUpperCase()}</span>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center rounded-lg">
                  <img
                    src={result.url}
                    alt="Video frame preview"
                    className={`h-full w-full object-cover transition-all duration-700 ${
                      isPlaying ? 'scale-105 saturate-[1.1] blur-[0.5px]' : 'scale-100'
                    }`}
                  />

                  {isPlaying && (
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-purple-900/10 via-transparent to-cyan-950/10 z-0">
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

              <div className="p-3 bg-[#080a1a]/95 backdrop-blur-md border-t border-white/10 flex flex-col gap-2.5 z-10">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-gradient-to-r from-[#ac4bff] to-cyan-400 transition-all duration-100"
                    style={{ width: `${playProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((playing) => !playing)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                      title={isPlaying ? 'หยุดชั่วคราว' : 'เล่น'}
                      aria-label={isPlaying ? 'หยุดชั่วคราว' : 'เล่น'}
                    >
                      {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <span>0:0{Math.floor((playProgress / 100) * videoDuration)} / 0:0{videoDuration}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[9px] uppercase tracking-wider text-[#ac4bff]">
                    {videoDuration}s Loop
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#080a1a] relative shadow-inner">
              {result.url ? (
                <img
                  src={result.url}
                  alt={result.response.draft.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-[#6b7280] text-xs p-4 text-center">
                  <ImageIcon size={42} className="mb-2 text-white/10" />
                  โครงร่างจำลองกรณีไม่เชื่อมต่ออินเทอร์เน็ต
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl bg-[#080a1a]/40 border border-white/10 p-4 text-[11px] font-semibold text-slate-400 space-y-2 leading-relaxed">
            <p>⚡ รูปแบบสื่อ: <span className="text-white">{result.type === 'video' ? 'วิดีโอความยาวสั่นไหวระดับสูง' : 'ภาพร่างระบบเดี่ยว'}</span></p>
            {result.type === 'video' && <p>🎬 ทิศทางมุมกล้อง: <span className="text-white">{result.motionTemplate}</span></p>}
            <p className="line-clamp-3">📝 คำอธิบายภาพรวม: <span className="text-white font-mono">{result.prompt}</span></p>
          </div>
        </div>

        <div className="sm:col-span-7 space-y-5 max-h-[35rem] overflow-y-auto pr-1">
          <div>
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">ชื่อตัวละครร่างระบบ</span>
            <p className="text-xl font-black text-white mt-1">{result.response.draft.name}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">คำอธิบายภาพลักษณ์</span>
            <p className="text-xs font-medium leading-relaxed text-slate-400 mt-1">{result.response.draft.description}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">ข้อความทักทายแรกสุด</span>
            <p className="text-xs font-medium leading-relaxed border-l-2 border-[#ac4bff] bg-[#ac4bff]/10 p-3 rounded-r-xl text-[#d9b3ff] mt-1">
              "{result.response.draft.greeting}"
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                บริบทความจำเป็นระบบ (System Prompt)
              </span>
              <button
                type="button"
                onClick={onCopySystemPrompt}
                className="text-[10px] font-semibold text-[#ac4bff] hover:text-[#c084fc] flex items-center gap-1 transition-all"
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
            <pre className="text-[11px] font-mono leading-relaxed text-slate-400 bg-[#080a1a] p-3.5 rounded-xl border border-white/10 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {result.response.draft.systemPrompt}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
