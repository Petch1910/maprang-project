import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquareText,
  Sparkles,
  Tags,
  Upload,
  WandSparkles,
} from 'lucide-react'
import { generateCreatorAiDraft, uploadAvatar, fetchCreatorDraft, updateCreatorDraft, type CharacterInput, type CreatorAiDraftResponse } from '../lib/api'
import {
  buildCharacterDraftFromImage,
  buildGeneratedAvatarDataUrl,
  clearStoredCreatorDraft,
  mergeDraftTags,
  readStoredCreatorDraft,
  writeStoredCreatorDraft,
  type CreatorStoredDraft,
} from '../lib/characterDraft'
import { analyzeTags, normalizeTag, type TagAnalysis, type TagIssue } from '../lib/tagAnalysis'
import { CreatorReadinessPanel } from './CreatorReadinessPanel'
import { RelationshipPreviewPanel } from './RelationshipPreviewPanel'
import { RelationshipPresetPicker } from './RelationshipPresetPicker'

type CharacterCreateFormProps = {
  defaultOpen?: boolean
  isSaving: boolean
  onCreate: (input: CharacterInput) => Promise<boolean>
  onDraftStatusChange?: (status: CreatorDraftStatus) => void
}

export type CreatorDraftStatus = {
  hasAvatar: boolean
  avatarSource: 'none' | 'manual' | 'placeholder' | 'provider'
  hasIdentity: boolean
  hasPrompt: boolean
  hasScenario: boolean
  hasGreeting: boolean
  hasDangerConflict: boolean
  hasWarning: boolean
  hasPreviewRun: boolean
  draftGeneratedFromImage: boolean
  canSubmit: boolean
  readinessLabel: string
  readinessScore: number
  tagCounts: {
    discovery: number
    engine: number
    safety: number
    unknown: number
  }
  issueMessages: TagIssue[]
  note: string
}

const inputClass =
  'missai-input min-h-11 rounded-xl px-3.5 text-sm font-semibold'
const textareaClass =
  'missai-input min-h-24 resize-y rounded-xl px-3.5 py-2.5 text-sm font-semibold leading-relaxed'
const quietButtonClass =
  'missai-button-secondary min-h-9 rounded-xl px-3.5 text-xs'

function withCreatorUiTimeout<T>(promise: Promise<T>, timeoutMs = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('creator_ai_draft_timeout')), timeoutMs)
    promise.then(resolve, reject).finally(() => window.clearTimeout(timeoutId))
  })
}

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
  tags: 'บทบาทสมมุติ, ไทย',
}

function loadStoredCreatorDraft(): CreatorStoredDraft | null {
  if (typeof window === 'undefined') return null
  return readStoredCreatorDraft(window.localStorage)
}

function clearLocalCreatorDraft() {
  if (typeof window === 'undefined') return
  clearStoredCreatorDraft(window.localStorage)
}

function mergeStoredForm(stored: CreatorStoredDraft | null) {
  return {
    ...emptyCharacter,
    ...(stored?.form ?? {}),
  }
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black text-white/72">{label}</span>
      {children}
      {hint && <span className="text-[11px] font-bold leading-5 text-white/45">{hint}</span>}
    </label>
  )
}

function SectionHeader({
  step,
  title,
  detail,
  icon: Icon,
}: {
  step: string
  title: string
  detail: string
  icon: typeof Sparkles
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-xl border border-[#ac4bff]/30 bg-[#ac4bff]/15 text-xs font-black text-[#d9b3ff]">
        {step}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="text-[#ac4bff]" size={17} />
          <h3 className="font-display m-0 text-base font-black text-white">{title}</h3>
        </div>
        <p className="m-0 mt-1 text-xs font-medium leading-5 text-slate-400">{detail}</p>
      </div>
    </div>
  )
}

function buildReadinessSummary({
  form,
  analysis,
  hasDangerConflict,
}: {
  form: typeof emptyCharacter
  analysis: TagAnalysis
  hasDangerConflict: boolean
}) {
  const hasAvatar = Boolean(form.avatarUrl.trim())
  const hasIdentity = Boolean(form.name.trim() && (form.tagline.trim() || form.description.trim()))
  const hasPrompt = Boolean(form.systemPrompt.trim() || form.characterAnchor.trim())
  const hasScenario = Boolean(form.scenario.trim())
  const hasGreeting = Boolean(form.greeting.trim())
  const essentials = [hasAvatar, hasIdentity, hasPrompt, hasScenario, hasGreeting].filter(Boolean).length
  const tagScore = Math.min(18, analysis.engine.length * 4 + analysis.safety.length * 3 + analysis.discovery.length * 2)
  const readinessScore = hasDangerConflict ? 42 : Math.min(96, 28 + essentials * 10 + tagScore)
  const readinessLabel = hasDangerConflict
    ? 'ต้องแก้แท็กขัดแย้ง'
    : readinessScore >= 88
      ? 'พร้อมลองบทก่อนเผยแพร่'
      : readinessScore >= 72
        ? 'โครงดีแล้ว เติมรายละเอียดอีกนิด'
        : 'ยังควรเติมแกนบุคลิก'

  return {
    hasAvatar,
    hasIdentity,
    hasPrompt,
    hasScenario,
    hasGreeting,
    readinessScore,
    readinessLabel,
  }
}

export function CharacterCreateForm({
  defaultOpen = false,
  isSaving,
  onCreate,
  onDraftStatusChange,
}: CharacterCreateFormProps) {
  const storedDraft = useMemo(() => loadStoredCreatorDraft(), [])
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [form, setForm] = useState(() => mergeStoredForm(storedDraft))
  const [note, setNote] = useState(() =>
    storedDraft?.form ? 'กู้ดราฟต์ที่ยังไม่ได้บันทึกไว้ให้แล้ว คุณแก้ต่อได้ทันที' : '',
  )
  const [creatorBrief, setCreatorBrief] = useState(storedDraft?.creatorBrief ?? '')
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [lastImageSignal, setLastImageSignal] = useState(storedDraft?.lastImageSignal ?? '')
  const [storedAvatarSource, setStoredAvatarSource] = useState<CreatorDraftStatus['avatarSource']>(storedDraft?.avatarSource ?? 'none')
  const [coverImageUrl, setCoverImageUrl] = useState(storedDraft?.coverImageUrl ?? '')
  const [coverImageSource, setCoverImageSource] = useState<CreatorDraftStatus['avatarSource']>(storedDraft?.coverImageSource ?? 'none')
  const [hasCoverDraft, setHasCoverDraft] = useState(Boolean(storedDraft?.coverImageUrl && storedDraft?.hasCoverDraft))
  const [hasImageDraft, setHasImageDraft] = useState(Boolean(storedDraft?.hasImageDraft))
  const [hasPreviewRun, setHasPreviewRun] = useState(Boolean(storedDraft?.hasPreviewRun))
  const [generatedImages, setGeneratedImages] = useState<{ url: string; source: CreatorDraftStatus['avatarSource'] }[]>(storedDraft?.generatedImages ?? [])
  const [imageStyle, setImageStyle] = useState(storedDraft?.imageStyle ?? '')
  const avatarUrlInputRef = useRef<HTMLInputElement | null>(null)

  const update = (field: keyof typeof emptyCharacter, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const tagAnalysis = useMemo(() => analyzeTags(form.tags), [form.tags])
  const hasDangerConflict = tagAnalysis.issues.some((issue) => issue.level === 'danger')
  const hasWarning = tagAnalysis.issues.some((issue) => issue.level === 'warning')
  const hasAvatar = Boolean(form.avatarUrl.trim())
  const isGeneratedAvatar = form.avatarUrl.startsWith('data:image/')
  const isPlaceholderGeneratedAvatar = form.avatarUrl.startsWith('data:image/svg+xml')
  const avatarSource: CreatorDraftStatus['avatarSource'] = !hasAvatar
    ? 'none'
    : isPlaceholderGeneratedAvatar
      ? 'placeholder'
      : storedAvatarSource === 'provider'
        ? 'provider'
        : isGeneratedAvatar
          ? 'provider'
          : 'manual'
  const readiness = useMemo(
    () => buildReadinessSummary({ form, analysis: tagAnalysis, hasDangerConflict }),
    [form, hasDangerConflict, tagAnalysis],
  )
  const canSubmit = !isSaving && !hasDangerConflict && Boolean(form.name.trim()) && Boolean(form.systemPrompt.trim())
  const aiDraftDisabledReason = isGeneratingDraft ? 'AI กำลังสร้างร่างอยู่ รอให้เสร็จก่อน' : ''
  const uploadDisabledReason = isUploading ? 'กำลังอัปโหลดรูป รอให้เสร็จก่อน' : ''
  const submitDisabledReason = isSaving
    ? 'กำลังสร้างดราฟต์ รอให้เสร็จก่อน'
    : hasDangerConflict
      ? 'แก้แท็กที่ขัดแย้งก่อนสร้างดราฟต์'
      : !form.name.trim()
        ? 'กรอกชื่อตัวละครก่อนสร้างดราฟต์'
        : !form.systemPrompt.trim()
          ? 'กรอกพรอมป์ระบบหรือบุคลิกก่อนสร้างดราฟต์'
          : ''

  const status = useMemo<CreatorDraftStatus>(
    () => ({
      ...readiness,
      avatarSource,
      hasDangerConflict,
      hasWarning,
      hasPreviewRun,
      draftGeneratedFromImage: hasImageDraft,
      canSubmit,
      tagCounts: {
        discovery: tagAnalysis.discovery.length,
        engine: tagAnalysis.engine.length,
        safety: tagAnalysis.safety.length,
        unknown: tagAnalysis.unknown.length,
      },
      issueMessages: tagAnalysis.issues,
      note,
    }),
    [avatarSource, canSubmit, hasDangerConflict, hasImageDraft, hasPreviewRun, hasWarning, note, readiness, tagAnalysis],
  )

  useEffect(() => {
    onDraftStatusChange?.(status)
  }, [onDraftStatusChange, status])

  useEffect(() => {
    fetchCreatorDraft()
      .then((res) => {
        if (res.draft) {
          const dbDraft = res.draft as CreatorStoredDraft
          const localDraft = loadStoredCreatorDraft()
          if (!localDraft || (dbDraft.updatedAt ?? 0) > (localDraft.updatedAt ?? 0)) {
            setForm(mergeStoredForm(dbDraft))
            setCreatorBrief(dbDraft.creatorBrief ?? '')
            setStoredAvatarSource(dbDraft.avatarSource ?? 'none')
            setCoverImageUrl(dbDraft.coverImageUrl ?? '')
            setCoverImageSource(dbDraft.coverImageSource ?? 'none')
            setHasCoverDraft(Boolean(dbDraft.coverImageUrl && dbDraft.hasCoverDraft))
            setHasImageDraft(Boolean(dbDraft.hasImageDraft))
            setHasPreviewRun(Boolean(dbDraft.hasPreviewRun))
            setLastImageSignal(dbDraft.lastImageSignal ?? '')
            setGeneratedImages(dbDraft.generatedImages ?? [])
            setImageStyle(dbDraft.imageStyle ?? '')
            setNote('โหลดดราฟต์ล่าสุดจากระบบคลาวด์แล้ว คุณแก้ต่อได้ทันที')
            writeStoredCreatorDraft(window.localStorage, dbDraft)
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasDraftContent = Object.entries(form).some(([key, value]) => {
      if (key === 'tags') return value.trim() !== emptyCharacter.tags
      return value.trim().length > 0
    })

    if (!hasDraftContent && !creatorBrief.trim() && !coverImageUrl && !lastImageSignal && !hasImageDraft && !hasCoverDraft && !hasPreviewRun) {
      clearLocalCreatorDraft()
      return
    }

    const payload: CreatorStoredDraft = {
      form,
      creatorBrief,
      avatarSource,
      coverImageUrl: coverImageUrl || undefined,
      coverImageSource,
      hasCoverDraft,
      hasImageDraft,
      hasPreviewRun,
      lastImageSignal,
      generatedImages,
      imageStyle,
      updatedAt: Date.now(),
    }
    writeStoredCreatorDraft(window.localStorage, payload)

    const timeoutId = setTimeout(() => {
      updateCreatorDraft(payload).catch(() => {})
    }, 1500)

    return () => clearTimeout(timeoutId)
  }, [avatarSource, coverImageSource, coverImageUrl, creatorBrief, form, hasCoverDraft, hasImageDraft, hasPreviewRun, lastImageSignal, generatedImages, imageStyle])

  useEffect(() => {
    setHasPreviewRun(false)
  }, [form.tags])

  const applyImageDraft = (source: { imageName?: string; imagePrompt?: string; imageUrl?: string }, overwrite = false) => {
    const draft = buildCharacterDraftFromImage(source)
    const nextAvatarUrl = source.imageUrl ?? form.avatarUrl
    const nextIsPlaceholder = nextAvatarUrl.startsWith('data:image/svg+xml')
    const nextSource = nextIsPlaceholder ? 'placeholder' : 'manual'
    setStoredAvatarSource(nextSource)

    if (nextAvatarUrl) {
      setGeneratedImages((prev) => {
        if (prev.some((img) => img.url === nextAvatarUrl)) return prev
        return [{ url: nextAvatarUrl, source: nextSource }, ...prev]
      })
    }

    setForm((prev) => ({
      ...prev,
      avatarUrl: nextAvatarUrl || prev.avatarUrl,
      name: overwrite || !prev.name.trim() ? draft.name : prev.name,
      tagline: overwrite || !prev.tagline.trim() ? draft.tagline : prev.tagline,
      description: overwrite || !prev.description.trim() ? draft.description : prev.description,
      biography: overwrite || !prev.biography.trim() ? draft.biography : prev.biography,
      scenario: overwrite || !prev.scenario.trim() ? draft.scenario : prev.scenario,
      systemPrompt: overwrite || !prev.systemPrompt.trim() ? draft.systemPrompt : prev.systemPrompt,
      compactPrompt: overwrite || !prev.compactPrompt.trim() ? draft.compactPrompt : prev.compactPrompt,
      characterAnchor: overwrite || !prev.characterAnchor.trim() ? draft.characterAnchor : prev.characterAnchor,
      constraints: overwrite || !prev.constraints.trim() ? draft.constraints : prev.constraints,
      greeting: overwrite || !prev.greeting.trim() ? draft.greeting : prev.greeting,
      tags: overwrite ? draft.tags : mergeDraftTags(prev.tags, draft.tags),
    }))
    setHasImageDraft(true)
    setNote(
      overwrite
        ? 'สร้างเนื้อหาใหม่จากรูปและเขียนทับดราฟต์แล้ว'
        : `${nextIsPlaceholder ? 'ภาพร่างระบบพร้อมแล้ว' : 'รูปพร้อมแล้ว'} ระบบเติมเนื้อหาตั้งต้นให้ในช่องที่ยังว่าง`,
    )
  }

  const applyAiDraft = (result: CreatorAiDraftResponse) => {
    setForm((prev) => ({
      ...prev,
      avatarUrl: result.image.url,
      name: result.draft.name,
      tagline: result.draft.tagline,
      description: result.draft.description,
      biography: result.draft.biography,
      scenario: result.draft.scenario,
      systemPrompt: result.draft.systemPrompt,
      compactPrompt: result.draft.compactPrompt,
      characterAnchor: result.draft.characterAnchor,
      constraints: result.draft.constraints,
      greeting: result.draft.greeting,
      tags: result.draft.tags,
    }))
    const nextSource = result.image.provider === 'configured' ? 'provider' : 'placeholder'
    setStoredAvatarSource(nextSource)

    const nextAvatarUrl = result.image.url
    if (nextAvatarUrl) {
      setGeneratedImages((prev) => {
        if (prev.some((img) => img.url === nextAvatarUrl)) return prev
        return [{ url: nextAvatarUrl, source: nextSource }, ...prev]
      })
    }

    setHasImageDraft(true)
    setLastImageSignal(result.image.prompt)
    const contentStatus = result.source === 'ai' ? 'เนื้อหาสร้างจาก AI แล้ว' : 'ระบบช่วยร่างเนื้อหาในเครื่องให้ก่อน'
    const imageStatus =
      result.image.provider === 'configured'
        ? 'รูปถูกสร้างจากระบบสร้างรูปแล้ว'
        : result.image.note || 'รูปตอนนี้เป็นภาพร่างระบบ ใช้จัดฟอร์มและคิดบุคลิกต่อได้'
    const warningText = result.warnings.length > 0 ? ` (${result.warnings.join(', ')})` : ''
    setNote(`${contentStatus} - ${imageStatus}${warningText}`)
  }

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return
    setIsUploading(true)
    try {
      const uploaded = await uploadAvatar(file)
      setLastImageSignal(file.name)
      setStoredAvatarSource('manual')
      applyImageDraft({ imageName: file.name, imageUrl: uploaded.url })
    } catch {
      setNote('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsUploading(false)
    }
  }

  const generateImageDraft = async (imageOnly = false) => {
    const imagePrompt = [creatorBrief, form.name, form.tagline, form.description, form.tags, lastImageSignal]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(' | ')
    const source =
      imagePrompt ||
      'original Thai roleplay character, emotionally layered, slow-burn relationship, cinematic portrait, clear personality, scene-ready'
    setIsGeneratingDraft(true)
    setNote(imageOnly ? 'กำลังให้ AI สร้างรูปใหม่...' : 'กำลังให้ AI ช่วยร่างตัวละคร...')
    try {
      const result = await withCreatorUiTimeout(
        generateCreatorAiDraft({
          brief: source,
          imagePrompt: source,
          current: form,
          imageOnly,
          imageStyle,
        }),
      )
      if (imageOnly) {
        applyImageDraft({ imagePrompt: result.image.prompt, imageUrl: result.image.url }, false)
        setStoredAvatarSource(result.image.provider === 'configured' ? 'provider' : result.image.provider)
        setNote('สร้างรูปใหม่สำเร็จแล้ว')
      } else {
        applyAiDraft(result)
      }
    } catch {
      const imageUrl = buildGeneratedAvatarDataUrl({ imagePrompt: source })
      setLastImageSignal(source)
      applyImageDraft({ imagePrompt: source, imageUrl }, true)
      setNote('ระบบสร้างร่างในเครื่องให้ก่อน คุณแก้รายละเอียดต่อได้ทันที')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const submit = async () => {
    if (!canSubmit) return
    setNote('')
    try {
      const created = await onCreate({
        name: form.name.trim(),
        avatarUrl: form.avatarUrl.trim() || null,
        coverUrl: coverImageUrl.trim() || null,
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
          .map((tag) => normalizeTag(tag))
          .filter(Boolean),
        visibility: 'PRIVATE',
        status: 'DRAFT',
      })
      if (!created) {
        setNote('สร้างดราฟต์ไม่สำเร็จ กรุณาเช็กข้อความแจ้งเตือนแล้วลองใหม่')
        return
      }
      setForm(emptyCharacter)
      setCreatorBrief('')
      setStoredAvatarSource('none')
      setHasImageDraft(false)
      setHasPreviewRun(false)
      setLastImageSignal('')
      setGeneratedImages([])
      setImageStyle('')
      clearLocalCreatorDraft()
      updateCreatorDraft(null).catch(() => {})
      setNote('สร้างดราฟต์ตัวละครแล้ว')
      setIsOpen(false)
    } catch {
      setNote('สร้างดราฟต์ไม่สำเร็จ กรุณาเช็กการเข้าสู่ระบบหรือเซิร์ฟเวอร์แล้วลองใหม่')
    }
  }

  return (
    <section className="missai-card overflow-hidden rounded-2xl bg-[#0b0d1f]/95 text-white shadow-2xl backdrop-blur-md">
      <button
        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-white/5 bg-[#0b0d1f]/40 px-4 text-left text-sm font-black text-white transition hover:bg-white/5 sm:px-5"
        aria-controls="creator-form-panel"
        aria-expanded={isOpen}
        data-testid="creator-form-toggle"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Bot className="text-[#ac4bff]" size={18} />
          <span>สร้างตัวละครใหม่</span>
          <span className="hidden rounded-full border border-white/10 bg-[#080a1a]/60 px-2.5 py-1 text-[11px] font-black text-slate-400 sm:inline-flex">
            {status.readinessLabel}
          </span>
        </span>
        <ChevronDown className={`flex-none transition ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>

      {isOpen && (
        <div className="divide-y divide-white/5" id="creator-form-panel">
          <div className="grid gap-4 p-4 sm:p-5">
            <SectionHeader
              detail="เริ่มจากภาพเหมือนที่ผู้ใช้คุ้นกับ Khuiai แล้วให้ Maprang ช่วยคิดรายละเอียดต่อ"
              icon={ImageIcon}
              step="1"
              title="รูปและไอเดียตั้งต้น"
            />

            <div className="grid justify-items-center gap-4">
              <div className="w-full max-w-[280px]">
                <div className="aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-[#080a1a]">
                  {hasAvatar ? (
                    <img alt="รูปตัวละคร" className="h-full w-full object-cover" src={form.avatarUrl} />
                  ) : (
                    <div className="grid h-full place-items-center p-5 text-center text-sm font-black text-white/38">
                      <div>
                        <ImageIcon className="mx-auto mb-2" size={30} />
                        รูปตัวละคร
                      </div>
                    </div>
                  )}
                </div>
                {generatedImages.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
                    {generatedImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label="เลือกรูปประวัติ"
                        onClick={() => {
                          update('avatarUrl', img.url)
                          setStoredAvatarSource(img.source)
                        }}
                        className={`relative aspect-[3/4] w-14 flex-none overflow-hidden rounded-md border-2 transition-all ${
                          form.avatarUrl === img.url ? 'border-[#ac4bff] shadow-[0_0_10px_rgba(172,75,255,0.3)]' : 'border-transparent hover:border-white/30'
                        }`}
                      >
                        <img alt="ประวัติรูป" className="h-full w-full object-cover" src={img.url} />
                      </button>
                    ))}
                  </div>
                )}
                {coverImageUrl && (
                  <div
                    data-testid="creator-cover-draft-panel"
                    className="mt-3 rounded-xl border border-[#ac4bff]/30 bg-[#ac4bff]/10 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-[#d8b4fe]">ภาพปกจาก AI Creator</p>
                      <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white/55">
                        {coverImageSource === 'provider' ? 'provider' : coverImageSource === 'placeholder' ? 'fallback' : 'manual'}
                      </span>
                    </div>
                    <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-black/25">
                      <img alt="ภาพปกตัวละคร" className="aspect-video w-full object-cover" src={coverImageUrl} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        data-testid="creator-cover-use-main"
                        className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2 py-1.5 text-[10px] font-bold text-emerald-200 transition hover:bg-emerald-400/20"
                        onClick={() => {
                          update('avatarUrl', coverImageUrl)
                          setStoredAvatarSource(coverImageSource)
                          setHasImageDraft(true)
                          setNote('ใช้ภาพปกเป็นรูปตัวละครหลักแล้ว')
                        }}
                        type="button"
                      >
                        ใช้เป็นรูปหลัก
                      </button>
                      <button
                        data-testid="creator-cover-clear"
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setCoverImageUrl('')
                          setCoverImageSource('none')
                          setHasCoverDraft(false)
                          setNote('ล้างภาพปกจากดราฟต์แล้ว')
                        }}
                        type="button"
                      >
                        ล้างภาพปก
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid w-full max-w-xl gap-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-3.5 text-xs font-black text-white transition hover:brightness-110 shadow-lg disabled:opacity-60 missai-glow"
                    aria-disabled={isGeneratingDraft}
                    data-testid="creator-ai-draft"
                    disabled={isGeneratingDraft}
                    onClick={() => void generateImageDraft(false)}
                    title={aiDraftDisabledReason || 'ให้ AI สร้างรูปและเนื้อหาตัวละคร'}
                    type="button"
                  >
                    <WandSparkles size={15} />
                    {isGeneratingDraft ? 'ร่าง...' : 'รูป+ข้อความ'}
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
                    aria-disabled={isGeneratingDraft}
                    data-testid="creator-ai-image-only"
                    disabled={isGeneratingDraft}
                    onClick={() => void generateImageDraft(true)}
                    title={aiDraftDisabledReason || 'ให้ AI สร้างเฉพาะรูปตัวละคร'}
                    type="button"
                  >
                    <ImageIcon size={15} />
                    {isGeneratingDraft ? 'สร้าง...' : 'สร้างเฉพาะรูป'}
                  </button>
                  <label
                    aria-disabled={isUploading}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white ${
                      isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                    title={uploadDisabledReason || 'อัปโหลดรูปตัวละครจากเครื่อง'}
                  >
                    <Upload size={15} />
                    {isUploading ? 'โหลด...' : 'อัปโหลด'}
                    <input
                      aria-disabled={isUploading}
                      aria-label="อัปโหลดรูปตัวละคร"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={(event) => void handleAvatarFile(event.target.files?.[0] ?? null)}
                      title={uploadDisabledReason || 'อัปโหลดรูปตัวละครจากเครื่อง'}
                      type="file"
                    />
                  </label>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      if (avatarSource === 'placeholder' || avatarSource === 'provider') {
                        update('avatarUrl', '')
                        setStoredAvatarSource('none')
                        setHasImageDraft(false)
                        setLastImageSignal('')
                        setNote('ล้างภาพร่างระบบแล้ว วางลิงก์รูปจริงได้เลย')
                        return
                      }
                      avatarUrlInputRef.current?.focus()
                    }}
                    type="button"
                  >
                    <LinkIcon size={15} />
                    ลิงก์รูป
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    className="h-10 rounded-xl border border-white/10 bg-[#080a1a]/60 px-3 text-sm font-semibold text-white outline-none focus:border-[#ac4bff] focus:ring-4 focus:ring-[#ac4bff]/10"
                    data-testid="creator-image-style"
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value)}
                  >
                    <option value="">สไตล์ภาพอัตโนมัติ (Automatic)</option>
                    <option value="anime">อนิเมะ (Anime)</option>
                    <option value="cinematic">ภาพยนตร์สมจริง (Cinematic Realistic)</option>
                    <option value="watercolor">สีน้ำ (Watercolor)</option>
                    <option value="3d-render">ภาพวาด 3D (3D Render)</option>
                    <option value="digital-art">ดิจิทัลอาร์ต (Digital Art)</option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/5 bg-[#0b0d1f]/40 p-3 text-xs font-semibold leading-relaxed text-slate-400">
                  กด AI สร้างรูป + เนื้อหาเพื่อให้ระบบช่วยร่างตัวละคร ถ้ายังไม่ได้เชื่อมระบบสร้างรูปจริง ระบบจะแสดงภาพร่างสำหรับจัดฟอร์มและคิดบุคลิกต่อได้ทันที
                </div>

                <FieldBlock
                  label="บรีฟสำหรับ AI"
                  hint="ใส่แนวตัวละคร โทนภาพ ความสัมพันธ์ หรือฉากเริ่มต้น เช่น สาวลึกลับในเมืองฝนตก, ศัตรูเก่าที่ต้องร่วมมือกัน, slow-burn"
                >
                  <textarea
                    className={`${textareaClass} min-h-24`}
                    data-testid="creator-brief"
                    value={creatorBrief}
                    onChange={(event) => setCreatorBrief(event.target.value)}
                    placeholder="บอก AI ว่าอยากได้ตัวละครแนวไหน..."
                  />
                </FieldBlock>

                <FieldBlock label="ลิงก์รูปตัวละคร">
                  {avatarSource === 'placeholder' || avatarSource === 'provider' ? (
                    <div className="grid min-h-11 gap-2 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 py-2 text-sm text-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span className="min-w-0 font-bold sm:truncate">
                        {avatarSource === 'placeholder'
                          ? 'ภาพร่างระบบสำหรับจัดฟอร์ม'
                          : 'รูปจากระบบสร้างรูป (เก็บเป็น URL แล้ว)'}
                      </span>
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-2.5 py-1 text-xs font-bold text-[#d8b4fe] transition hover:bg-[#a855f7]/20"
                        onClick={() => {
                          update('avatarUrl', '')
                          setStoredAvatarSource('none')
                          setHasImageDraft(false)
                          setLastImageSignal('')
                          setNote('ล้างภาพร่างระบบแล้ว วางลิงก์รูปจริงได้เลย')
                        }}
                        type="button"
                      >
                        ใช้ลิงก์แทน
                      </button>
                    </div>
                  ) : (
                    <input
                      className={inputClass}
                      data-testid="creator-avatar-url"
                      ref={avatarUrlInputRef}
                      value={form.avatarUrl}
                      onChange={(event) => {
                        update('avatarUrl', event.target.value)
                        setLastImageSignal(event.target.value)
                        setStoredAvatarSource('manual')
                        setHasImageDraft(false)
                      }}
                      placeholder="https://..."
                    />
                  )}
                </FieldBlock>

                {hasAvatar && (
                  <div className="rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 p-3">
                    <p className="m-0 flex items-center gap-2 text-sm font-bold text-[#d8b4fe]">
                      <Sparkles size={16} />
                      {isPlaceholderGeneratedAvatar
                         ? 'ภาพร่างพร้อม ให้ระบบคิดเนื้อหาต่อ'
                        : isGeneratedAvatar
                          ? 'รูป AI พร้อม ให้ระบบคิดเนื้อหาต่อ'
                          : 'รูปพร้อมแล้ว ให้ระบบคิดเนื้อหาให้เลย'}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#a855f7] px-3 text-xs font-bold text-white transition hover:bg-[#9333ea] shadow-lg"
                        onClick={() => applyImageDraft({ imageName: lastImageSignal, imageUrl: form.avatarUrl })}
                        type="button"
                      >
                        <WandSparkles size={15} />
                        เติมช่องว่างจากรูป
                      </button>
                      <button
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/10 px-3 text-xs font-bold text-[#d8b4fe] transition hover:bg-[#a855f7]/20"
                        onClick={() => applyImageDraft({ imageName: lastImageSignal, imageUrl: form.avatarUrl }, true)}
                        type="button"
                      >
                        <Sparkles size={15} />
                        เขียนทับด้วยดราฟต์ใหม่
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <SectionHeader
              detail="ช่องหลักควรอ่านแล้วรู้ทันทีว่าเขาเป็นใคร น่าสนใจตรงไหน และเริ่มคุยยังไง"
              icon={Bot}
              step="2"
              title="ข้อมูลหลัก"
            />

            <div className="grid gap-3">
              <FieldBlock label="ชื่อตัวละคร">
                <input
                  className={inputClass}
                  data-testid="creator-name"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="เช่น มาปราง"
                />
              </FieldBlock>
              <FieldBlock label="คำโปรยสั้นๆ">
                <input
                  className={inputClass}
                  data-testid="creator-tagline"
                  value={form.tagline}
                  onChange={(event) => update('tagline', event.target.value)}
                  placeholder="ประโยคที่ทำให้คนอยากกดเข้าไปคุย"
                />
              </FieldBlock>
            </div>

            <FieldBlock label="คำอธิบายตัวละคร">
              <textarea
                className={textareaClass}
                data-testid="creator-description"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="สรุปบุคลิก โทนเรื่อง และสิ่งที่ผู้เล่นจะเจอ"
              />
            </FieldBlock>

            <FieldBlock label="ข้อความทักทาย">
              <textarea
                className={textareaClass}
                data-testid="creator-greeting"
                value={form.greeting}
                onChange={(event) => update('greeting', event.target.value)}
                placeholder="ข้อความแรกที่ตัวละครพูดกับผู้เล่น"
              />
            </FieldBlock>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <SectionHeader
              detail="ส่วนนี้คือแกนที่ทำให้ AI เล่นบทได้คงที่และไม่หลุดโทน"
              icon={MessageSquareText}
              step="3"
              title="บุคลิก ฉาก และข้อจำกัด"
            />

            <FieldBlock label="พรอมป์ระบบ / บุคลิกตัวละคร">
              <textarea
                className={`${textareaClass} min-h-36`}
                data-testid="creator-system-prompt"
                value={form.systemPrompt}
                onChange={(event) => update('systemPrompt', event.target.value)}
                placeholder="เขียนบุคลิก วิธีพูด ความลับ แรงจูงใจ และขอบเขตการเล่นบท"
              />
            </FieldBlock>

            <FieldBlock label="ฉากเปิดเรื่อง">
              <textarea
                className={textareaClass}
                data-testid="creator-scenario"
                value={form.scenario}
                onChange={(event) => update('scenario', event.target.value)}
                placeholder="สถานการณ์เริ่มต้นก่อนผู้เล่นส่งข้อความแรก"
              />
            </FieldBlock>

            <details className="rounded-xl border border-white/5 bg-[#0b0d1f]/40" open>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-black text-white">
                รายละเอียดขั้นสูงจากดราฟต์
                <ChevronDown size={17} />
              </summary>
              <div className="grid gap-3 border-t border-white/5 p-3.5">
                <FieldBlock label="ประวัติตัวละคร">
                  <textarea
                    className={textareaClass}
                    value={form.biography}
                    onChange={(event) => update('biography', event.target.value)}
                    placeholder="พื้นหลัง ความทรงจำ ความสัมพันธ์เดิม หรือปมในอดีต"
                  />
                </FieldBlock>
                <FieldBlock label="แกนบุคลิก">
                  <textarea
                    className={textareaClass}
                    value={form.characterAnchor}
                    onChange={(event) => update('characterAnchor', event.target.value)}
                    placeholder="นิยามสั้นๆ ที่ล็อกนิสัย น้ำเสียง และการตัดสินใจ"
                  />
                </FieldBlock>
                <FieldBlock label="สรุปพรอมป์แบบสั้น">
                  <textarea
                    className={textareaClass}
                    value={form.compactPrompt}
                    onChange={(event) => update('compactPrompt', event.target.value)}
                    placeholder="สรุปสำหรับใช้แนบระบบแชทแบบกระชับ"
                  />
                </FieldBlock>
                <FieldBlock label="ข้อจำกัด/ขอบเขต">
                  <textarea
                    className={textareaClass}
                    value={form.constraints}
                    onChange={(event) => update('constraints', event.target.value)}
                    placeholder="สิ่งที่ตัวละครควรเลี่ยง วิธีรับมือสถานการณ์เสี่ยง หรือข้อห้ามเฉพาะเรื่อง"
                  />
                </FieldBlock>
              </div>
            </details>
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <SectionHeader
              detail="แท็กจะถูกใช้ทั้งหน้าสำรวจ ระบบความสัมพันธ์ และตัวกรองความเหมาะสม"
              icon={Tags}
              step="4"
              title="แท็กและความสัมพันธ์"
            />

            <FieldBlock label="แท็ก" hint="คั่นด้วยคอมมา เช่น บทบาทสมมุติ, ไทย, ค่อยๆพัฒนา, อบอุ่น">
              <input
                className={inputClass}
                data-testid="creator-tags"
                value={form.tags}
                onChange={(event) => update('tags', event.target.value)}
                placeholder="บทบาทสมมุติ, ไทย"
              />
            </FieldBlock>

            <CreatorReadinessPanel analysis={tagAnalysis} />

            <div className="rounded-xl border border-white/5 bg-[#0b0d1f]/40 p-3.5 text-xs leading-relaxed text-slate-400">
              <p className="m-0 font-black text-white">
                แท็กค้นหา {tagAnalysis.discovery.length}, แท็กระบบ {tagAnalysis.engine.length}, แท็กความปลอดภัย {tagAnalysis.safety.length}
              </p>
              {tagAnalysis.unknown.length > 0 && <p className="mt-1 mb-0">แท็กที่ยังไม่รู้จัก: {tagAnalysis.unknown.join(', ')}</p>}
              {tagAnalysis.issues.length === 0 && (
                <p className="mt-2 mb-0 flex items-center gap-2 font-black text-emerald-300">
                  <CheckCircle2 size={15} />
                  ยังไม่พบแท็กที่ขัดแย้งกัน
                </p>
              )}
              {tagAnalysis.issues.map((issue) => (
                <p
                  className={`mt-2 mb-0 flex items-start gap-2 font-bold ${
                    issue.level === 'danger' ? 'text-rose-400' : 'text-amber-300'
                  }`}
                  key={issue.message}
                >
                  <AlertTriangle className="mt-0.5 flex-none" size={15} />
                  {issue.message}
                </p>
              ))}
            </div>

            <RelationshipPresetPicker tags={form.tags} onApply={(tags) => update('tags', tags)} />
          </div>

          <div className="grid gap-4 p-4 sm:p-5">
            <SectionHeader
              detail="จำลองบทสนทนาสั้นๆ เพื่อดูว่าความสัมพันธ์และอีเวนต์เริ่มเดินถูกทางไหม"
              icon={WandSparkles}
              step="5"
              title="ลองบทก่อนเผยแพร่"
            />
            <RelationshipPreviewPanel tags={form.tags} onPreviewComplete={() => setHasPreviewRun(true)} />
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-white/5 bg-[#0b0d1f]/95 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0 text-xs font-bold leading-5 text-slate-500">
              <span className="block font-bold text-white">{status.readinessLabel}</span>
              {note ? <span>{note}</span> : <span>สร้างเป็นดราฟต์ส่วนตัวก่อน แล้วค่อยตรวจในหน้าโปรไฟล์ตัวละคร</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={quietButtonClass}
                onClick={() => {
                  setForm(emptyCharacter)
                  setCreatorBrief('')
                  setStoredAvatarSource('none')
                  setHasImageDraft(false)
                  setHasPreviewRun(false)
                  setLastImageSignal('')
                  setGeneratedImages([])
                  setImageStyle('')
                  clearLocalCreatorDraft()
                  updateCreatorDraft(null).catch(() => {})
                  setNote('ล้างฟอร์มแล้ว')
                }}
                type="button"
              >
                ล้างฟอร์ม
              </button>
              <button type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-4.5 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-60 missai-glow"
                aria-disabled={Boolean(submitDisabledReason)}
                data-testid="creator-submit"
                disabled={!canSubmit}
                onClick={submit}
                title={submitDisabledReason || 'สร้างดราฟต์ตัวละคร'}
              >
                {isSaving ? 'กำลังสร้าง...' : hasDangerConflict ? 'แก้แท็กที่ขัดแย้งก่อน' : 'สร้างดราฟต์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
