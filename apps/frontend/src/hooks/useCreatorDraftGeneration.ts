import { useState, type Dispatch, type SetStateAction } from 'react'
import { generateCreatorAiDraft, uploadAvatar, type CreatorAiDraftResponse } from '../lib/api'
import { currentRoutePath, trackFrontendEventSafe } from '../lib/analytics'
import {
  buildCharacterDraftFromImage,
  buildGeneratedAvatarDataUrl,
  mergeDraftTags,
} from '../lib/characterDraft'
import {
  emptyCharacter,
  withCreatorUiTimeout,
  type CreatorDraftStatus,
} from '../lib/creatorFormState'

type CreatorFormState = typeof emptyCharacter
type GeneratedImage = { url: string; source: CreatorDraftStatus['avatarSource'] }

type CreatorDraftGenerationParams = {
  creatorBrief: string
  form: CreatorFormState
  imageStyle: string
  lastImageSignal: string
  setForm: Dispatch<SetStateAction<CreatorFormState>>
  setGeneratedImages: Dispatch<SetStateAction<GeneratedImage[]>>
  setHasImageDraft: (value: boolean) => void
  setLastImageSignal: (signal: string) => void
  setNote: (note: string) => void
  setStoredAvatarSource: (source: CreatorDraftStatus['avatarSource']) => void
}

export function useCreatorDraftGeneration({
  creatorBrief,
  form,
  imageStyle,
  lastImageSignal,
  setForm,
  setGeneratedImages,
  setHasImageDraft,
  setLastImageSignal,
  setNote,
  setStoredAvatarSource,
}: CreatorDraftGenerationParams) {
  const [isUploading, setIsUploading] = useState(false)
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)

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
      trackFrontendEventSafe({
        eventName: 'creator_draft_generated',
        route: currentRoutePath(),
        entityType: 'creator_draft',
        entityId: imageOnly ? 'image_only' : 'full_draft',
        metadata: { imageOnly, imageProvider: result.image.provider, source: result.source },
      })
    } catch {
      const imageUrl = buildGeneratedAvatarDataUrl({ imagePrompt: source })
      setLastImageSignal(source)
      applyImageDraft({ imagePrompt: source, imageUrl }, true)
      setNote('ระบบสร้างร่างในเครื่องให้ก่อน คุณแก้รายละเอียดต่อได้ทันที')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  return {
    applyImageDraft,
    generateImageDraft,
    handleAvatarFile,
    isGeneratingDraft,
    isUploading,
  }
}
