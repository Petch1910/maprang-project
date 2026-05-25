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
    <div className="rounded-lg border border-slate-900/10 bg-white p-3 text-xs leading-relaxed text-slate-600">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-slate-900">พรีวิวสำหรับครีเอเตอร์</strong>
        <button type="button"
          className="min-h-8 rounded-full border border-slate-900/10 bg-slate-50 px-3 font-bold text-slate-700 transition hover:bg-white disabled:opacity-60"
          aria-disabled={isLoading}
          disabled={isLoading}
          onClick={runPreview}
          title={previewDisabledReason || 'ทดสอบความสัมพันธ์ 5 เทิร์น'}
        >
          {isLoading ? 'กำลังจำลอง...' : 'ทดสอบ 5 เทิร์น'}
        </button>
      </div>
      <textarea
        className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-900/15 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15"
        value={script}
        onChange={(event) => setScript(event.target.value)}
        placeholder="ใส่ข้อความจำลองของผู้ใช้ บรรทัดละ 1 เทิร์น"
      />

      {error && <p className="mt-2 mb-0 rounded-lg bg-red-50 p-2 font-bold text-red-700">{error}</p>}

      {preview && (
        <div className="mt-2 space-y-2">
          <p className="m-0 font-bold text-slate-900">
            seed: {relationshipStatusLabel(preview.seed.status)} / {preview.seed.arcStage} / {relationshipTierLabel(preview.seed.tier)} / {preview.seed.tone}
          </p>
          {preview.validationIssues.map((issue) => (
            <p
              className={`m-0 font-bold ${issue.level === 'danger' ? 'text-red-700' : 'text-amber-700'}`}
              key={issue.code}
            >
              {issue.message}
            </p>
          ))}
          {preview.turns.map((turn) => (
            <div className="rounded-lg bg-slate-50 p-2" key={turn.turn}>
              <strong className="text-slate-900">เทิร์น {turn.turn}</strong>
              <p className="m-0">{turn.message}</p>
              <p className="m-0">
                {relationshipStatusLabel(turn.status)} / {relationshipTierLabel(turn.tier)} / {turn.tone} | ผูกพัน {turn.stats.affinity}, ไว้ใจ {turn.stats.trust}
              </p>
              {turn.events.length > 0 && <p className="m-0">จังหวะเรื่อง: {turn.events.map((event) => event.label).join(', ')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
