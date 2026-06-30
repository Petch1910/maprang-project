import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Images,
  Library,
  Lock,
  RefreshCw,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
  X,
} from 'lucide-react'
import type { Character } from '../../lib/api'
import {
  AI_CREATOR_IMAGE_ACCEPT_LABEL,
  AI_CREATOR_IMAGE_TEMPLATES,
  AI_CREATOR_MOTION_TEMPLATES,
  AI_CREATOR_VIDEO_ACCEPT_LABEL,
  AI_CREATOR_VIDEO_MAX_SECONDS,
  AI_CREATOR_VIDEO_MIN_SECONDS,
  type AiCreatorMode,
  type AiCreatorUploadPreview,
} from '../../lib/aiCreator'

const heroImage = new URL('../../assets/hero.png', import.meta.url).href

type AiCreatorControlPanelProps = {
  activeTab: AiCreatorMode
  characters: Character[]
  selectedCharacterId: string
  brief: string
  imagePrompt: string
  imageStyle: string
  referenceImage: string | null
  referenceImageMeta: AiCreatorUploadPreview | null
  videoPrompt: string
  videoDuration: number
  videoDurationFillPercent: number
  videoTemplate: string
  referenceVideo: string | null
  referenceVideoMeta: AiCreatorUploadPreview | null
  isGenerating: boolean
  statusMessage: string
  imageGenerateBlockReason: string | null
  videoGenerateBlockReason: string | null
  videoProviderNotice: string
  onTabChange: (tab: AiCreatorMode) => void
  onSelectedCharacterIdChange: (characterId: string) => void
  onBriefChange: (brief: string) => void
  onImagePromptChange: (prompt: string) => void
  onImageStyleChange: (style: string) => void
  onImageReferenceFile: (file: File, input: HTMLInputElement) => void
  onClearImageReference: () => void
  onVideoPromptChange: (prompt: string) => void
  onVideoDurationChange: (duration: number) => void
  onVideoTemplateChange: (template: string) => void
  onVideoReferenceFile: (file: File, input: HTMLInputElement) => void
  onClearVideoReference: () => void
  onGenerate: (event: FormEvent<HTMLFormElement>) => void
}

type WorkspaceSurface = AiCreatorMode | 'advancedVideo'

const WORKSPACE_TABS: ReadonlyArray<{
  id: WorkspaceSurface
  mode: AiCreatorMode
  label: string
  description: string
  icon: typeof ImageIcon
  testId: string
}> = [
  {
    id: 'image',
    mode: 'image',
    label: 'รูปภาพ',
    description: 'สร้างภาพจากคำสั่ง',
    icon: ImageIcon,
    testId: 'ai-creator-tab-image',
  },
  {
    id: 'template',
    mode: 'template',
    label: 'รูป+รูป',
    description: 'ใช้รูปอ้างอิงและแม่แบบ',
    icon: Images,
    testId: 'ai-creator-tab-template',
  },
  {
    id: 'video',
    mode: 'video',
    label: 'วิดีโอ',
    description: 'เตรียม prompt สำหรับวิดีโอ',
    icon: Video,
    testId: 'ai-creator-tab-video',
  },
  {
    id: 'advancedVideo',
    mode: 'video',
    label: 'วิดีโอขั้นสูง',
    description: 'หน้าจอเตรียมต่อบริการจริง',
    icon: Film,
    testId: 'ai-creator-tab-advanced-video',
  },
]

const STYLE_PRESETS = [
  { value: 'realistic', label: 'ภาพสมจริง' },
  { value: 'anime', label: 'อนิเมะ' },
  { value: '3d_render', label: 'สามมิติ' },
  { value: 'cyberpunk', label: 'ไซเบอร์พังก์' },
  { value: 'oil_painting', label: 'สีน้ำมัน' },
] as const

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '5:8'] as const

const TEMPLATE_META: Record<string, { title: string; subtitle: string; cost: number; tier: string }> = {
  'neon-tokyo': { title: 'ตัวละครหญิงสไตล์นีออน', subtitle: 'ภาพเดี่ยว คุม mood และแสงเมืองกลางคืน', cost: 600, tier: 'ภาพ' },
  'cozy-anime': { title: 'อนิเมะคาเฟ่', subtitle: 'โทนอบอุ่น เหมาะกับการ์ดตัวละคร', cost: 600, tier: 'ภาพ' },
  'fantasy-forest': { title: 'แฟนตาซีป่าเวทมนตร์', subtitle: 'ใช้กับ lore และตัวละครโลกแฟนตาซี', cost: 600, tier: 'ภาพ' },
  'classical-oil': { title: 'ภาพสีน้ำมันคลาสสิก', subtitle: 'โปรไฟล์ทางการและภาพปก', cost: 600, tier: 'ภาพ' },
}

function activeClass(isActive: boolean) {
  return isActive
    ? 'border-[#ac4bff] bg-[#ac4bff] text-white shadow-[0_0_24px_rgba(172,75,255,0.35)]'
    : 'border-white/10 bg-[#15162b] text-slate-300 hover:border-[#ac4bff]/45 hover:bg-white/7 hover:text-white'
}

function UploadDropzone({
  accept,
  disabled,
  helper,
  label,
  preview,
  previewMeta,
  testId,
  type,
  onClear,
  onFile,
}: {
  accept: string
  disabled: boolean
  helper: string
  label: string
  preview: string | null
  previewMeta: AiCreatorUploadPreview | null
  testId: string
  type: 'image' | 'video'
  onClear: () => void
  onFile: (file: File, input: HTMLInputElement) => void
}) {
  if (preview) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111327] p-3">
        <div className="flex items-center gap-3">
          {type === 'image' ? (
            <img alt="รูปอ้างอิง" className="size-14 rounded-lg object-cover ring-1 ring-white/10" src={preview} />
          ) : (
            <div className="grid size-14 place-items-center rounded-lg bg-[#080a1a] text-[#ac4bff] ring-1 ring-white/10">
              <Film size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-white">{previewMeta?.name || label}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">
              {previewMeta ? `${previewMeta.typeLabel} · ${previewMeta.sizeLabel}` : helper}
            </p>
          </div>
          <button
            aria-label={`ลบ${label}`}
            className="missai-icon-button size-9 rounded-lg text-rose-300"
            disabled={disabled}
            onClick={onClear}
            title={`ลบ${label}`}
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <label className="group flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/12 bg-[#111327] px-4 py-5 text-center transition hover:border-[#ac4bff]/65 hover:bg-[#191a32]">
      <input
        accept={accept}
        aria-label={`เลือก${label}`}
        className="hidden"
        data-testid={testId}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file, event.currentTarget)
        }}
        title={`เลือก${label}`}
        type="file"
      />
      <Upload className="mb-2 text-slate-500 transition group-hover:text-[#ac4bff]" size={22} />
      <span className="text-xs font-black text-slate-200">{label}</span>
      <span className="mt-1 text-[11px] font-bold text-slate-500">{helper}</span>
    </label>
  )
}

export function AiCreatorControlPanel({
  activeTab,
  characters,
  selectedCharacterId,
  brief,
  imagePrompt,
  imageStyle,
  referenceImage,
  referenceImageMeta,
  videoPrompt,
  videoDuration,
  videoDurationFillPercent,
  videoTemplate,
  referenceVideo,
  referenceVideoMeta,
  isGenerating,
  statusMessage,
  imageGenerateBlockReason,
  videoGenerateBlockReason,
  videoProviderNotice,
  onTabChange,
  onSelectedCharacterIdChange,
  onBriefChange,
  onImagePromptChange,
  onImageStyleChange,
  onImageReferenceFile,
  onClearImageReference,
  onVideoPromptChange,
  onVideoDurationChange,
  onVideoTemplateChange,
  onVideoReferenceFile,
  onClearVideoReference,
  onGenerate,
}: AiCreatorControlPanelProps) {
  const [surface, setSurface] = useState<WorkspaceSurface>('image')
  const [selectedTemplateId, setSelectedTemplateId] = useState(AI_CREATOR_IMAGE_TEMPLATES[0]?.id ?? '')
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>('1:1')
  const [promptOptimize, setPromptOptimize] = useState(true)

  useEffect(() => {
    setSurface((current) => {
      if (activeTab === 'video') return current === 'advancedVideo' || current === 'video' ? current : 'video'
      return activeTab
    })
  }, [activeTab])

  const selectedTemplate = useMemo(
    () => AI_CREATOR_IMAGE_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? AI_CREATOR_IMAGE_TEMPLATES[0],
    [selectedTemplateId],
  )
  const selectedTemplateMeta = TEMPLATE_META[selectedTemplate.id] ?? {
    title: selectedTemplate.title,
    subtitle: selectedTemplate.prompt,
    cost: 600,
    tier: selectedTemplate.tag,
  }
  const isVideoSurface = surface === 'video' || surface === 'advancedVideo'
  const activeBlockReason = isVideoSurface ? videoGenerateBlockReason : imageGenerateBlockReason
  const generateCost = surface === 'advancedVideo' ? 12000 : isVideoSurface ? 6000 : 600

  const switchSurface = (nextSurface: WorkspaceSurface) => {
    setSurface(nextSurface)
    onTabChange(nextSurface === 'advancedVideo' ? 'video' : nextSurface)
  }

  const applyTemplate = (templateId: string) => {
    const template = AI_CREATOR_IMAGE_TEMPLATES.find((candidate) => candidate.id === templateId)
    if (!template) return
    setSelectedTemplateId(template.id)
    onImagePromptChange(template.prompt)
    onImageStyleChange(template.style)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-[#111327]/86 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.38)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300">
            <Sparkles size={15} className="text-[#ac4bff]" />
            <span>เครดิตทดลองสำหรับสร้างงาน</span>
          </div>
          <span className="text-sm font-black text-white">1,952</span>
        </div>
      </div>

      <div className="missai-rail">
        {WORKSPACE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = surface === tab.id
          return (
            <button
              aria-label={tab.label}
              aria-pressed={isActive}
              className={`missai-tab shrink-0 rounded-lg px-3 py-2 text-xs ${activeClass(isActive)}`}
              data-testid={tab.testId}
              disabled={isGenerating}
              key={tab.id}
              onClick={() => switchSurface(tab.id)}
              title={`${tab.label}: ${tab.description}`}
              type="button"
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <form className="space-y-5" onSubmit={onGenerate}>
        <div className="grid gap-4 lg:grid-cols-[10rem_1fr]">
          <button
            aria-label={`เลือกแม่แบบ ${selectedTemplateMeta.title}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-[#ac4bff]/75 bg-[#080a1a] text-left shadow-[0_0_22px_rgba(172,75,255,0.18)]"
            onClick={() => applyTemplate(selectedTemplate.id)}
            title={`แม่แบบที่เลือก: ${selectedTemplateMeta.title}`}
            type="button"
          >
            <img alt={selectedTemplateMeta.title} className="h-full w-full object-cover opacity-85 transition group-hover:scale-105" src={heroImage} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/86 to-transparent p-3">
              <span className="rounded-md bg-black/55 px-2 py-1 text-[10px] font-black text-white">{selectedTemplateMeta.tier}</span>
              <p className="mt-2 line-clamp-2 text-xs font-black text-white">{selectedTemplateMeta.title}</p>
              <p className="mt-1 text-[10px] font-black text-slate-300">{selectedTemplateMeta.cost} เครดิต</p>
            </div>
            <CheckCircle2 className="absolute right-2 top-2 text-[#ac4bff]" size={20} />
          </button>

          <div className="grid gap-2 sm:grid-cols-2">
            {AI_CREATOR_IMAGE_TEMPLATES.map((template) => {
              const meta = TEMPLATE_META[template.id] ?? {
                title: template.title,
                subtitle: template.prompt,
                cost: 600,
                tier: template.tag,
              }
              const isActive = selectedTemplate.id === template.id
              return (
                <button
                  aria-label={`ใช้แม่แบบ ${meta.title}`}
                  aria-pressed={isActive}
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${activeClass(isActive)}`}
                  disabled={isGenerating}
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  title={meta.subtitle}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black">{meta.title}</span>
                    <span className="block truncate text-[10px] font-bold opacity-70">{meta.subtitle}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-black opacity-80">{meta.cost}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300" htmlFor="ai-creator-character">
              ตัวละครเป้าหมาย
            </label>
            <select
              aria-label="เลือกตัวละครเป้าหมาย"
              className="missai-input rounded-xl text-xs"
              disabled={isGenerating}
              id="ai-creator-character"
              onChange={(event) => onSelectedCharacterIdChange(event.target.value)}
              title="เลือกตัวละครเป้าหมาย"
              value={selectedCharacterId}
            >
              <option value="">ไม่เจาะจงตัวละคร</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-300">สไตล์ภาพ</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((preset) => {
                const isActive = imageStyle === preset.value
                return (
                  <button
                    aria-label={`สไตล์ ${preset.label}`}
                    aria-pressed={isActive}
                    className={`missai-tab rounded-lg px-3 text-[11px] ${activeClass(isActive)}`}
                    disabled={isGenerating}
                    key={preset.value}
                    onClick={() => onImageStyleChange(preset.value)}
                    title={`สไตล์ ${preset.label}`}
                    type="button"
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-300" htmlFor="ai-creator-brief">
            บริบทตัวละคร
          </label>
          <textarea
            aria-label="บริบทตัวละคร"
            className="missai-input min-h-24 resize-none rounded-xl text-xs"
            data-testid="ai-creator-brief"
            disabled={isGenerating}
            id="ai-creator-brief"
            onChange={(event) => onBriefChange(event.target.value)}
            placeholder="สรุปบุคลิก ความสัมพันธ์ ฉาก หรือ mood ที่ต้องการให้ระบบนำไปประกอบภาพและ draft ตัวละคร"
            title="บริบทตัวละคร"
            value={brief}
          />
        </div>

        {isVideoSurface ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-300" htmlFor="ai-creator-video-prompt">
                คำสั่งวิดีโอ
              </label>
              <textarea
                aria-label="คำสั่งวิดีโอ"
                className="missai-input min-h-24 resize-none rounded-xl text-xs"
                data-testid="ai-creator-video-prompt"
                disabled={isGenerating}
                id="ai-creator-video-prompt"
                onChange={(event) => onVideoPromptChange(event.target.value)}
                placeholder="อธิบายท่าทาง กล้อง แสง จังหวะเคลื่อนไหว หรืออารมณ์ของคลิป"
                title="คำสั่งวิดีโอ"
                value={videoPrompt}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-300">
                  <span>ความยาววิดีโอ</span>
                  <span className="rounded-lg bg-white/8 px-2 py-1 text-white">{videoDuration} วินาที</span>
                </div>
                <input
                  aria-label="ความยาววิดีโอ"
                  className="w-full accent-[#ac4bff]"
                  disabled={isGenerating}
                  max={AI_CREATOR_VIDEO_MAX_SECONDS}
                  min={AI_CREATOR_VIDEO_MIN_SECONDS}
                  onChange={(event) => onVideoDurationChange(Number(event.target.value))}
                  style={{
                    background: `linear-gradient(to right, #ac4bff 0%, #ac4bff ${videoDurationFillPercent}%, rgba(255,255,255,0.1) ${videoDurationFillPercent}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                  title="ความยาววิดีโอ"
                  type="range"
                  value={videoDuration}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {AI_CREATOR_MOTION_TEMPLATES.map((template) => {
                  const isActive = videoTemplate === template.val
                  return (
                    <button
                      aria-label={`มุมกล้อง ${template.label}`}
                      aria-pressed={isActive}
                      className={`rounded-lg border px-3 py-2 text-[11px] font-black transition ${activeClass(isActive)}`}
                      disabled={isGenerating}
                      key={template.val}
                      onClick={() => onVideoTemplateChange(template.val)}
                      title={`มุมกล้อง ${template.label}`}
                      type="button"
                    >
                      {template.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <UploadDropzone
              accept="video/*"
              disabled={isGenerating}
              helper={`${AI_CREATOR_VIDEO_ACCEPT_LABEL} สูงสุด 50MB`}
              label={surface === 'advancedVideo' ? 'อัปโหลดวิดีโออ้างอิง' : 'อัปโหลดวิดีโอหรือรูปอ้างอิง'}
              onClear={onClearVideoReference}
              onFile={onVideoReferenceFile}
              preview={referenceVideo}
              previewMeta={referenceVideoMeta}
              testId="ai-creator-video-upload"
              type="video"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-300" htmlFor="ai-creator-image-prompt">
                คำสั่งรูปภาพ
              </label>
              <textarea
                aria-label="คำสั่งรูปภาพ"
                className="missai-input min-h-28 resize-none rounded-xl text-xs"
                data-testid="ai-creator-image-prompt"
                disabled={isGenerating}
                id="ai-creator-image-prompt"
                onChange={(event) => onImagePromptChange(event.target.value)}
                placeholder="อธิบายรูปที่ต้องการให้ชัด เช่น บุคลิก ชุด ฉาก แสง อารมณ์ และระดับรายละเอียด"
                title="คำสั่งรูปภาพ"
                value={imagePrompt}
              />
            </div>

            {surface === 'template' && (
              <UploadDropzone
                accept="image/*"
                disabled={isGenerating}
                helper={`${AI_CREATOR_IMAGE_ACCEPT_LABEL} สูงสุด 10MB`}
                label="อัปโหลดรูปอ้างอิง"
                onClear={onClearImageReference}
                onFile={onImageReferenceFile}
                preview={referenceImage}
                previewMeta={referenceImageMeta}
                testId="ai-creator-image-upload"
                type="image"
              />
            )}

            <div className="space-y-2">
              <p className="text-xs font-black text-slate-300">สัดส่วนภาพ</p>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => {
                  const isActive = aspectRatio === ratio
                  return (
                    <button
                      aria-label={`สัดส่วน ${ratio}`}
                      aria-pressed={isActive}
                      className={`rounded-lg border px-3 py-2 text-xs font-black transition ${activeClass(isActive)}`}
                      disabled={isGenerating}
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      title={`สัดส่วนภาพ ${ratio}`}
                      type="button"
                    >
                      {ratio}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111327] px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-300">
            <WandSparkles size={15} className="text-[#ac4bff]" />
            ปรับคำสั่งอัตโนมัติ
          </div>
          <button
            aria-label="เปิดปิดการปรับ prompt อัตโนมัติ"
            aria-pressed={promptOptimize}
            className={`relative h-6 w-11 rounded-full transition ${promptOptimize ? 'bg-[#ac4bff]' : 'bg-slate-700'}`}
            onClick={() => setPromptOptimize((value) => !value)}
            title="เปิดปิดการปรับ prompt อัตโนมัติ"
            type="button"
          >
            <span
              className={`absolute top-1 size-4 rounded-full bg-white transition ${promptOptimize ? 'left-6' : 'left-1'}`}
            />
          </button>
        </div>

        <button
          aria-label={activeBlockReason || `สร้างงาน ใช้ ${generateCost} เครดิต`}
          className="missai-button-primary min-h-12 w-full rounded-xl text-sm disabled:opacity-50"
          data-testid={isVideoSurface ? 'ai-creator-video-generate' : 'ai-creator-image-generate'}
          disabled={Boolean(activeBlockReason)}
          title={activeBlockReason || `สร้างงาน ใช้ ${generateCost} เครดิต`}
          type="submit"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="animate-spin" size={16} />
              กำลังสร้างงาน
            </>
          ) : (
            <>
              <Sparkles size={16} />
              สร้าง ใช้ {generateCost} เครดิต
            </>
          )}
        </button>

        {activeBlockReason && isVideoSurface && (
          <div
            className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3.5 py-3 text-[11px] font-bold leading-relaxed text-amber-100"
            data-testid="ai-creator-video-contract-state"
          >
            <p className="text-amber-200">{activeBlockReason}</p>
            <p className="mt-1 text-amber-100/80">{videoProviderNotice}</p>
          </div>
        )}
        {activeBlockReason && !isVideoSurface && (
          <div
            className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3.5 py-3 text-[11px] font-bold leading-relaxed text-amber-100"
            data-testid="ai-creator-image-blocked-state"
          >
            <p className="text-amber-200">{activeBlockReason}</p>
          </div>
        )}
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <a className="missai-button-secondary rounded-xl text-xs" href="#ai-creator-public-gallery">
          <Library size={14} />
          แกลเลอรีสาธารณะ
        </a>
        <a className="missai-button-secondary rounded-xl text-xs" href="#ai-creator-library">
          <BookOpen size={14} />
          คลังของฉัน
        </a>
      </div>

      {statusMessage && (
        <div
          className="rounded-xl border border-[#ac4bff]/20 bg-[#ac4bff]/10 p-3 text-xs font-bold leading-relaxed text-[#d9b3ff]"
          data-testid="ai-creator-status"
        >
          {statusMessage}
        </div>
      )}

      {surface === 'advancedVideo' && (
        <div className="rounded-xl border border-white/10 bg-[#111327] p-3 text-[11px] font-bold leading-relaxed text-slate-400">
          <div className="mb-1 flex items-center gap-2 text-slate-200">
            <Lock size={13} className="text-[#ac4bff]" />
            วิดีโอขั้นสูงยังไม่เปิดใช้จริงในเวอร์ชันเครื่องนี้
          </div>
          เมนูนี้คงไว้เพื่อให้ลำดับงาน การตรวจไฟล์ และหน้าจอพร้อมต่อบริการวิดีโอในอนาคต โดยปุ่มสร้างจะแสดงเหตุผลที่กดไม่ได้อย่างชัดเจน
        </div>
      )}
    </div>
  )
}
