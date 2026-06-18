import { type Dispatch, type SetStateAction } from 'react'
import {
  emptyCharacter,
  type CreatorDraftStatus,
} from '../lib/creatorFormState'

type CreatorFormState = typeof emptyCharacter
type GeneratedImage = { url: string; source: CreatorDraftStatus['avatarSource'] }

type CreatorFormActionsParams = {
  clearPersistedCreatorDraft: () => void
  coverImageSource: CreatorDraftStatus['avatarSource']
  coverImageUrl: string
  setCoverImageSource: (source: CreatorDraftStatus['avatarSource']) => void
  setCoverImageUrl: (url: string) => void
  setCreatorBrief: (brief: string) => void
  setForm: Dispatch<SetStateAction<CreatorFormState>>
  setGeneratedImages: Dispatch<SetStateAction<GeneratedImage[]>>
  setHasCoverDraft: (value: boolean) => void
  setHasImageDraft: (value: boolean) => void
  setHasPreviewRun: (value: boolean) => void
  setImageStyle: (style: string) => void
  setLastImageSignal: (signal: string) => void
  setNote: (note: string) => void
  setStoredAvatarSource: (source: CreatorDraftStatus['avatarSource']) => void
}

export function useCreatorFormActions({
  clearPersistedCreatorDraft,
  coverImageSource,
  coverImageUrl,
  setCoverImageSource,
  setCoverImageUrl,
  setCreatorBrief,
  setForm,
  setGeneratedImages,
  setHasCoverDraft,
  setHasImageDraft,
  setHasPreviewRun,
  setImageStyle,
  setLastImageSignal,
  setNote,
  setStoredAvatarSource,
}: CreatorFormActionsParams) {
  const clearGeneratedAvatar = () => {
    setForm((prev) => ({ ...prev, avatarUrl: '' }))
    setStoredAvatarSource('none')
    setHasImageDraft(false)
    setLastImageSignal('')
    setNote('ล้างภาพร่างระบบแล้ว วางลิงก์รูปจริงได้เลย')
  }

  const clearCoverDraft = () => {
    setCoverImageUrl('')
    setCoverImageSource('none')
    setHasCoverDraft(false)
    setNote('ล้างภาพปกจากดราฟต์แล้ว')
  }

  const resetCreatorForm = (note = 'ล้างฟอร์มแล้ว') => {
    setForm(emptyCharacter)
    setCreatorBrief('')
    setStoredAvatarSource('none')
    setHasImageDraft(false)
    setHasPreviewRun(false)
    setLastImageSignal('')
    setGeneratedImages([])
    setImageStyle('')
    clearPersistedCreatorDraft()
    setNote(note)
  }

  const useCoverAsMainImage = () => {
    if (!coverImageUrl) return
    setForm((prev) => ({ ...prev, avatarUrl: coverImageUrl }))
    setStoredAvatarSource(coverImageSource)
    setHasImageDraft(true)
    setNote('ใช้ภาพปกเป็นรูปตัวละครหลักแล้ว')
  }

  return {
    clearCoverDraft,
    clearGeneratedAvatar,
    resetCreatorForm,
    useCoverAsMainImage,
  }
}
