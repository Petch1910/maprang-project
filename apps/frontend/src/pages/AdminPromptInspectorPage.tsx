import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Diff,
  FileSearch,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import {
  ApiError,
  clearAdminApiKey,
  fetchCharacters,
  inspectAdminPrompt,
  setAdminApiKey,
  shouldLogUnexpectedError,
  type Character,
  type PromptInspectorDiff,
  type PromptInspectorResponse,
  type PromptInspectorSection,
} from '../lib/api'

const defaultMessage =
  'ช่วยตอบฉากนี้ให้มีรายละเอียดมากขึ้น คงบุคลิกเดิม ใช้บรรยากาศ ความรู้สึก และทิ้งจังหวะให้ผู้เล่นตอบต่อ'
const defaultCompareMessage = 'สวัสดี วันนี้เธอเป็นยังไงบ้าง'
const defaultRuntimeNote =
  'ตรวจว่า runtime memory, relationship state, scene state และ lore ถูกวางใน prompt อย่างเหมาะสมก่อนยิงโมเดลจริง'

function getStoredAdminKey() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('maprang:adminKey') || ''
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return 'ต้องบันทึก ADMIN_API_KEY ก่อนตรวจพรอมป์'
  }
  if (error instanceof ApiError && error.status === 404) return 'ไม่พบตัวละครที่เลือก'
  return 'ตรวจพรอมป์ไม่สำเร็จ ลองรีเฟรชตัวละครหรือเช็ค backend'
}

function diffStatusLabel(status: PromptInspectorDiff['changedSections'][number]['status']) {
  if (status === 'added') return 'เพิ่ม'
  if (status === 'removed') return 'หายไป'
  return 'เปลี่ยน'
}

function diffStatusClass(status: PromptInspectorDiff['changedSections'][number]['status']) {
  if (status === 'added') return 'bg-emerald-50 text-emerald-800'
  if (status === 'removed') return 'bg-rose-50 text-rose-800'
  return 'bg-sky-50 text-sky-800'
}

function signedDelta(value: number) {
  if (value > 0) return `+${value.toLocaleString()}`
  return value.toLocaleString()
}

function StatCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'amber' | 'sky' | 'emerald' }) {
  const toneClass = {
    amber: 'border-amber-500/20 bg-amber-50 text-amber-950',
    emerald: 'border-emerald-500/20 bg-emerald-50 text-emerald-950',
    sky: 'border-sky-500/20 bg-sky-50 text-sky-950',
    slate: 'border-slate-900/10 bg-white text-slate-950',
  }[tone]

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="m-0 text-xs font-black tracking-widest uppercase opacity-70">{label}</p>
      <p className="m-0 mt-2 text-2xl font-black tracking-normal">{value}</p>
    </article>
  )
}

function SectionBudget({ section, maxTokens }: { section: PromptInspectorSection; maxTokens: number }) {
  const width = maxTokens > 0 ? Math.min(100, Math.max(4, (section.estimatedTokens / maxTokens) * 100)) : 4

  return (
    <details className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm" data-testid="prompt-inspector-section">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="m-0 text-sm font-black text-slate-950">
              {section.index + 1}. {section.title}
            </p>
            <p className="m-0 mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{section.preview}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
              {section.estimatedTokens.toLocaleString()} โทเคน
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
              {section.chars.toLocaleString()} ตัวอักษร
            </span>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-linear-to-r from-amber-500 to-sky-500" style={{ width: `${width}%` }} />
        </div>
      </summary>
      <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
        {section.content}
      </pre>
    </details>
  )
}

function DiffPanel({ diff }: { diff?: PromptInspectorDiff }) {
  if (!diff) {
    return (
      <div className="rounded-2xl border border-slate-900/10 bg-white p-4 text-sm font-bold text-slate-500 shadow-sm">
        ใส่ข้อความก่อนหน้าเพื่อดูการเทียบพรอมป์
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm" data-testid="prompt-inspector-diff">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
            <Diff size={17} />
            เทียบพรอมป์
          </p>
          <p className="m-0 mt-1 text-xs font-bold text-slate-500">
            เดิม {diff.previousEstimatedTokens.toLocaleString()} / ปัจจุบัน {diff.currentEstimatedTokens.toLocaleString()} โทเคน
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-900">
          {signedDelta(diff.estimatedTokenDelta)} โทเคน
        </span>
      </div>

      {diff.changedSections.length === 0 ? (
        <p className="m-0 mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">โครงพรอมป์ไม่เปลี่ยน</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {diff.changedSections.map((section) => (
            <article className="rounded-xl border border-slate-900/10 bg-slate-50 p-3" key={`${section.index}-${section.title}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-black text-slate-950">{section.title}</p>
                  <p className="m-0 mt-1 text-xs font-bold text-slate-500">
                    ตัวอักษร {signedDelta(section.charDelta)} / โทเคน {signedDelta(section.estimatedTokenDelta)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${diffStatusClass(section.status)}`}>
                  {diffStatusLabel(section.status)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function AdminPromptInspectorPage() {
  const [adminKeyInput, setAdminKeyInput] = useState(getStoredAdminKey)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [message, setMessage] = useState(defaultMessage)
  const [compareWithMessage, setCompareWithMessage] = useState(defaultCompareMessage)
  const [runtimeNote, setRuntimeNote] = useState(defaultRuntimeNote)
  const [userPersona, setUserPersona] = useState('')
  const [includeSavedPersona, setIncludeSavedPersona] = useState(true)
  const [result, setResult] = useState<PromptInspectorResponse | null>(null)
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false)
  const [isInspecting, setIsInspecting] = useState(false)
  const [note, setNote] = useState('เลือกตัวละครและข้อความที่อยากตรวจ')

  const hasAdminKey = adminKeyInput.trim().length > 0
  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId) ?? null
  const maxSectionTokens = useMemo(
    () => Math.max(0, ...(result?.snapshot.sections.map((section) => section.estimatedTokens) ?? [0])),
    [result],
  )

  const loadCharacters = useCallback(async () => {
    setIsLoadingCharacters(true)
    try {
      const data = await fetchCharacters({ view: 'admin', sort: 'newest', limit: 50 })
      const rows = data.characters ?? []
      setCharacters(rows)
      setSelectedCharacterId((current) => current || rows[0]?.id || '')
      setNote(rows.length > 0 ? `โหลดตัวละครแล้ว ${rows.length} รายการ` : 'ยังไม่มีตัวละครให้ตรวจ')
    } catch (error) {
      if (shouldLogUnexpectedError(error)) console.error('Load prompt inspector characters error:', error)
      setCharacters([])
      setSelectedCharacterId('')
      setNote('โหลดตัวละครไม่สำเร็จ')
    } finally {
      setIsLoadingCharacters(false)
    }
  }, [])

  useEffect(() => {
    void loadCharacters()
  }, [loadCharacters])

  function saveAdminKey() {
    const key = adminKeyInput.trim()
    if (!key) {
      clearAdminApiKey()
      setAdminKeyInput('')
      setNote('ล้าง ADMIN_API_KEY แล้ว')
      return
    }
    setAdminApiKey(key)
    setAdminKeyInput(key)
    setNote('บันทึก ADMIN_API_KEY แล้ว')
  }

  function clearKey() {
    clearAdminApiKey()
    setAdminKeyInput('')
    setNote('ล้าง ADMIN_API_KEY แล้ว')
  }

  async function inspectPrompt() {
    const trimmedMessage = message.trim()
    if (!selectedCharacterId || !trimmedMessage) {
      setNote('ต้องเลือกตัวละครและใส่ข้อความก่อนตรวจ')
      return
    }

    setIsInspecting(true)
    try {
      const data = await inspectAdminPrompt({
        characterId: selectedCharacterId,
        message: trimmedMessage,
        compareWithMessage: compareWithMessage.trim() || undefined,
        includeSavedPersona,
        runtimeNote: runtimeNote.trim() || undefined,
        userPersona: userPersona.trim() || undefined,
      })
      setResult(data)
      setNote(`ตรวจแล้ว ${data.snapshot.totals.sectionCount} ส่วน / ${data.snapshot.totals.estimatedTokens.toLocaleString()} โทเคน`)
    } catch (error) {
      if (shouldLogUnexpectedError(error)) console.error('Inspect prompt error:', error)
      setResult(null)
      setNote(apiErrorMessage(error))
    } finally {
      setIsInspecting(false)
    }
  }

  async function copyPrompt() {
    if (!result?.snapshot.prompt || typeof navigator === 'undefined' || !navigator.clipboard) return
    await navigator.clipboard.writeText(result.snapshot.prompt)
    setNote('คัดลอก redacted prompt แล้ว')
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
              <FileSearch size={16} />
              ตัวตรวจพรอมป์
            </p>
            <h1 className="m-0 mt-2 text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">ตรวจพรอมป์ก่อนยิงโมเดล</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              ตรวจ snapshot พรอมป์, งบโทเคน, lore ที่ดึงมาใช้ และ diff ของ context เพื่อหาสาเหตุเวลาบอทตอบสั้นหรือหลุดบุคลิก
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:w-[560px]">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-black text-slate-500">ADMIN_API_KEY</span>
              <input
                className="min-h-11 w-full rounded-xl border border-slate-900/10 px-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
                data-testid="prompt-inspector-admin-key-input"
                onChange={(event) => setAdminKeyInput(event.target.value)}
                placeholder="วางคีย์ผู้ดูแล"
                type="password"
                value={adminKeyInput}
              />
            </label>
            <button
              className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              data-testid="prompt-inspector-admin-key-save"
              onClick={saveAdminKey}
              type="button"
            >
              <KeyRound size={16} />
              บันทึก
            </button>
            <button
              className="mt-auto min-h-11 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              onClick={clearKey}
              type="button"
            >
              ล้าง
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600" data-testid="prompt-inspector-note">
            {note}
          </p>
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
              hasAdminKey ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
            }`}
          >
            {hasAdminKey ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {hasAdminKey ? 'พร้อมเรียก admin API' : 'ต้องใช้ ADMIN_API_KEY'}
          </span>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          className="space-y-4 rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault()
            void inspectPrompt()
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 text-sm font-black text-slate-950">ข้อมูลตรวจ</p>
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              disabled={isLoadingCharacters}
              onClick={() => void loadCharacters()}
              type="button"
            >
              <RefreshCw size={14} />
              รีเฟรช
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-500">ตัวละคร</span>
            <select
              className="min-h-11 w-full rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
              data-testid="prompt-inspector-character-select"
              disabled={isLoadingCharacters || characters.length === 0}
              onChange={(event) => setSelectedCharacterId(event.target.value)}
              value={selectedCharacterId}
            >
              {characters.length === 0 ? (
                <option value="">ไม่มีตัวละคร</option>
              ) : (
                characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))
              )}
            </select>
          </label>

          {selectedCharacter && (
            <div className="rounded-xl border border-slate-900/10 bg-slate-50 p-3">
              <p className="m-0 text-sm font-black text-slate-950">{selectedCharacter.name}</p>
              <p className="m-0 mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500">
                {selectedCharacter.tagline || selectedCharacter.description || 'ยังไม่มีคำโปรย'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedCharacter.tags.slice(0, 8).map((tag) => (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-500">ข้อความปัจจุบัน</span>
            <textarea
              className="min-h-32 w-full resize-y rounded-xl border border-slate-900/10 px-3 py-3 text-sm font-bold leading-6 text-slate-700 outline-none focus:border-amber-500"
              data-testid="prompt-inspector-message"
              onChange={(event) => setMessage(event.target.value)}
              value={message}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-500">ข้อความก่อนหน้า</span>
            <textarea
              className="min-h-24 w-full resize-y rounded-xl border border-slate-900/10 px-3 py-3 text-sm font-bold leading-6 text-slate-700 outline-none focus:border-amber-500"
              data-testid="prompt-inspector-compare"
              onChange={(event) => setCompareWithMessage(event.target.value)}
              value={compareWithMessage}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-500">Runtime note</span>
            <textarea
              className="min-h-24 w-full resize-y rounded-xl border border-slate-900/10 px-3 py-3 text-sm font-bold leading-6 text-slate-700 outline-none focus:border-amber-500"
              data-testid="prompt-inspector-runtime-note"
              onChange={(event) => setRuntimeNote(event.target.value)}
              value={runtimeNote}
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-900/10 bg-slate-50 p-3">
            <input
              checked={includeSavedPersona}
              className="mt-1 size-4"
              onChange={(event) => setIncludeSavedPersona(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-black text-slate-950">แนบ persona ที่บันทึกไว้</span>
              <span className="block text-xs font-bold leading-5 text-slate-500">ใช้ค่า server ถ้าไม่ได้กรอก persona override ด้านล่าง</span>
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-slate-500">Persona override</span>
            <textarea
              className="min-h-24 w-full resize-y rounded-xl border border-slate-900/10 px-3 py-3 text-sm font-bold leading-6 text-slate-700 outline-none focus:border-amber-500"
              data-testid="prompt-inspector-user-persona"
              onChange={(event) => setUserPersona(event.target.value)}
              placeholder="เว้นว่างเพื่อใช้ persona ที่บันทึกไว้"
              value={userPersona}
            />
          </label>

          <button
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-black text-white transition hover:bg-orange-600 disabled:opacity-60"
            data-testid="prompt-inspector-submit"
            disabled={isInspecting || !hasAdminKey || !selectedCharacterId || !message.trim()}
            type="submit"
          >
            {isInspecting ? <Loader2 className="animate-spin" size={17} /> : <FileSearch size={17} />}
            ตรวจพรอมป์
          </button>
        </form>

        <div className="space-y-5">
          {result ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="ส่วนพรอมป์" value={result.snapshot.totals.sectionCount.toLocaleString()} tone="sky" />
                <StatCard label="โทเคนโดยประมาณ" value={result.snapshot.totals.estimatedTokens.toLocaleString()} tone="amber" />
                <StatCard label="ตัวอักษร" value={result.snapshot.totals.chars.toLocaleString()} />
                <StatCard label="Lore ที่ใช้" value={result.snapshot.retrieval.loreCount.toLocaleString()} tone="emerald" />
              </section>

              {result.snapshot.warnings.length > 0 && (
                <section className="rounded-2xl border border-amber-500/25 bg-amber-50 p-4 text-amber-950 shadow-sm">
                  <p className="m-0 flex items-center gap-2 text-sm font-black">
                    <AlertTriangle size={17} />
                    คำเตือน
                  </p>
                  <ul className="m-0 mt-3 grid gap-2 pl-5 text-sm font-bold leading-6">
                    {result.snapshot.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              )}

              <DiffPanel diff={result.diff} />

              <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
                      <ShieldCheck size={17} />
                      Redacted final prompt
                    </p>
                    <p className="m-0 mt-1 text-xs font-bold text-slate-500">
                      สร้างเมื่อ {new Date(result.snapshot.generatedAt).toLocaleString('th-TH')}
                    </p>
                  </div>
                  <button
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    onClick={() => void copyPrompt()}
                    type="button"
                  >
                    <Clipboard size={14} />
                    คัดลอก
                  </button>
                </div>
                <pre
                  className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100"
                  data-testid="prompt-inspector-output"
                >
                  {result.snapshot.prompt}
                </pre>
              </section>

              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-black text-slate-950">Section budget</p>
                    <p className="m-0 mt-1 text-xs font-bold text-slate-500">เปิดแต่ละ section เพื่อดูข้อความที่ถูกส่งเข้าพรอมป์</p>
                  </div>
                </div>
                {result.snapshot.sections.map((section) => (
                  <SectionBudget key={`${section.index}-${section.fingerprint}`} maxTokens={maxSectionTokens} section={section} />
                ))}
              </section>

              <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
                <p className="m-0 text-sm font-black text-slate-950">Lore ที่ดึงมาใช้</p>
                {result.snapshot.retrieval.lore.length === 0 ? (
                  <p className="m-0 mt-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500">ไม่มี lore ที่ถูกดึงมาใช้ในรอบนี้</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {result.snapshot.retrieval.lore.map((entry) => (
                      <article className="rounded-xl border border-slate-900/10 bg-slate-50 p-3" key={`${entry.keyword}-${entry.priority}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="m-0 text-sm font-black text-slate-950">{entry.keyword}</p>
                            <p className="m-0 mt-1 text-xs font-bold leading-5 text-slate-500">{entry.preview}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
                            priority {entry.priority}
                          </span>
                        </div>
                        {entry.aliases.length > 0 && (
                          <p className="m-0 mt-2 text-xs font-bold text-slate-400">aliases: {entry.aliases.join(', ')}</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="grid min-h-[28rem] place-items-center rounded-2xl border border-dashed border-slate-900/15 bg-white p-8 text-center shadow-sm">
              <div className="max-w-sm">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-950 text-white">
                  <FileSearch size={22} />
                </span>
                <h2 className="m-0 mt-4 text-xl font-black text-slate-950">ยังไม่ได้ตรวจพรอมป์</h2>
                <p className="m-0 mt-2 text-sm font-bold leading-6 text-slate-500">
                  เลือกตัวละคร ใส่ข้อความ แล้วกดตรวจ ระบบจะแสดง prompt snapshot และ diff ที่ redact แล้ว
                </p>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}
