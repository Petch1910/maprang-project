import { useEffect, useState } from 'react'
import { fetchRelationshipPresets, shouldLogUnexpectedError, type RelationshipPreset } from '../lib/api'
import { parseTags } from '../lib/tagAnalysis'

export function RelationshipPresetPicker({
  tags,
  onApply,
}: {
  tags: string
  onApply: (tags: string) => void
}) {
  const [presets, setPresets] = useState<RelationshipPreset[]>([])
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    fetchRelationshipPresets()
      .then((data) => setPresets(data.presets))
      .catch((error) => {
        if (shouldLogUnexpectedError(error)) console.error('โหลดพรีเซ็ตความสัมพันธ์ไม่สำเร็จ:', error)
      })
  }, [])

  const selected = presets.find((preset) => preset.id === selectedId)
  const applyPreset = () => {
    if (!selected) return

    const merged = [...new Set([...parseTags(tags), ...selected.tags])]
    onApply(merged.join(', '))
  }

  return (
    <div className="rounded-lg border border-slate-900/10 bg-white p-3 text-xs leading-relaxed text-slate-600">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-slate-900">พรีเซ็ตความสัมพันธ์</strong>
        <button type="button"
          className="min-h-8 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 font-bold text-blue-700 transition hover:bg-blue-600/15 disabled:opacity-60"
          disabled={!selected}
          onClick={applyPreset}
        >
          ใช้พรีเซ็ต
        </button>
      </div>
      <select
        className="min-h-9 w-full rounded-lg border border-slate-900/15 bg-white px-2 text-xs font-bold text-slate-800 outline-none"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
      >
        <option value="">เลือกพรีเซ็ต</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      {selected && (
        <div className="mt-2">
          <p className="m-0">{selected.description}</p>
          <p className="mt-1 mb-0 font-bold text-slate-500">{selected.tags.join(', ')}</p>
        </div>
      )}
    </div>
  )
}
