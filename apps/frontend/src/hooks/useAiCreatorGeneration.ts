import { type Dispatch, type FormEvent, type SetStateAction, useCallback, useState } from 'react'
import {
  ApiError,
  generateCreatorAiDraft,
  logUnexpectedError,
  type Character,
} from '../lib/api'
import { currentRoutePath, trackFrontendEventSafe } from '../lib/analytics'
import {
  createAiCreatorImageItem,
  createAiCreatorVideoItem,
  type AiCreatorGeneratedItem,
  type AiCreatorImageTemplate,
  type AiCreatorMode,
} from '../lib/aiCreator'

type UseAiCreatorGenerationInput = {
  activeTab: AiCreatorMode
  brief: string
  characters: Character[]
  imagePrompt: string
  imageStyle: string
  selectedCharacterId: string
  videoDuration: number
  videoPrompt: string
  videoTemplate: string
  prependHistoryItem: (item: AiCreatorGeneratedItem) => void
  setActiveTab: Dispatch<SetStateAction<AiCreatorMode>>
  setCurrentPage: Dispatch<SetStateAction<number>>
  setImagePrompt: Dispatch<SetStateAction<string>>
  setImageStyle: Dispatch<SetStateAction<string>>
  setLastResult: Dispatch<SetStateAction<AiCreatorGeneratedItem | null>>
  setStatusMessage: Dispatch<SetStateAction<string>>
}

export function useAiCreatorGeneration({
  activeTab,
  brief,
  characters,
  imagePrompt,
  imageStyle,
  selectedCharacterId,
  videoDuration,
  videoPrompt,
  videoTemplate,
  prependHistoryItem,
  setActiveTab,
  setCurrentPage,
  setImagePrompt,
  setImageStyle,
  setLastResult,
  setStatusMessage,
}: UseAiCreatorGenerationInput) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()

      const isVideoMode = activeTab === 'video'
      const promptText = isVideoMode ? videoPrompt.trim() : imagePrompt.trim()
      const briefText = brief.trim()

      if (!briefText && !promptText) return

      setIsGenerating(true)
      setStatusMessage('กำลังวิเคราะห์เค้าโครงร่างของสื่อและติดต่อระบบสิทธิ์ผู้ให้บริการคีย์ตรง...')
      setLastResult(null)
      trackFrontendEventSafe({
        eventName: 'ai_creator_generate_started',
        route: currentRoutePath(),
        entityType: 'generation_job',
        entityId: activeTab,
        characterId: selectedCharacterId || undefined,
        metadata: { mode: activeTab, hasBrief: Boolean(briefText), hasPrompt: Boolean(promptText), style: imageStyle },
      })

      try {
        const res = await generateCreatorAiDraft({
          brief: briefText,
          imagePrompt: promptText,
          imageStyle: isVideoMode ? 'realistic' : imageStyle,
          imageOnly: false,
        })

        const targetChar = characters.find((c) => c.id === selectedCharacterId)
        if (targetChar) {
          res.draft.name = targetChar.name
        }

        let newItem: AiCreatorGeneratedItem

        if (isVideoMode) {
          newItem = createAiCreatorVideoItem({
            id: crypto.randomUUID(),
            response: res,
            prompt: videoPrompt.trim(),
            brief: briefText,
            duration: videoDuration,
            motionTemplate: videoTemplate,
          })
          setStatusMessage('ระบบจำลองการสั่นไหวและเรนเดอร์วิดีโอเคลื่อนไหวผ่านสิทธิ์ผู้ให้บริการคีย์ตรงเสร็จสิ้น')
        } else {
          newItem = createAiCreatorImageItem({
            id: crypto.randomUUID(),
            response: res,
            prompt: imagePrompt.trim() || briefText,
            brief: briefText,
            style: imageStyle,
          })
          setStatusMessage('ระบบวิเคราะห์ประมวลผลแบบสเก็ตช์ภาพร่างระบบเสร็จสิ้น')
        }

        prependHistoryItem(newItem)
        setLastResult(newItem)
        setCurrentPage(1)
      } catch (err) {
        logUnexpectedError('การประมวลผลสร้างภาพร่างขัดข้อง', err)
        setStatusMessage(
          err instanceof ApiError
            ? err.message
            : 'ระบบสิทธิ์เชื่อมโยงขัดข้องชั่วคราว กรุณาตรวจสอบการตั้งค่าคีย์ของคุณแล้วลองใหม่อีกครั้ง',
        )
      } finally {
        setIsGenerating(false)
      }
    },
    [
      activeTab,
      brief,
      characters,
      imagePrompt,
      imageStyle,
      prependHistoryItem,
      selectedCharacterId,
      setCurrentPage,
      setLastResult,
      setStatusMessage,
      videoDuration,
      videoPrompt,
      videoTemplate,
    ],
  )

  const handleTemplateClick = useCallback(
    async (tpl: AiCreatorImageTemplate) => {
      setActiveTab('image')
      setImagePrompt(tpl.prompt)
      setImageStyle(tpl.style)

      setIsGenerating(true)
      setStatusMessage('กำลังโหลดโครงร่างสไตล์ความนุ่มนวลและเชื่อมระบบสร้างภาพร่างระบบ...')
      setLastResult(null)
      trackFrontendEventSafe({
        eventName: 'ai_creator_generate_started',
        route: currentRoutePath(),
        entityType: 'generation_template',
        entityId: tpl.id,
        characterId: selectedCharacterId || undefined,
        metadata: { mode: 'image', template: tpl.title, style: tpl.style },
      })

      try {
        const res = await generateCreatorAiDraft({
          brief: brief.trim(),
          imagePrompt: tpl.prompt,
          imageStyle: tpl.style,
          imageOnly: false,
        })

        const newItem = createAiCreatorImageItem({
          id: crypto.randomUUID(),
          response: res,
          prompt: tpl.prompt,
          brief: brief.trim(),
          style: tpl.style,
        })

        prependHistoryItem(newItem)
        setLastResult(newItem)
        setCurrentPage(1)
        setStatusMessage('ระบบวิเคราะห์ประมวลผลแม่แบบภาพร่างเสร็จสิ้นเรียบร้อย')
      } catch (err) {
        logUnexpectedError('ประมวลผลเทมเพลตภาพร่างไม่สำเร็จ', err)
        setStatusMessage('ไม่สามารถเรียกข้อมูลประมวลผลแม่แบบได้ชั่วคราว')
      } finally {
        setIsGenerating(false)
      }
    },
    [
      brief,
      prependHistoryItem,
      selectedCharacterId,
      setActiveTab,
      setCurrentPage,
      setImagePrompt,
      setImageStyle,
      setLastResult,
      setStatusMessage,
    ],
  )

  return {
    isGenerating,
    handleGenerate,
    handleTemplateClick,
  }
}
