import type { TagAnalysis } from '../lib/tagAnalysis'

type CreatorReadinessPanelProps = {
  analysis: TagAnalysis
}

function scoreReadiness(analysis: TagAnalysis) {
  const dangerCount = analysis.issues.filter((issue) => issue.level === 'danger').length
  if (dangerCount > 0) return { score: 35, label: 'Needs conflict fix', color: 'bg-red-500' }
  if (analysis.engine.length >= 2 && analysis.safety.length >= 1) {
    return { score: 92, label: 'Relationship ready', color: 'bg-emerald-500' }
  }
  if (analysis.engine.length >= 1) return { score: 76, label: 'Playable route', color: 'bg-blue-500' }
  return { score: 58, label: 'Needs engine tags', color: 'bg-amber-500' }
}

export function CreatorReadinessPanel({ analysis }: CreatorReadinessPanelProps) {
  const readiness = scoreReadiness(analysis)
  const sceneReady = analysis.engine.some((tag) => ['slow-burn', 'rival', 'enemy', 'lover', 'crush'].includes(tag))
  const hasDanger = analysis.issues.some((issue) => issue.level === 'danger')

  return (
    <div className="rounded-lg border border-slate-900/10 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 font-black text-slate-900">Creator readiness</p>
          <p className="mt-1 mb-0">{readiness.label}</p>
        </div>
        <span className="text-lg font-black text-slate-900">{readiness.score}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${readiness.color}`} style={{ width: `${readiness.score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <span className="rounded-lg bg-white px-2 py-1 font-bold">Discovery {analysis.discovery.length}</span>
        <span className="rounded-lg bg-white px-2 py-1 font-bold">Engine {analysis.engine.length}</span>
        <span className="rounded-lg bg-white px-2 py-1 font-bold">Safety {analysis.safety.length}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 font-black ${
            sceneReady ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {sceneReady ? 'Scene hooks likely' : 'Add scene hook tags'}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 font-black ${
            hasDanger ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {hasDanger ? 'Publish blocked' : 'No danger conflict'}
        </span>
      </div>
    </div>
  )
}
