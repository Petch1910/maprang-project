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
  logUnexpectedError,
  setAdminApiKey,
  type Character,
  type PromptInspectorDiff,
  type PromptInspectorResponse,
  type PromptInspectorSection,
} from '../lib/api'
import { filterVisibleCharacters } from '../lib/qaSeedVisibility'
import { getSafeClipboard, safeWriteClipboardText } from '../lib/safeClipboard'
import { safeGetStorageItem } from '../lib/safeStorage'

const defaultMessage =
  'ช่วยตอบฉากนี้ให้มีรายละเอียดมากขึ้น คงบุคลิกเดิม ใช้บรรยากาศ ความรู้สึก และทิ้งจังหวะให้ผู้เล่นตอบต่อ'
const defaultCompareMessage = 'สวัสดี วันนี้เธอเป็นยังไงบ้าง'
const defaultRuntimeNote =
  'ตรวจว่าหน่วยความจำระหว่างรัน สถานะความสัมพันธ์ สถานะฉาก และคลังความรู้ถูกวางในพรอมป์อย่างเหมาะสมก่อนยิงโมเดลจริง'

function getStoredAdminKey() {
  if (typeof window === 'undefined') return ''
  return safeGetStorageItem(window.localStorage, 'maprang:adminKey') || ''
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return 'ต้องบันทึก ADMIN_API_KEY ก่อนตรวจพรอมป์'
  }
  if (error instanceof ApiError && error.status === 404) return 'ไม่พบตัวละครที่เลือก'
  return 'ตรวจพรอมป์ไม่สำเร็จ ลองรีเฟรชตัวละครหรือเช็คระบบหลังบ้าน'
}

function diffStatusLabel(status: PromptInspectorDiff['changedSections'][number]['status']) {
  if (status === 'added') return 'เพิ่ม'
  if (status === 'removed') return 'หายไป'
  return 'เปลี่ยน'
}

function diffStatusClass(status: PromptInspectorDiff['changedSections'][number]['status']) {
  if (status === 'added') return 'border border-emerald-300/25 bg-emerald-400/12 text-emerald-100'
  if (status === 'removed') return 'border border-rose-300/25 bg-rose-400/12 text-rose-100'
  return 'border border-sky-300/25 bg-sky-400/12 text-sky-100'
}

function signedDelta(value: number) {
  if (value > 0) return `+${value.toLocaleString()}`
  return value.toLocaleString()
}

function StatCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'amber' | 'sky' | 'emerald' }) {
  const toneClass = {
    amber: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
    emerald: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    sky: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
    slate: 'border-white/10 bg-[#18181d]/90 text-white',
  }[tone]

  return (
    <article className={`rounded-lg border p-4 shadow-[0_18px_58px_rgba(0,0,0,0.18)] ${toneClass}`}>
      <p className="m-0 text-xs font-black tracking-widest uppercase opacity-70">{label}</p>
      <p className="m-0 mt-2 text-2xl font-black tracking-normal">{value}</p>
    </article>
  )
}

function SectionBudget({ section, maxTokens }: { section: PromptInspectorSection; maxTokens: number }) {
  const width = maxTokens > 0 ? Math.min(100, Math.max(4, (section.estimatedTokens / maxTokens) * 100)) : 4

  return (
    <details
      className="missai-card rounded-2xl p-4 text-white"
      data-testid="prompt-inspector-section"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="m-0 text-sm font-black text-white">
              {section.index + 1}. {section.title}
            </p>
            <p className="m-0 mt-1 line-clamp-2 text-xs font-bold leading-5 text-white/52">{section.preview}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className="missai-badge text-white/65">
              {section.estimatedTokens.toLocaleString()} โทเคน
            </span>
            <span className="missai-badge text-white/65">
              {section.chars.toLocaleString()} ตัวอักษร
            </span>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-linear-to-r from-amber-500 to-sky-500" style={{ width: `${width}%` }} />
        </div>
      </summary>
      <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/35 p-4 text-xs leading-5 text-white/78">
        {section.content}
      </pre>
    </details>
  )
}

function DiffPanel({ diff }: { diff?: PromptInspectorDiff }) {
  if (!diff) {
    return (
      <div className="missai-card rounded-2xl p-4 text-sm font-bold text-white/55">
        ใส่ข้อความก่อนหน้าเพื่อดูการเทียบพรอมป์
      </div>
    )
  }

  return (
    <section
      className="missai-card rounded-2xl p-4 text-white"
      data-testid="prompt-inspector-diff"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
            <Diff size={17} />
            เทียบพรอมป์
          </p>
          <p className="m-0 mt-1 text-xs font-bold text-white/52">
            เดิม {diff.previousEstimatedTokens.toLocaleString()} / ปัจจุบัน {diff.currentEstimatedTokens.toLocaleString()} โทเคน
          </p>
        </div>
        <span className="rounded-full border border-amber-300/25 bg-amber-400/12 px-3 py-1 text-xs font-black text-amber-100">
          {signedDelta(diff.estimatedTokenDelta)} โทเคน
        </span>
      </div>

      {diff.changedSections.length === 0 ? (
        <p className="missai-empty m-0 mt-4 p-3 text-sm text-white/55">โครงพรอมป์ไม่เปลี่ยน</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {diff.changedSections.map((section) => (
            <article className="missai-card rounded-xl p-3" key={`${section.index}-${section.title}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-black text-white">{section.title}</p>
                  <p className="m-0 mt-1 text-xs font-bold text-white/52">
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
  const refreshCharactersDisabledReason = isLoadingCharacters ? 'กำลังโหลดตัวละคร' : ''
  const characterSelectDisabledReason = isLoadingCharacters
    ? 'กำลังโหลดตัวละคร'
    : characters.length === 0
      ? 'ยังไม่มีตัวละครให้เลือก'
      : ''
  const inspectDisabledReason = isInspecting
    ? 'กำลังตรวจพรอมป์'
    : !hasAdminKey
      ? 'บันทึก ADMIN_API_KEY ก่อนตรวจพรอมป์'
      : !selectedCharacterId
        ? 'เลือกตัวละครก่อนตรวจพรอมป์'
        : !message.trim()
          ? 'กรอกข้อความปัจจุบันก่อนตรวจพรอมป์'
          : ''
  const maxSectionTokens = useMemo(
    () => Math.max(0, ...(result?.snapshot.sections.map((section) => section.estimatedTokens) ?? [0])),
    [result],
  )

  const loadCharacters = useCallback(async () => {
    setIsLoadingCharacters(true)
    try {
      const data = await fetchCharacters({ view: 'admin', sort: 'newest', limit: 50 })
      const rows = filterVisibleCharacters(data.characters ?? [])
      setCharacters(rows)
      setSelectedCharacterId((current) => current || rows[0]?.id || '')
      setNote(rows.length > 0 ? `โหลดตัวละครแล้ว ${rows.length} รายการ` : 'ยังไม่มีตัวละครให้ตรวจ')
    } catch (error) {
      logUnexpectedError('โหลดตัวละครสำหรับตรวจพรอมป์ไม่สำเร็จ:', error)
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
      logUnexpectedError('ตรวจพรอมป์ไม่สำเร็จ:', error)
      setResult(null)
      setNote(apiErrorMessage(error))
    } finally {
      setIsInspecting(false)
    }
  }

  async function copyPrompt() {
    if (!result?.snapshot.prompt) return
    const copied = await safeWriteClipboardText(getSafeClipboard(), result.snapshot.prompt)
    setNote(copied ? 'คัดลอกพรอมป์ที่ปิดข้อมูลลับแล้ว' : 'เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ ให้เลือกข้อความจากกล่องพรอมป์แทน')
  }

  return (
    <div className="missai-shell space-y-5 text-white">
      <section className="missai-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-white/42 uppercase">
              <FileSearch size={16} />
              ตัวตรวจพรอมป์
            </p>
            <h1 className="m-0 mt-2 text-2xl font-black tracking-normal text-white sm:text-3xl">ตรวจพรอมป์ก่อนยิงโมเดล</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm font-bold leading-6 text-white/58">
              ตรวจภาพรวมพรอมป์ งบโทเคน คลังความรู้ที่ดึงมาใช้ และส่วนต่างของบริบท เพื่อหาสาเหตุเวลาบอทตอบสั้นหรือหลุดบุคลิก
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:w-[560px]">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-black text-white/48">ADMIN_API_KEY</span>
              <input
                className="missai-input min-h-11 rounded-xl px-3 text-sm"
                data-testid="prompt-inspector-admin-key-input"
                onChange={(event) => setAdminKeyInput(event.target.value)}
                placeholder="วางคีย์ผู้ดูแล"
                type="password"
                value={adminKeyInput}
              />
            </label>
            <button
              className="missai-button-secondary mt-auto min-h-11 rounded-xl bg-white px-4 text-sm text-slate-950 hover:bg-white/90"
              data-testid="prompt-inspector-admin-key-save"
              onClick={saveAdminKey}
              type="button"
            >
              <KeyRound size={16} />
              บันทึก
            </button>
            <button
              className="missai-button-secondary mt-auto min-h-11 rounded-xl px-4 text-sm"
              onClick={clearKey}
              type="button"
            >
              ล้าง
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="missai-empty m-0 px-3 py-2 text-sm text-white/70" data-testid="prompt-inspector-note">
            {note}
          </p>
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
              hasAdminKey
                ? 'border border-emerald-300/25 bg-emerald-400/12 text-emerald-100'
                : 'border border-amber-300/25 bg-amber-400/12 text-amber-100'
            }`}
          >
            {hasAdminKey ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {hasAdminKey ? 'พร้อมเรียก API ผู้ดูแล' : 'ต้องใช้ ADMIN_API_KEY'}
          </span>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          className="missai-card space-y-4 rounded-2xl p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void inspectPrompt()
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 text-sm font-black text-white">ข้อมูลตรวจ</p>
            <button
              aria-disabled={Boolean(refreshCharactersDisabledReason)}
              className="missai-button-secondary min-h-9 rounded-xl px-3 text-xs"
              disabled={Boolean(refreshCharactersDisabledReason)}
              onClick={() => void loadCharacters()}
              title={refreshCharactersDisabledReason || 'รีเฟรชรายชื่อตัวละคร'}
              type="button"
            >
              <RefreshCw size={14} />
              รีเฟรช
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-white/48">ตัวละคร</span>
            <select
              aria-disabled={Boolean(characterSelectDisabledReason)}
              className="missai-input min-h-11 rounded-xl px-3 text-sm"
              data-testid="prompt-inspector-character-select"
              disabled={Boolean(characterSelectDisabledReason)}
              onChange={(event) => setSelectedCharacterId(event.target.value)}
              title={characterSelectDisabledReason || 'เลือกตัวละครที่ต้องการตรวจพรอมป์'}
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
            <div className="missai-card rounded-xl p-3">
              <p className="m-0 text-sm font-black text-white">{selectedCharacter.name}</p>
              <p className="m-0 mt-1 line-clamp-2 text-xs font-bold leading-5 text-white/52">
                {selectedCharacter.tagline || selectedCharacter.description || 'ยังไม่มีคำโปรย'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedCharacter.tags.slice(0, 8).map((tag) => (
                  <span className="missai-badge px-2 py-0.5 text-[11px] text-white/55" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-black text-white/48">ข้อความปัจจุบัน</span>
            <textarea
              className="missai-input min-h-32 resize-y rounded-xl px-3 py-3 text-sm leading-6"
              data-testid="prompt-inspector-message"
              onChange={(event) => setMessage(event.target.value)}
              value={message}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-white/48">ข้อความก่อนหน้า</span>
            <textarea
              className="missai-input min-h-24 resize-y rounded-xl px-3 py-3 text-sm leading-6"
              data-testid="prompt-inspector-compare"
              onChange={(event) => setCompareWithMessage(event.target.value)}
              value={compareWithMessage}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-white/48">โน้ตตอนรัน</span>
            <textarea
              className="missai-input min-h-24 resize-y rounded-xl px-3 py-3 text-sm leading-6"
              data-testid="prompt-inspector-runtime-note"
              onChange={(event) => setRuntimeNote(event.target.value)}
              value={runtimeNote}
            />
          </label>

          <label className="missai-card flex items-start gap-3 rounded-xl p-3">
            <input
              checked={includeSavedPersona}
              className="mt-1 size-4"
              onChange={(event) => setIncludeSavedPersona(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-black text-white">แนบตัวตนผู้เล่นที่บันทึกไว้</span>
              <span className="block text-xs font-bold leading-5 text-white/52">ใช้ค่าจากระบบหลังบ้าน ถ้าไม่ได้กรอกตัวตนชั่วคราวด้านล่าง</span>
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black text-white/48">ตัวตนชั่วคราว</span>
            <textarea
              className="missai-input min-h-24 resize-y rounded-xl px-3 py-3 text-sm leading-6"
              data-testid="prompt-inspector-user-persona"
              onChange={(event) => setUserPersona(event.target.value)}
              placeholder="เว้นว่างเพื่อใช้ตัวตนผู้เล่นที่บันทึกไว้"
              value={userPersona}
            />
          </label>

          <button
            aria-disabled={Boolean(inspectDisabledReason)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-black text-white transition hover:bg-orange-400 disabled:opacity-60"
            data-testid="prompt-inspector-submit"
            disabled={Boolean(inspectDisabledReason)}
            title={inspectDisabledReason || 'ตรวจพรอมป์แบบปิดข้อมูลลับ'}
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
                <StatCard label="คลังความรู้ที่ใช้" value={result.snapshot.retrieval.loreCount.toLocaleString()} tone="emerald" />
              </section>

              {result.snapshot.warnings.length > 0 && (
                <section className="rounded-lg border border-amber-300/25 bg-amber-400/10 p-4 text-amber-100 shadow-[0_18px_58px_rgba(0,0,0,0.18)]">
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

                <section className="missai-card rounded-2xl p-4 text-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
                      <ShieldCheck size={17} />
                      พรอมป์สุดท้ายที่ปิดข้อมูลลับแล้ว
                    </p>
                    <p className="m-0 mt-1 text-xs font-bold text-white/52">
                      สร้างเมื่อ {new Date(result.snapshot.generatedAt).toLocaleString('th-TH')}
                    </p>
                  </div>
                  <button
                    className="missai-button-secondary min-h-9 rounded-xl px-3 text-xs"
                    onClick={() => void copyPrompt()}
                    type="button"
                  >
                    <Clipboard size={14} />
                    คัดลอก
                  </button>
                </div>
                <pre
                  className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/35 p-4 text-xs leading-5 text-white/78"
                  data-testid="prompt-inspector-output"
                >
                  {result.snapshot.prompt}
                </pre>
              </section>

              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-black text-white">งบแต่ละส่วน</p>
                    <p className="m-0 mt-1 text-xs font-bold text-white/52">เปิดแต่ละส่วนเพื่อดูข้อความที่ถูกส่งเข้าพรอมป์</p>
                  </div>
                </div>
                {result.snapshot.sections.map((section) => (
                  <SectionBudget key={`${section.index}-${section.fingerprint}`} maxTokens={maxSectionTokens} section={section} />
                ))}
              </section>

              <section className="missai-card rounded-2xl p-4 text-white">
                <p className="m-0 text-sm font-black text-white">คลังความรู้ที่ดึงมาใช้</p>
                {result.snapshot.retrieval.lore.length === 0 ? (
                  <p className="missai-empty m-0 mt-3 p-3 text-sm text-white/55">ไม่มีคลังความรู้ที่ถูกดึงมาใช้ในรอบนี้</p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {result.snapshot.retrieval.lore.map((entry) => (
                      <article className="missai-card rounded-xl p-3" key={`${entry.keyword}-${entry.priority}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="m-0 text-sm font-black text-white">{entry.keyword}</p>
                            <p className="m-0 mt-1 text-xs font-bold leading-5 text-white/52">{entry.preview}</p>
                          </div>
                          <span className="missai-badge shrink-0 text-white/65">
                            ความสำคัญ {entry.priority}
                          </span>
                        </div>
                        {entry.aliases.length > 0 && (
                          <p className="m-0 mt-2 text-xs font-bold text-white/42">ชื่อเรียกอื่น: {entry.aliases.join(', ')}</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="missai-card grid min-h-[28rem] place-items-center rounded-2xl border-dashed border-white/15 p-8 text-center">
              <div className="max-w-sm">
                <span className="missai-icon-button mx-auto size-12 text-white">
                  <FileSearch size={22} />
                </span>
                <h2 className="m-0 mt-4 text-xl font-black text-white">ยังไม่ได้ตรวจพรอมป์</h2>
                <p className="m-0 mt-2 text-sm font-bold leading-6 text-white/55">
                  เลือกตัวละคร ใส่ข้อความ แล้วกดตรวจ ระบบจะแสดงภาพรวมพรอมป์และส่วนต่างที่ปิดข้อมูลลับแล้ว
                </p>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}
