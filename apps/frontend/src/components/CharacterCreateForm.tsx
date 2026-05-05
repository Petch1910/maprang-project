import { useState } from 'react'
import { uploadAvatar, type CharacterInput } from '../lib/api'
import { analyzeTags } from '../lib/tagAnalysis'
import { RelationshipPreviewPanel } from './RelationshipPreviewPanel'
import { RelationshipPresetPicker } from './RelationshipPresetPicker'

type CharacterCreateFormProps = {
  isSaving: boolean
  onCreate: (input: CharacterInput) => Promise<void>
}

const inputClass =
  'min-h-10 rounded-xl border border-slate-900/15 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'
const textareaClass =
  'min-h-20 resize-y rounded-xl border border-slate-900/15 bg-white px-3 py-2 text-sm font-normal leading-relaxed text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'

const emptyCharacter = {
  name: '',
  avatarUrl: '',
  tagline: '',
  description: '',
  biography: '',
  scenario: '',
  systemPrompt: '',
  compactPrompt: '',
  characterAnchor: '',
  constraints: '',
  greeting: '',
  tags: 'roleplay, thai',
}

export function CharacterCreateForm({ isSaving, onCreate }: CharacterCreateFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(emptyCharacter)
  const [note, setNote] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const update = (field: keyof typeof emptyCharacter, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }
  const tagAnalysis = analyzeTags(form.tags)

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return
    setIsUploading(true)
    try {
      const uploaded = await uploadAvatar(file)
      update('avatarUrl', uploaded.url)
    } finally {
      setIsUploading(false)
    }
  }

  const submit = async () => {
    setNote('')
    await onCreate({
      name: form.name.trim(),
      avatarUrl: form.avatarUrl.trim() || null,
      tagline: form.tagline.trim() || null,
      description: form.description.trim() || null,
      biography: form.biography.trim() || null,
      scenario: form.scenario.trim() || null,
      systemPrompt: form.systemPrompt.trim(),
      compactPrompt: form.compactPrompt.trim() || null,
      characterAnchor: form.characterAnchor.trim() || null,
      constraints: form.constraints.trim() || null,
      greeting: form.greeting.trim() || null,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      visibility: 'PRIVATE',
      status: 'DRAFT',
    })
    setForm(emptyCharacter)
    setNote('สร้างตัวละครใหม่แล้ว')
    setIsOpen(false)
  }

  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <button
        className="flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-900/10 bg-slate-50 px-3 text-left text-sm font-extrabold text-slate-900 transition hover:bg-white"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span>สร้างตัวละครใหม่</span>
        <span className="text-lg leading-none">{isOpen ? '-' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 flex flex-col gap-3">
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="ชื่อตัวละคร"
          />
          <input
            className={inputClass}
            value={form.avatarUrl}
            onChange={(event) => update('avatarUrl', event.target.value)}
            placeholder="Avatar URL"
          />
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className={inputClass}
            disabled={isUploading}
            onChange={(event) => void handleAvatarFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <input
            className={inputClass}
            value={form.tagline}
            onChange={(event) => update('tagline', event.target.value)}
            placeholder="Tagline สั้น ๆ"
          />
          <textarea
            className={textareaClass}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="คำอธิบายตัวละคร"
          />
          <textarea
            className={textareaClass}
            value={form.greeting}
            onChange={(event) => update('greeting', event.target.value)}
            placeholder="ข้อความทักทาย"
          />
          <textarea
            className={`${textareaClass} min-h-32`}
            value={form.systemPrompt}
            onChange={(event) => update('systemPrompt', event.target.value)}
            placeholder="System prompt / personality"
          />
          <textarea
            className={textareaClass}
            value={form.scenario}
            onChange={(event) => update('scenario', event.target.value)}
            placeholder="ฉากเริ่มต้น"
          />
          <input
            className={inputClass}
            value={form.tags}
            onChange={(event) => update('tags', event.target.value)}
            placeholder="tags คั่นด้วย comma"
          />
          <div className="rounded-lg border border-slate-900/10 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <p className="m-0 font-bold text-slate-900">
              discovery {tagAnalysis.discovery.length}, engine {tagAnalysis.engine.length}, safety{' '}
              {tagAnalysis.safety.length}
            </p>
            {tagAnalysis.unknown.length > 0 && <p className="mt-1 mb-0">unknown: {tagAnalysis.unknown.join(', ')}</p>}
            {tagAnalysis.issues.map((issue) => (
              <p
                className={`mt-1 mb-0 font-bold ${issue.level === 'danger' ? 'text-red-700' : 'text-amber-700'}`}
                key={issue.message}
              >
                {issue.message}
              </p>
            ))}
          </div>
          <RelationshipPresetPicker tags={form.tags} onApply={(tags) => update('tags', tags)} />
          <RelationshipPreviewPanel tags={form.tags} />

          <button
            className="min-h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
            onClick={submit}
            disabled={isSaving || !form.name.trim() || !form.systemPrompt.trim()}
          >
            {isSaving ? 'กำลังสร้าง...' : 'สร้างเป็น Draft'}
          </button>
        </div>
      )}

      {note && <p className="mt-2 mb-0 text-xs font-bold text-green-700">{note}</p>}
    </section>
  )
}
