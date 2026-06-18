import { useEffect } from 'react'
import { fetchCreatorDraft, updateCreatorDraft } from '../lib/api'
import {
  clearLocalCreatorDraft,
  emptyCharacter,
  loadStoredCreatorDraft,
  mergeStoredForm,
  persistLocalCreatorDraft,
  type CreatorDraftStatus,
} from '../lib/creatorFormState'
import { type CreatorStoredDraft } from '../lib/characterDraft'

type CreatorFormState = typeof emptyCharacter
type GeneratedImage = { url: string; source: CreatorDraftStatus['avatarSource'] }

type CreatorDraftPersistenceParams = {
  avatarSource: CreatorDraftStatus['avatarSource']
  coverImageSource: CreatorDraftStatus['avatarSource']
  coverImageUrl: string
  creatorBrief: string
  form: CreatorFormState
  generatedImages: GeneratedImage[]
  hasCoverDraft: boolean
  hasImageDraft: boolean
  hasPreviewRun: boolean
  imageStyle: string
  lastImageSignal: string
  onDraftStatusChange?: (status: CreatorDraftStatus) => void
  setCoverImageSource: (source: CreatorDraftStatus['avatarSource']) => void
  setCoverImageUrl: (url: string) => void
  setCreatorBrief: (brief: string) => void
  setForm: (form: CreatorFormState) => void
  setGeneratedImages: (images: GeneratedImage[]) => void
  setHasCoverDraft: (value: boolean) => void
  setHasImageDraft: (value: boolean) => void
  setHasPreviewRun: (value: boolean) => void
  setImageStyle: (style: string) => void
  setLastImageSignal: (signal: string) => void
  setNote: (note: string) => void
  setStoredAvatarSource: (source: CreatorDraftStatus['avatarSource']) => void
  status: CreatorDraftStatus
}

export function useCreatorDraftPersistence({
  avatarSource,
  coverImageSource,
  coverImageUrl,
  creatorBrief,
  form,
  generatedImages,
  hasCoverDraft,
  hasImageDraft,
  hasPreviewRun,
  imageStyle,
  lastImageSignal,
  onDraftStatusChange,
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
  status,
}: CreatorDraftPersistenceParams) {
  useEffect(() => {
    onDraftStatusChange?.(status)
  }, [onDraftStatusChange, status])

  useEffect(() => {
    fetchCreatorDraft()
      .then((res) => {
        if (!res.draft) return

        const dbDraft = res.draft as CreatorStoredDraft
        const localDraft = loadStoredCreatorDraft()
        if (localDraft && (dbDraft.updatedAt ?? 0) <= (localDraft.updatedAt ?? 0)) return

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
        persistLocalCreatorDraft(dbDraft)
      })
      .catch(() => {})
  }, [
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
  ])

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
    persistLocalCreatorDraft(payload)

    const timeoutId = setTimeout(() => {
      updateCreatorDraft(payload).catch(() => {})
    }, 1500)

    return () => clearTimeout(timeoutId)
  }, [avatarSource, coverImageSource, coverImageUrl, creatorBrief, form, hasCoverDraft, hasImageDraft, hasPreviewRun, lastImageSignal, generatedImages, imageStyle])

  useEffect(() => {
    setHasPreviewRun(false)
  }, [form.tags, setHasPreviewRun])

  return {
    clearPersistedCreatorDraft: () => {
      clearLocalCreatorDraft()
      updateCreatorDraft(null).catch(() => {})
    },
  }
}
