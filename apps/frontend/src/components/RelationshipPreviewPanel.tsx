import { useState } from 'react'
import { previewRelationship, type RelationshipPreview } from '../lib/api'
import { parseTags } from '../lib/tagAnalysis'

export function RelationshipPreviewPanel({ tags }: { tags: string }) {
  const [preview, setPreview] = useState<RelationshipPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [script, setScript] = useState(
    'Hi, I want to know you better.\nThank you for telling me that. I trust you.\nIf you are not ready, that is okay.',
  )

  const runPreview = async () => {
    setIsLoading(true)
    try {
      const messages = script
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5)
      const data = await previewRelationship(parseTags(tags), messages)
      setPreview(data.preview)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-900/10 bg-white p-3 text-xs leading-relaxed text-slate-600">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-slate-900">Creator preview</strong>
        <button
          className="min-h-8 rounded-full border border-slate-900/10 bg-slate-50 px-3 font-bold text-slate-700 transition hover:bg-white disabled:opacity-60"
          disabled={isLoading}
          onClick={runPreview}
          type="button"
        >
          {isLoading ? 'simulating...' : 'simulate 5 turns'}
        </button>
      </div>
      <textarea
        className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-900/15 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15"
        value={script}
        onChange={(event) => setScript(event.target.value)}
        placeholder="One simulated user turn per line"
      />

      {preview && (
        <div className="mt-2 space-y-2">
          <p className="m-0 font-bold text-slate-900">
            seed: {preview.seed.status} / {preview.seed.arcStage} / {preview.seed.tier} / {preview.seed.tone}
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
              <strong className="text-slate-900">turn {turn.turn}</strong>
              <p className="m-0">{turn.message}</p>
              <p className="m-0">
                {turn.status} / {turn.tier} / {turn.tone} | aff {turn.stats.affinity}, trust {turn.stats.trust}
              </p>
              {turn.events.length > 0 && <p className="m-0">hooks: {turn.events.map((event) => event.label).join(', ')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
