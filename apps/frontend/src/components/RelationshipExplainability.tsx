import type { ChatRuntimeState } from '../lib/api'
import { relationshipStatusLabel, relationshipTierLabel } from '../lib/relationshipLabels'
import { analyzeTags } from '../lib/tagAnalysis'

export function RelationshipExplainability({
  runtimeState,
  tags,
}: {
  runtimeState: ChatRuntimeState | null
  tags: string[]
}) {
  const tagAnalysis = runtimeState?.relationshipState.tagProfile ?? analyzeTags(tags)
  const relationship = runtimeState?.relationshipState
  const scene = runtimeState?.sceneState

  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">ดีบักระบบ</p>
          <h2 className="m-0 text-lg font-bold text-slate-900">เหตุผลของความสัมพันธ์</h2>
        </div>
        {scene && (
          <span className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-1.5 text-xs font-bold text-blue-700">
            {scene.mode}
          </span>
        )}
      </div>

      <div className="grid gap-2 text-xs leading-relaxed text-slate-600">
        <TagRow label="ค้นหา" values={tagAnalysis.discovery} />
        <TagRow label="ระบบ" values={tagAnalysis.engine} />
        <TagRow label="ความปลอดภัย" values={tagAnalysis.safety} />
        <TagRow label="ยังไม่รู้จัก" values={tagAnalysis.unknown} />
      </div>

      {relationship && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            ['ผูกพัน', relationship.affinity],
            ['ไว้ใจ', relationship.trust],
            ['ใกล้ชิด', relationship.intimacy],
            ['นำเกม', relationship.dominance],
            ['กลัว', relationship.fear],
            ['เคารพ', relationship.respect],
          ].map(([label, value]) => (
            <div className="rounded-lg border border-slate-900/10 bg-slate-50 px-2 py-2" key={label}>
              <strong className="block text-slate-900">{value}</strong>
              <span className="text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      {relationship && (
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
          <p className="m-0">
            <strong className="text-slate-900">{relationshipStatusLabel(relationship.status)}</strong> / {relationship.arcStage} /{' '}
            {relationshipTierLabel(relationship.tier)} / โทน{' '}
            {relationship.tone}
          </p>
          {relationship.constraints.length > 0 && <p className="m-0">ข้อคุมระบบ: {relationship.constraints.join(', ')}</p>}
          {relationship.events.length > 0 && (
            <p className="m-0">hook: {relationship.events.map((event) => event.label).join(', ')}</p>
          )}
          {scene?.pendingEvents.length ? (
            <p className="m-0">ฉากที่รออยู่: {scene.pendingEvents.map((event) => event.title).join(', ')}</p>
          ) : null}
          {scene?.activeScene && <p className="m-0">ฉากที่กำลังเล่น: {scene.activeScene.title}</p>}
          {runtimeState.memory.emotionalMomentum && (
            <p className="m-0">โมเมนตัม: {runtimeState.memory.emotionalMomentum.direction}</p>
          )}
          {runtimeState.memory.relationshipTimeline?.length ? (
            <div className="space-y-1">
              <strong className="text-slate-900">ไทม์ไลน์</strong>
              {runtimeState.memory.relationshipTimeline.slice(-3).map((entry) => (
                <p className="m-0" key={`${entry.turn}-${entry.label}`}>
                  t{entry.turn} {entry.summary}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <span className="font-bold text-slate-900">{label}: </span>
      <span>{values.length > 0 ? values.join(', ') : '-'}</span>
    </div>
  )
}
