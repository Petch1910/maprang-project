import { useCallback, useEffect, useState } from 'react'
import { fetchRelationshipPresets, logUnexpectedError, type RelationshipPreset } from '../lib/api'
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
  const [isLoading, setIsLoading] = useState(true)
  const [presetError, setPresetError] = useState('')

  const loadPresets = useCallback(() => {
    setIsLoading(true)
    setPresetError('')
    fetchRelationshipPresets('creator')
      .then((data) => {
        setPresets(data.presets)
        setSelectedId((current) => (data.presets.some((preset) => preset.id === current) ? current : ''))
      })
      .catch((error) => {
        setPresets([])
        setSelectedId('')
        setPresetError('โหลดพรีเซ็ตความสัมพันธ์ไม่สำเร็จ')
        logUnexpectedError('โหลดพรีเซ็ตความสัมพันธ์ไม่สำเร็จ:', error)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  const selected = presets.find((preset) => preset.id === selectedId)
  const presetUnavailableReason = isLoading
    ? 'กำลังโหลดพรีเซ็ตความสัมพันธ์'
    : presetError
      ? presetError
      : presets.length === 0
        ? 'ยังไม่มีพรีเซ็ตความสัมพันธ์ให้เลือก'
        : ''
  const applyDisabledReason = selected ? '' : presetUnavailableReason || 'เลือกพรีเซ็ตความสัมพันธ์ก่อนใช้งาน'
  const applyPreset = () => {
    if (!selected) return

    const merged = [...new Set([...parseTags(tags), ...selected.tags])]
    onApply(merged.join(', '))
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/6 p-3 text-xs leading-relaxed text-white/62">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-white">พรีเซ็ตความสัมพันธ์</strong>
        <button type="button"
          className="min-h-8 rounded-full border border-orange-300/25 bg-orange-500/12 px-3 font-bold text-orange-100 transition hover:bg-orange-500/18 disabled:opacity-50"
          aria-disabled={Boolean(applyDisabledReason)}
          disabled={Boolean(applyDisabledReason)}
          onClick={applyPreset}
          title={applyDisabledReason || 'ใช้พรีเซ็ตนี้กับแท็กตัวละคร'}
        >
          ใช้พรีเซ็ต
        </button>
      </div>
      <select
        aria-disabled={Boolean(presetUnavailableReason)}
        className="min-h-9 w-full rounded-lg border border-white/10 bg-[#111116] px-2 text-xs font-bold text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-55"
        data-testid="relationship-preset-picker-select"
        disabled={Boolean(presetUnavailableReason)}
        title={presetUnavailableReason || 'เลือกพรีเซ็ตความสัมพันธ์'}
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
      >
        <option value="">{presetUnavailableReason || 'เลือกพรีเซ็ต'}</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      {presetError && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-300/20 bg-rose-500/10 p-2 text-rose-100">
          <span>{presetError}</span>
          <button
            className="min-h-8 rounded-full border border-rose-200/25 px-3 font-black text-rose-50 transition hover:bg-rose-200/10"
            onClick={loadPresets}
            type="button"
          >
            ลองโหลดใหม่
          </button>
        </div>
      )}
      {!isLoading && !presetError && presets.length === 0 && (
        <p className="mt-2 mb-0 rounded-lg border border-white/10 bg-black/20 p-2 text-white/45">ยังไม่มีพรีเซ็ตความสัมพันธ์ให้เลือก</p>
      )}
      {selected && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
          <p className="m-0">{selected.description}</p>
          <p className="mt-1 mb-0 font-bold text-orange-100/70">{selected.tags.join(', ')}</p>
        </div>
      )}
    </div>
  )
}
