import { useState } from 'react'
import { previewRelationship, type RelationshipPreview } from '../lib/api'
import { relationshipStatusLabel, relationshipTierLabel } from '../lib/relationshipLabels'
import { parseTags } from '../lib/tagAnalysis'

export function RelationshipPreviewPanel({
  tags,
  onPreviewComplete,
}: {
  tags: string
  onPreviewComplete?: (preview: RelationshipPreview) => void
}) {
  const [preview, setPreview] = useState<RelationshipPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [script, setScript] = useState(
    'สวัสดี ฉันอยากรู้จักเธอให้มากขึ้น\nขอบคุณที่เล่าให้ฟังนะ ฉันไว้ใจเธอ\nถ้าเธอยังไม่พร้อมก็ไม่เป็นไร',
  )
  const previewDisabledReason = isLoading ? 'กำลังจำลองบทสนทนา รอให้เสร็จก่อน' : ''

  const runPreview = async () => {
    setIsLoading(true)
    setError('')
    try {
      const messages = script
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5)
      const data = await previewRelationship(parseTags(tags), messages)
      setPreview(data.preview)
      onPreviewComplete?.(data.preview)
    } catch {
      setError('ทดสอบบทไม่สำเร็จ กรุณาเช็กเซิร์ฟเวอร์แล้วลองใหม่')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="missai-card rounded-2xl p-4 text-xs leading-relaxed text-slate-400">
      <div className="flex items-center justify-between gap-2">
        <strong className="font-display text-sm font-black text-white">พรีวิวสำหรับครีเอเตอร์</strong>
        <button type="button"
          className="min-h-8 rounded-xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-3.5 font-black text-white hover:brightness-110 transition missai-glow disabled:opacity-60"
          aria-disabled={isLoading}
          disabled={isLoading}
          onClick={runPreview}
          title={previewDisabledReason || 'ทดสอบความสัมพันธ์ 5 เทิร์น'}
        >
          {isLoading ? 'กำลังจำลอง...' : 'ทดสอบ 5 เทิร์น'}
        </button>
      </div>
      <textarea
        className="mt-2.5 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-[#080a1a]/60 px-3.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#ac4bff] focus:ring-4 focus:ring-[#ac4bff]/10"
        value={script}
        onChange={(event) => setScript(event.target.value)}
        placeholder="ใส่ข้อความจำลองของผู้ใช้ บรรทัดละ 1 เทิร์น"
      />

      {error && <p className="mt-2.5 mb-0 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 font-semibold text-rose-300">{error}</p>}

      {preview && (
        <div className="mt-3 space-y-2.5">
          <p className="m-0 font-bold text-white">
            seed: {relationshipStatusLabel(preview.seed.status)} / {preview.seed.arcStage} / {relationshipTierLabel(preview.seed.tier)} / {preview.seed.tone}
          </p>
          {preview.validationIssues.map((issue) => (
            <p
              className={`m-0 font-bold ${issue.level === 'danger' ? 'text-rose-400' : 'text-amber-400'}`}
              key={issue.code}
            >
              {issue.message}
            </p>
          ))}
          {preview.turns.map((turn) => (
            <div className="rounded-xl border border-white/5 bg-[#0b0d1f]/60 p-3.5" key={turn.turn}>
              <strong className="text-white">เทิร์น {turn.turn}</strong>
              <p className="m-0 text-slate-300 mt-1 leading-relaxed">{turn.message}</p>
              <p className="m-0 text-slate-500 mt-1.5">
                {relationshipStatusLabel(turn.status)} / {relationshipTierLabel(turn.tier)} / {turn.tone} | ผูกพัน {turn.stats.affinity}, ไว้ใจ {turn.stats.trust}
              </p>
              {turn.events.length > 0 && <p className="m-0 text-[#d9b3ff] font-semibold mt-1.5">จังหวะเรื่อง: {turn.events.map((event) => event.label).join(', ')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
