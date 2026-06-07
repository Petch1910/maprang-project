import type { TagAnalysis } from '../lib/tagAnalysis'

type CreatorReadinessPanelProps = {
  analysis: TagAnalysis
}

function scoreReadiness(analysis: TagAnalysis) {
  const dangerCount = analysis.issues.filter((issue) => issue.level === 'danger').length
  if (dangerCount > 0) return { score: 35, label: 'ต้องแก้แท็กขัดแย้ง', color: 'bg-red-500' }
  if (analysis.engine.length >= 2 && analysis.safety.length >= 1) {
    return { score: 92, label: 'พร้อมใช้ระบบความสัมพันธ์', color: 'bg-emerald-500' }
  }
  if (analysis.engine.length >= 1) return { score: 76, label: 'เล่นได้แล้ว', color: 'bg-blue-500' }
  return { score: 58, label: 'ควรเพิ่มแท็กระบบ', color: 'bg-amber-500' }
}

export function CreatorReadinessPanel({ analysis }: CreatorReadinessPanelProps) {
  const readiness = scoreReadiness(analysis)
  const sceneReady = analysis.engine.some((tag) => ['slow-burn', 'rival', 'enemy', 'lover', 'crush'].includes(tag))
  const hasDanger = analysis.issues.some((issue) => issue.level === 'danger')

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/62">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 font-black text-white">ความพร้อมของตัวละคร</p>
          <p className="mt-1 mb-0">{readiness.label}</p>
        </div>
        <span className="text-lg font-black text-white">{readiness.score}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${readiness.color}`} style={{ width: `${readiness.score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <span className="rounded-lg border border-white/10 bg-black/18 px-2 py-1 font-bold">ค้นหา {analysis.discovery.length}</span>
        <span className="rounded-lg border border-white/10 bg-black/18 px-2 py-1 font-bold">ระบบ {analysis.engine.length}</span>
        <span className="rounded-lg border border-white/10 bg-black/18 px-2 py-1 font-bold">ความปลอดภัย {analysis.safety.length}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 font-black ${
            sceneReady ? 'border border-amber-300/25 bg-amber-400/12 text-amber-100' : 'border border-white/10 bg-white/7 text-white/55'
          }`}
        >
          {sceneReady ? 'มีแนวโน้มพร้อมสร้างฉาก' : 'เพิ่มแท็กสำหรับฉาก'}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 font-black ${
            hasDanger ? 'border border-red-300/25 bg-red-500/12 text-red-100' : 'border border-emerald-300/25 bg-emerald-400/12 text-emerald-100'
          }`}
        >
          {hasDanger ? 'บล็อกการเผยแพร่' : 'ไม่มีความขัดแย้งร้ายแรง'}
        </span>
      </div>
    </div>
  )
}
