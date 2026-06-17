import type { FormEvent } from 'react'
import { Compass, Film, Image as ImageIcon, LayoutGrid, RefreshCw, Sparkles, Upload, Video, X } from 'lucide-react'
import type { Character } from '../../lib/api'
import {
  AI_CREATOR_IMAGE_ACCEPT_LABEL,
  AI_CREATOR_IMAGE_TEMPLATES,
  AI_CREATOR_MOTION_TEMPLATES,
  AI_CREATOR_STYLE_PRESETS,
  AI_CREATOR_VIDEO_ACCEPT_LABEL,
  AI_CREATOR_VIDEO_MAX_SECONDS,
  AI_CREATOR_VIDEO_MIN_SECONDS,
  type AiCreatorImageTemplate,
  type AiCreatorMode,
  type AiCreatorUploadPreview,
} from '../../lib/aiCreator'

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
  onTemplateClick: (template: AiCreatorImageTemplate) => void
}

function activeTabClass(isActive: boolean) {
  return isActive
    ? 'bg-[#ac4bff]/15 border-[#ac4bff] text-[#ac4bff] shadow-[0_0_12px_rgba(172,75,255,0.15)]'
    : 'border-white/5 bg-[#0b0d1f]/60 text-slate-400 hover:text-white hover:bg-white/10'
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
  onTemplateClick,
}: AiCreatorControlPanelProps) {
  return (
    <div className="missai-card rounded-3xl p-6 space-y-6 shadow-2xl">
      <div className="missai-rail border-b border-white/10 pb-2">
        <button
          type="button"
          data-testid="ai-creator-tab-image"
          className={`missai-tab rounded-xl px-4 py-2.5 text-xs ${activeTabClass(activeTab === 'image')}`}
          onClick={() => onTabChange('image')}
          aria-pressed={activeTab === 'image'}
          title="แท็บการสร้างภาพร่างระบบ"
          aria-label="แท็บการสร้างภาพร่างระบบ"
        >
          <span className="flex items-center gap-1.5">
            <ImageIcon size={14} />
            ภาพร่างระบบ
          </span>
        </button>

        <button
          type="button"
          data-testid="ai-creator-tab-video"
          className={`missai-tab rounded-xl px-4 py-2.5 text-xs ${activeTabClass(activeTab === 'video')}`}
          onClick={() => onTabChange('video')}
          aria-pressed={activeTab === 'video'}
          title="แท็บการเรนเดอร์วิดีโอเคลื่อนไหว"
          aria-label="แท็บการเรนเดอร์วิดีโอเคลื่อนไหว"
        >
          <span className="flex items-center gap-1.5">
            <Video size={14} />
            วิดีโอระดับสูง
          </span>
        </button>

        <button
          type="button"
          data-testid="ai-creator-tab-template"
          className={`missai-tab rounded-xl px-4 py-2.5 text-xs ${activeTabClass(activeTab === 'template')}`}
          onClick={() => onTabChange('template')}
          aria-pressed={activeTab === 'template'}
          title="แท็บเทมเพลตภาพร่างสำเร็จรูป"
          aria-label="แท็บเทมเพลตภาพร่างสำเร็จรูป"
        >
          <span className="flex items-center gap-1.5">
            <LayoutGrid size={14} />
            แม่แบบสไตล์
          </span>
        </button>
      </div>

      {activeTab !== 'template' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400">
              เลือกตัวละครเป้าหมาย (Targeting Character)
            </label>
            <select
              className="missai-input block rounded-xl p-3 text-xs"
              value={selectedCharacterId}
              onChange={(event) => onSelectedCharacterIdChange(event.target.value)}
              disabled={isGenerating}
              title="เลือกตัวละครเป้าหมาย"
              aria-label="เลือกตัวละครเป้าหมาย"
            >
              <option value="">ภาพรวมระบบ / ยังไม่เจาะจงตัวละคร</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400">
              ปูบริบทเบื้องหลัง / ประวัติย่อของตัวละคร
            </label>
            <textarea
              data-testid="ai-creator-brief"
              rows={3}
              placeholder="เช่น: เจ้าหน้าที่ฝ่ายความมั่นคงแห่งโลกอนาคตผู้เงียบขรึม..."
              className="missai-input block min-h-28 resize-none rounded-xl p-3.5 text-xs"
              value={brief}
              onChange={(event) => onBriefChange(event.target.value)}
              disabled={isGenerating}
              title="ปูบริบทเบื้องหลังของตัวละคร"
              aria-label="ปูบริบทเบื้องหลังของตัวละคร"
            />
          </div>
        </div>
      )}

      {activeTab === 'image' && (
        <form onSubmit={onGenerate} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400">
              รายละเอียดคำสั่งภาพที่ต้องการ (Image Prompt)
            </label>
            <textarea
              data-testid="ai-creator-image-prompt"
              rows={3}
              placeholder="เช่น: realistic portrait, glowing holographic jacket, rain reflection, cyber fantasy..."
              className="missai-input block min-h-28 resize-none rounded-xl p-3.5 text-xs"
              value={imagePrompt}
              onChange={(event) => onImagePromptChange(event.target.value)}
              disabled={isGenerating}
              title="รายละเอียดคำสั่งภาพที่ต้องการ"
              aria-label="รายละเอียดคำสั่งภาพที่ต้องการ"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">
              สไตล์และรูปแบบความพรีเมียม (Style Presets)
            </label>
            <div className="flex flex-wrap gap-2">
              {AI_CREATOR_STYLE_PRESETS.map((preset) => {
                const isActive = imageStyle === preset.value
                return (
                  <button
                    type="button"
                    key={preset.value}
                    onClick={() => onImageStyleChange(preset.value)}
                    disabled={isGenerating}
                    className={`missai-tab rounded-xl px-3.5 py-2 text-xs ${activeTabClass(isActive)}`}
                    title={`สไตล์ ${preset.label}`}
                    aria-label={`สไตล์ ${preset.label}`}
                    aria-pressed={isActive}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">
              ภาพต้นแบบอ้างอิง (Image Reference - ControlNet)
            </label>
            {referenceImage ? (
              <div className="missai-card relative flex items-center justify-between overflow-hidden rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <img src={referenceImage} alt="Reference Preview" className="w-12 h-12 object-cover rounded-lg" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {referenceImageMeta?.name || 'โหลดภาพอ้างอิงแล้ว'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#6b7280]">
                      {referenceImageMeta
                        ? `${referenceImageMeta.typeLabel} · ${referenceImageMeta.sizeLabel}`
                        : 'รอข้อมูลไฟล์'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearImageReference}
                  className="missai-icon-button size-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  title="ลบรูปภาพอ้างอิง"
                  aria-label="ลบรูปภาพอ้างอิง"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="missai-card group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 p-6 text-center transition hover:border-[#ac4bff]/50 hover:bg-white/5">
                <input
                  type="file"
                  data-testid="ai-creator-image-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onImageReferenceFile(file, event.currentTarget)
                  }}
                  disabled={isGenerating}
                  title="เลือกรูปภาพอ้างอิง"
                  aria-label="เลือกรูปภาพอ้างอิง"
                />
                <Upload size={24} className="text-[#6b7280] group-hover:text-[#ac4bff] transition mb-2" />
                <span className="text-xs font-semibold text-slate-400">อัปโหลดภาพท่าทางอ้างอิง</span>
                <span className="text-[10px] text-[#6b7280] mt-1">{AI_CREATOR_IMAGE_ACCEPT_LABEL} (สูงสุด 10MB)</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            data-testid="ai-creator-image-generate"
            className="missai-button-primary min-h-12 w-full rounded-xl text-xs disabled:opacity-50"
            disabled={Boolean(imageGenerateBlockReason)}
            title={imageGenerateBlockReason || 'ประมวลผลข้อมูลโครงร่างตัวละคร'}
            aria-label={imageGenerateBlockReason || 'ประมวลผลข้อมูลโครงร่างตัวละคร'}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                กำลังส่งประมวลผลโครงร่างภาพ...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                ส่งประมวลผลโครงร่างภาพร่างระบบ
              </>
            )}
          </button>
        </form>
      )}

      {activeTab === 'video' && (
        <form onSubmit={onGenerate} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#9ca3af]">
              คำสั่งการขยับมุมกล้อง / ท่าทางวิดีโอ (Video Prompt)
            </label>
            <textarea
              data-testid="ai-creator-video-prompt"
              rows={3}
              placeholder="เช่น: gentle smile, wind blowing hair, golden dust particles flying, epic tracking camera..."
              className="missai-input block min-h-28 resize-none rounded-xl p-3.5 text-xs"
              value={videoPrompt}
              onChange={(event) => onVideoPromptChange(event.target.value)}
              disabled={isGenerating}
              title="คำสั่งขยับมุมกล้องวิดีโอ"
              aria-label="คำสั่งขยับมุมกล้องวิดีโอ"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-400">
                ความยาวของชิ้นงานวิดีโอ (Duration)
              </label>
              <span className="text-xs font-semibold text-white bg-[#ac4bff]/20 border border-[#ac4bff]/30 px-2 py-0.5 rounded-md">
                {videoDuration} วินาที
              </span>
            </div>
            <div className="missai-card flex items-center gap-3 rounded-xl p-3.5">
              <span className="text-xs text-[#6b7280]">3s</span>
              <input
                type="range"
                min={AI_CREATOR_VIDEO_MIN_SECONDS}
                max={AI_CREATOR_VIDEO_MAX_SECONDS}
                step={1}
                value={videoDuration}
                onChange={(event) => onVideoDurationChange(Number(event.target.value))}
                disabled={isGenerating}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#ac4bff]"
                style={{
                  background: `linear-gradient(to right, #ac4bff 0%, #ac4bff ${videoDurationFillPercent}%, rgba(255,255,255,0.1) ${videoDurationFillPercent}%, rgba(255,255,255,0.1) 100%)`,
                }}
                title="ความยาวของชิ้นงานวิดีโอ"
                aria-label="ความยาวของชิ้นงานวิดีโอ"
              />
              <span className="text-xs text-[#6b7280]">10s</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">
              รูปแบบทิศทางขยับมุมกล้อง (Camera Motion)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AI_CREATOR_MOTION_TEMPLATES.map((template) => (
                <button
                  type="button"
                  key={template.val}
                  onClick={() => onVideoTemplateChange(template.val)}
                  disabled={isGenerating}
                  className={`missai-tab justify-start rounded-xl px-3.5 py-2.5 text-left text-[10px] ${activeTabClass(videoTemplate === template.val)}`}
                  title={`ทิศทางกล้อง ${template.label}`}
                  aria-label={`ทิศทางกล้อง ${template.label}`}
                  aria-pressed={videoTemplate === template.val}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400">
              วิดีโอเป้าหมายอ้างอิง (Target Video Reference)
            </label>
            {referenceVideo ? (
              <div className="missai-card relative flex items-center justify-between overflow-hidden rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <Film size={18} className="text-[#ac4bff]" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {referenceVideoMeta?.name || referenceVideo || `อ้างอิงวิดีโอ_${videoDuration}s.mp4`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#6b7280]">
                      {referenceVideoMeta
                        ? `${referenceVideoMeta.typeLabel} · ${referenceVideoMeta.sizeLabel}`
                        : `ความยาวเป้าหมาย ${videoDuration}s`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearVideoReference}
                  className="missai-icon-button size-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  title="ลบวิดีโออ้างอิง"
                  aria-label="ลบวิดีโออ้างอิง"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="missai-card group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 p-6 text-center transition hover:border-[#ac4bff]/50 hover:bg-white/5">
                <input
                  type="file"
                  data-testid="ai-creator-video-upload"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onVideoReferenceFile(file, event.currentTarget)
                  }}
                  disabled={isGenerating}
                  title="เลือกวิดีโออ้างอิง"
                  aria-label="เลือกวิดีโออ้างอิง"
                />
                <Upload size={24} className="text-[#6b7280] group-hover:text-[#ac4bff] transition mb-2" />
                <span className="text-xs font-semibold text-slate-400">อัปโหลดวิดีโอเคลื่อนไหวอ้างอิง</span>
                <span className="text-[10px] text-[#6b7280] mt-1">{AI_CREATOR_VIDEO_ACCEPT_LABEL} (สูงสุด 50MB)</span>
              </label>
            )}
          </div>

          <button
            type="submit"
            data-testid="ai-creator-video-generate"
            className="missai-button-primary min-h-12 w-full rounded-xl text-xs disabled:opacity-50"
            disabled={Boolean(videoGenerateBlockReason)}
            title={videoGenerateBlockReason || 'ประมวลผลวิดีโอระบบ'}
            aria-label={videoGenerateBlockReason || 'ประมวลผลวิดีโอระบบ'}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                กำลังส่งประมวลผลเรนเดอร์วิดีโอ...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                ส่งประมวลผลเรนเดอร์วิดีโอระดับสูง
              </>
            )}
          </button>
          {videoGenerateBlockReason && (
            <div
              data-testid="ai-creator-video-contract-state"
              className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3.5 py-3 text-[11px] leading-relaxed text-amber-100"
            >
              <p className="font-semibold text-amber-200">{videoGenerateBlockReason}</p>
              <p className="mt-1 text-amber-100/80">{videoProviderNotice}</p>
            </div>
          )}
        </form>
      )}

      {activeTab === 'template' && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-[#9ca3af]">
            ⚡ เลือกพรีเซ็ตเทมเพลตสไตล์ยอดนิยมเพื่อกรอกพารามิเตอร์และสเก็ตช์ภาพร่างระบบแบบเร็วทันที:
          </p>
          <div className="grid gap-3">
            {AI_CREATOR_IMAGE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => onTemplateClick(template)}
                disabled={isGenerating}
                className={`w-full text-left p-4 rounded-xl border border-white/10 bg-gradient-to-br ${template.bgClass} hover:border-[#ac4bff]/50 hover:shadow-[0_0_15px_rgba(172,75,255,0.15)] transition-all duration-300 relative overflow-hidden group`}
                type="button"
                title={`ใช้งานพรีเซ็ต ${template.title}`}
              >
                <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-30 transition duration-300">
                  <Compass size={40} className="text-white" />
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded bg-white/10 text-[9px] font-black text-purple-300 mb-2">
                  {template.tag}
                </span>
                <h4 className="text-xs font-bold text-white">{template.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {template.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          className="missai-empty flex gap-2 rounded-xl border-[#ac4bff]/20 bg-[#ac4bff]/10 p-3.5 text-xs font-semibold leading-relaxed text-[#d9b3ff]"
          data-testid="ai-creator-status"
        >
          <span className="flex-shrink-0">ℹ️</span>
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  )
}
