import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ApiError,
  logUnexpectedError,
  updateCreatorDraft,
  useGenerationOutputAsCharacterImage as createCharacterImageReference,
  useGenerationOutputAsCover as createCoverReference,
} from '../lib/api'
import {
  saveAiCreatorItemToCreatorCoverDraft,
  saveAiCreatorItemToCreatorDraft,
  type AiCreatorGeneratedItem,
} from '../lib/aiCreator'

type CreatorReferenceTarget = 'character-image' | 'cover'
type CreatorReferenceAction = {
  itemId: string
  target: CreatorReferenceTarget
} | null

type SetStatusMessage = (message: string) => void
type SetDetailItem = (item: AiCreatorGeneratedItem | null) => void

async function resolveCreatorReferenceItem(
  item: AiCreatorGeneratedItem,
  target: CreatorReferenceTarget,
  setStatusMessage: SetStatusMessage,
): Promise<{ ok: true; item: AiCreatorGeneratedItem } | { ok: false; message: string }> {
  if (item.id.startsWith('public-')) return { ok: true, item }
  if (item.librarySource !== 'backend' || !item.backendOutputId) return { ok: true, item }

  setStatusMessage('กำลังตรวจสิทธิ์ไฟล์ผลลัพธ์ก่อนส่งเข้าสตูดิโอ...')
  let result: Awaited<ReturnType<typeof createCoverReference>>
  try {
    result =
      target === 'cover'
        ? await createCoverReference(item.backendOutputId)
        : await createCharacterImageReference(item.backendOutputId)
  } catch (err) {
    const hasLocalSafePreview =
      item.url.startsWith('data:image/') || item.url.startsWith('/src/') || item.url.startsWith('blob:')
    if (import.meta.env.DEV && err instanceof ApiError && err.status === 404 && hasLocalSafePreview) {
      setStatusMessage('ใช้ preview local-safe แทน backend reference สำหรับการทดสอบในเครื่อง')
      return { ok: true, item }
    }
    logUnexpectedError('ตรวจสิทธิ์ไฟล์ AI Creator ก่อนส่งเข้าสตูดิโอไม่สำเร็จ', err)
    return {
      ok: false,
      message: err instanceof ApiError ? err.message : 'ตรวจสิทธิ์ไฟล์ผลลัพธ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    }
  }

  return {
    ok: true,
    item: {
      ...item,
      url: result.reference.url,
      prompt: result.reference.prompt || item.prompt,
      response: {
        ...item.response,
        image: {
          ...item.response.image,
          url: result.reference.url,
          prompt: result.reference.prompt || item.response.image.prompt,
        },
      },
    },
  }
}

export function useAiCreatorStudioBridge(setStatusMessage: SetStatusMessage, setDetailItem: SetDetailItem) {
  const navigate = useNavigate()
  const [creatorReferenceAction, setCreatorReferenceAction] = useState<CreatorReferenceAction>(null)

  const handleUseAsCharacterImage = useCallback(
    async (item: AiCreatorGeneratedItem) => {
      if (typeof window === 'undefined') return
      if (creatorReferenceAction) return

      setCreatorReferenceAction({ itemId: item.id, target: 'character-image' })
      try {
        const resolved = await resolveCreatorReferenceItem(item, 'character-image', setStatusMessage)
        if (!resolved.ok) {
          setStatusMessage(resolved.message)
          return
        }
        const draft = saveAiCreatorItemToCreatorDraft(window.localStorage, resolved.item)
        void updateCreatorDraft(draft).catch(() => {})
        setDetailItem(null)
        setStatusMessage('ส่งรูปและเนื้อหาตั้งต้นไปยังหน้าสร้างตัวละครแล้ว')
        navigate('/create')
      } catch (err) {
        logUnexpectedError('ส่งรูป AI Creator เข้าสตูดิโอไม่สำเร็จ', err)
        setStatusMessage(err instanceof ApiError ? err.message : 'ส่งรูปเข้าสตูดิโอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setCreatorReferenceAction(null)
      }
    },
    [creatorReferenceAction, navigate, setDetailItem, setStatusMessage],
  )

  const handleUseAsCover = useCallback(
    async (item: AiCreatorGeneratedItem) => {
      if (typeof window === 'undefined') return
      if (creatorReferenceAction) return

      setCreatorReferenceAction({ itemId: item.id, target: 'cover' })
      try {
        const resolved = await resolveCreatorReferenceItem(item, 'cover', setStatusMessage)
        if (!resolved.ok) {
          setStatusMessage(resolved.message)
          return
        }
        const draft = saveAiCreatorItemToCreatorCoverDraft(window.localStorage, resolved.item)
        void updateCreatorDraft(draft).catch(() => {})
        setDetailItem(null)
        setStatusMessage('บันทึกรูปนี้เป็นภาพปกในดราฟต์หน้าสร้างตัวละครแล้ว')
        navigate('/create')
      } catch (err) {
        logUnexpectedError('ส่งภาพปก AI Creator เข้าสตูดิโอไม่สำเร็จ', err)
        setStatusMessage(err instanceof ApiError ? err.message : 'ส่งภาพปกเข้าสตูดิโอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setCreatorReferenceAction(null)
      }
    },
    [creatorReferenceAction, navigate, setDetailItem, setStatusMessage],
  )

  return {
    creatorReferenceAction,
    handleUseAsCharacterImage,
    handleUseAsCover,
  }
}
