import { useEffect, useMemo, useState } from 'react'
import type { Character, LoreEntry, LoreInput } from '../lib/api'

type LoreManagerProps = {
  character: Character
  loreEntries: LoreEntry[]
  isLoading: boolean
  isSaving: boolean
  onCreate: (input: LoreInput) => Promise<void>
  onDelete: (loreId: string) => Promise<void>
  onLoad: () => Promise<void>
  onUpdate: (loreId: string, input: Partial<LoreInput>) => Promise<void>
}

const inputClass =
  'min-h-10 rounded-xl border border-slate-900/15 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'
const textareaClass =
  'min-h-20 resize-y rounded-xl border border-slate-900/15 bg-white px-3 py-2 text-sm font-normal leading-relaxed text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'

const emptyForm = {
  keyword: '',
  aliases: '',
  content: '',
  priority: '0',
}

function parseAliases(value: string) {
  return value
    .split(',')
    .map((alias) => alias.trim())
    .filter(Boolean)
}

export function LoreManager({
  character,
  loreEntries,
  isLoading,
  isSaving,
  onCreate,
  onDelete,
  onLoad,
  onUpdate,
}: LoreManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const sortedEntries = useMemo(
    () => [...loreEntries].sort((a, b) => b.priority - a.priority || a.keyword.localeCompare(b.keyword)),
    [loreEntries],
  )

  useEffect(() => {
    setEditingId(null)
    setForm(emptyForm)
    setNote('')
  }, [character.id])

  const updateForm = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const reset = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const submit = async () => {
    const input: LoreInput = {
      keyword: form.keyword.trim(),
      aliases: parseAliases(form.aliases),
      content: form.content.trim(),
      priority: Number.parseInt(form.priority, 10) || 0,
      hierarchyLevel: 0,
      parentLoreId: null,
    }

    setNote('')
    if (editingId) {
      await onUpdate(editingId, input)
      setNote('อัปเดต lore แล้ว')
    } else {
      await onCreate(input)
      setNote('เพิ่ม lore ใหม่แล้ว')
    }
    reset()
  }

  const startEdit = (entry: LoreEntry) => {
    setEditingId(entry.id)
    setForm({
      keyword: entry.keyword,
      aliases: entry.aliases.join(', '),
      content: entry.content,
      priority: String(entry.priority),
    })
    setIsOpen(true)
  }

  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">Lorebook</p>
          <h2 className="m-0 text-lg font-bold text-slate-900">ความรู้ของ {character.name}</h2>
        </div>
        <button type="button"
          className="min-h-8 rounded-full border border-slate-900/10 bg-white px-3 text-xs font-bold text-slate-700"
          onClick={onLoad}
          disabled={isLoading}
        >
          รีเฟรช
        </button>
      </div>

      <button type="button"
        className="mb-3 flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-900/10 bg-slate-50 px-3 text-left text-sm font-extrabold text-slate-900 transition hover:bg-white"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span>{editingId ? 'แก้ lore' : 'เพิ่ม lore'}</span>
        <span className="text-lg leading-none">{isOpen ? '-' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mb-3 flex flex-col gap-3">
          <input
            className={inputClass}
            value={form.keyword}
            onChange={(event) => updateForm('keyword', event.target.value)}
            placeholder="keyword เช่น บ้านเกิด, ความลับ, กฎของโลก"
          />
          <input
            className={inputClass}
            value={form.aliases}
            onChange={(event) => updateForm('aliases', event.target.value)}
            placeholder="aliases คั่นด้วย comma"
          />
          <textarea
            className={textareaClass}
            value={form.content}
            onChange={(event) => updateForm('content', event.target.value)}
            placeholder="รายละเอียด lore ที่ AI ควรรู้"
          />
          <input
            className={inputClass}
            inputMode="numeric"
            value={form.priority}
            onChange={(event) => updateForm('priority', event.target.value)}
            placeholder="priority"
          />
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
              onClick={submit}
              disabled={isSaving || !form.keyword.trim() || !form.content.trim()}
            >
              {isSaving ? 'กำลังบันทึก...' : editingId ? 'บันทึก lore' : 'เพิ่ม lore'}
            </button>
            <button type="button"
              className="min-h-10 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-bold text-slate-700"
              onClick={reset}
              disabled={isSaving}
            >
              ล้างฟอร์ม
            </button>
          </div>
        </div>
      )}

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {sortedEntries.length === 0 && (
          <p className="m-0 rounded-lg border border-dashed border-slate-900/15 bg-white/60 p-3 text-sm leading-relaxed text-slate-500">
            {isLoading ? 'กำลังโหลด lore...' : 'ยังไม่มี lore สำหรับตัวละครนี้'}
          </p>
        )}

        {sortedEntries.map((entry) => (
          <article className="rounded-lg border border-slate-900/10 bg-white/80 p-3" key={entry.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <strong className="truncate text-sm text-slate-900">{entry.keyword}</strong>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {entry.priority}
              </span>
            </div>
            {entry.aliases.length > 0 && (
              <p className="m-0 truncate text-xs text-slate-400">{entry.aliases.join(', ')}</p>
            )}
            <p className="mt-2 mb-3 line-clamp-3 text-xs leading-relaxed text-slate-600">{entry.content}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button"
                className="min-h-8 rounded-lg border border-slate-900/10 bg-white text-xs font-bold text-slate-700"
                onClick={() => startEdit(entry)}
              >
                แก้ไข
              </button>
              <button type="button"
                className="min-h-8 rounded-lg border border-red-500/20 bg-red-50 text-xs font-bold text-red-700"
                onClick={() => onDelete(entry.id)}
                disabled={isSaving}
              >
                ลบ
              </button>
            </div>
          </article>
        ))}
      </div>

      {note && <p className="mt-2 mb-0 text-xs font-bold text-green-700">{note}</p>}
    </section>
  )
}
