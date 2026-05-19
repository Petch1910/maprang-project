import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { uploadAvatar, type Character, type CharacterInput } from '../lib/api'
import { analyzeTags } from '../lib/tagAnalysis'
import { CreatorReadinessPanel } from './CreatorReadinessPanel'
import { RelationshipPreviewPanel } from './RelationshipPreviewPanel'
import { RelationshipPresetPicker } from './RelationshipPresetPicker'

type CharacterManagerProps = {
  character: Character
  isSaving: boolean
  onDelete: () => Promise<void>
  onDuplicate: () => Promise<void>
  onResetPrompt: () => Promise<void>
  onSave: (input: CharacterInput) => Promise<void>
}

const visibilityOptions: Array<CharacterInput['visibility']> = ['PUBLIC', 'UNLISTED', 'PRIVATE']
const statusOptions: Array<CharacterInput['status']> = ['DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED']

const visibilityLabels: Record<NonNullable<CharacterInput['visibility']>, string> = {
  PUBLIC: 'สาธารณะ',
  UNLISTED: 'ไม่แสดงในหน้าค้นหา',
  PRIVATE: 'ส่วนตัว',
}

const statusLabels: Record<NonNullable<CharacterInput['status']>, string> = {
  DRAFT: 'ดราฟต์',
  REVIEW: 'รอตรวจ',
  PUBLISHED: 'เผยแพร่แล้ว',
  REJECTED: 'ถูกปฏิเสธ',
  ARCHIVED: 'เก็บแล้ว',
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  )
}

const inputClass =
  'min-h-10 rounded-xl border border-slate-900/15 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'
const textareaClass =
  'min-h-20 resize-y rounded-xl border border-slate-900/15 bg-white px-3 py-2 text-sm font-normal leading-relaxed text-slate-900 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'

export function CharacterManager({
  character,
  isSaving,
  onDelete,
  onDuplicate,
  onResetPrompt,
  onSave,
}: CharacterManagerProps) {
  const [name, setName] = useState(character.name)
  const [avatarUrl, setAvatarUrl] = useState(character.avatarUrl ?? '')
  const [tagline, setTagline] = useState(character.tagline ?? '')
  const [description, setDescription] = useState(character.description ?? '')
  const [biography, setBiography] = useState(character.biography ?? '')
  const [scenario, setScenario] = useState(character.scenario ?? '')
  const [systemPrompt, setSystemPrompt] = useState(character.systemPrompt)
  const [compactPrompt, setCompactPrompt] = useState(character.compactPrompt ?? '')
  const [characterAnchor, setCharacterAnchor] = useState(character.characterAnchor ?? '')
  const [constraints, setConstraints] = useState(character.constraints ?? '')
  const [greeting, setGreeting] = useState(character.greeting ?? '')
  const [tags, setTags] = useState(character.tags.join(', '))
  const [visibility, setVisibility] = useState<CharacterInput['visibility']>(character.visibility ?? 'PUBLIC')
  const [status, setStatus] = useState<CharacterInput['status']>(character.status ?? 'PUBLISHED')
  const [saveNote, setSaveNote] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setName(character.name)
    setAvatarUrl(character.avatarUrl ?? '')
    setTagline(character.tagline ?? '')
    setDescription(character.description ?? '')
    setBiography(character.biography ?? '')
    setScenario(character.scenario ?? '')
    setSystemPrompt(character.systemPrompt)
    setCompactPrompt(character.compactPrompt ?? '')
    setCharacterAnchor(character.characterAnchor ?? '')
    setConstraints(character.constraints ?? '')
    setGreeting(character.greeting ?? '')
    setTags(character.tags.join(', '))
    setVisibility(character.visibility ?? 'PUBLIC')
    setStatus(character.status ?? 'PUBLISHED')
    setSaveNote('')
  }, [character])

  const tagAnalysis = analyzeTags(tags)
  const hasDangerConflict = tagAnalysis.issues.some((issue) => issue.level === 'danger')

  const handleSubmit = async () => {
    if (hasDangerConflict) return
    setSaveNote('')
    await onSave({
      name: name.trim(),
      avatarUrl: avatarUrl.trim() || null,
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      biography: biography.trim() || null,
      scenario: scenario.trim() || null,
      systemPrompt: systemPrompt.trim(),
      compactPrompt: compactPrompt.trim() || null,
      characterAnchor: characterAnchor.trim() || null,
      constraints: constraints.trim() || null,
      greeting: greeting.trim() || null,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      visibility,
      status,
    })
    setSaveNote('บันทึกตัวละครแล้ว')
  }

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return
    setIsUploading(true)
    try {
      const uploaded = await uploadAvatar(file)
      setAvatarUrl(uploaded.url)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <div className="mb-3">
        <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">จัดการตัวละคร</p>
        <h2 className="m-0 text-lg font-bold text-slate-900">แก้ไข {character.name}</h2>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-slate-900/10 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">เกณฑ์คุณภาพ</span>
            <strong className={`text-sm ${character.qualityNotes?.passes ? 'text-green-700' : 'text-amber-700'}`}>
              {character.qualityScore ?? 0}/100
            </strong>
          </div>
          {character.qualityNotes?.notes?.length ? (
            <p className="mt-2 mb-0 text-xs leading-relaxed text-slate-500">
              {character.qualityNotes.notes.slice(0, 2).join(' ')}
            </p>
          ) : (
            <p className="mt-2 mb-0 text-xs leading-relaxed text-green-700">พร้อมส่งตรวจเพื่อเผยแพร่</p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="ชื่อ">
            <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>

          <Field label="คำโปรย">
            <input className={inputClass} value={tagline} onChange={(event) => setTagline(event.target.value)} />
          </Field>
        </div>

        <Field label="คำอธิบาย">
          <textarea
            className={textareaClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <Field label="ประวัติ">
          <textarea className={textareaClass} value={biography} onChange={(event) => setBiography(event.target.value)} />
        </Field>

        <Field label="ฉากเปิดเรื่อง">
          <textarea className={textareaClass} value={scenario} onChange={(event) => setScenario(event.target.value)} />
        </Field>

        <Field label="ลิงก์รูปตัวละคร">
          <input className={inputClass} value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
        </Field>
        <input
          accept="image/png,image/jpeg,image/webp,image/gif"
          className={inputClass}
          disabled={isUploading}
          onChange={(event) => void handleAvatarFile(event.target.files?.[0] ?? null)}
          type="file"
        />

        <Field label="พรอมป์ระบบ / บุคลิก">
          <textarea
            className={`${textareaClass} min-h-36`}
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
          />
        </Field>

        <Field label="พรอมป์แบบย่อ">
          <textarea
            className={textareaClass}
            value={compactPrompt}
            onChange={(event) => setCompactPrompt(event.target.value)}
          />
        </Field>

        <Field label="แกนหลักของตัวละคร">
          <textarea
            className={textareaClass}
            value={characterAnchor}
            onChange={(event) => setCharacterAnchor(event.target.value)}
          />
        </Field>

        <Field label="ข้อจำกัด">
          <textarea
            className={textareaClass}
            value={constraints}
            onChange={(event) => setConstraints(event.target.value)}
          />
        </Field>

        <Field label="ข้อความทักทาย">
          <textarea className={textareaClass} value={greeting} onChange={(event) => setGreeting(event.target.value)} />
        </Field>

        <Field label="แท็ก">
          <input
            className={inputClass}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="ไทย, ผู้ช่วย, เป็นมิตร"
          />
        </Field>
        <CreatorReadinessPanel analysis={tagAnalysis} />
        <div className="rounded-lg border border-slate-900/10 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <p className="m-0 font-bold text-slate-900">
            แท็ก: ค้นหา {tagAnalysis.discovery.length}, ระบบ {tagAnalysis.engine.length}, ความปลอดภัย {tagAnalysis.safety.length}
          </p>
          {tagAnalysis.unknown.length > 0 && <p className="mt-1 mb-0">แท็กที่ยังไม่รู้จัก: {tagAnalysis.unknown.join(', ')}</p>}
          {tagAnalysis.issues.map((issue) => (
            <p
              className={`mt-1 mb-0 font-bold ${issue.level === 'danger' ? 'text-red-700' : 'text-amber-700'}`}
              key={issue.message}
            >
              {issue.message}
            </p>
          ))}
        </div>
        <RelationshipPresetPicker tags={tags} onApply={setTags} />
        <RelationshipPreviewPanel tags={tags} />

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="การมองเห็น">
            <select
              className={inputClass}
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as CharacterInput['visibility'])}
            >
              {visibilityOptions.map((option) => (
                <option key={option} value={option}>
                  {visibilityLabels[option]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="สถานะ">
            <select
              className={inputClass}
              value={status}
              onChange={(event) => setStatus(event.target.value as CharacterInput['status'])}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button type="button"
          className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition hover:bg-blue-700 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={isSaving || hasDangerConflict || !name.trim() || !systemPrompt.trim()}
        >
          {isSaving ? 'กำลังบันทึก...' : hasDangerConflict ? 'แก้แท็กที่ขัดแย้งก่อน' : 'บันทึกตัวละคร'}
        </button>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button"
            className="min-h-10 rounded-xl border border-slate-900/10 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            onClick={onDuplicate}
            disabled={isSaving}
          >
            ทำสำเนา
          </button>
          <button type="button"
            className="min-h-10 rounded-xl border border-amber-500/25 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
            onClick={onResetPrompt}
            disabled={isSaving}
          >
            รีเซ็ตพรอมป์
          </button>
          <button type="button"
            className="min-h-10 rounded-xl border border-red-500/25 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            onClick={onDelete}
            disabled={isSaving}
          >
            ลบตัวละคร
          </button>
        </div>

        {saveNote && <p className="m-0 text-xs font-bold text-green-700">{saveNote}</p>}
      </div>
    </section>
  )
}
