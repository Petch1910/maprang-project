import { useState } from 'react'
import { updateCreatorDraft, logUnexpectedError, type CreatorAiDraftResponse } from '../lib/api'
import { type AiCreatorGeneratedItem } from '../lib/aiCreator'
import { getSafeClipboard, safeWriteClipboardText } from '../lib/safeClipboard'

type SetStatusMessage = (message: string) => void

export function useAiCreatorStudioActions(setStatusMessage: SetStatusMessage) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const handleSaveToStudio = async (response: CreatorAiDraftResponse) => {
    try {
      setStatusMessage('กำลังบันทึกภาพร่างเข้าสู่ศูนย์ควบคุมห้องทำงานนักพัฒนา...')
      await updateCreatorDraft(response.draft)
      setStatusMessage('บันทึกภาพร่างระบบและบุคลิกเข้าสู่ห้องทำงานสตูดิโอเรียบร้อยแล้ว')
    } catch (err) {
      logUnexpectedError('ai_creator_save_to_studio_failed', err)
      setStatusMessage('บันทึกเข้าสู่สตูดิโอไม่สำเร็จ แต่ยังคัดลอกข้อมูลจากผลลัพธ์นี้ไปกรอกเองได้')
    }
  }

  const handleCopySystemPrompt = (item: AiCreatorGeneratedItem | null) => {
    if (!item) return
    void safeWriteClipboardText(getSafeClipboard(), item.response.draft.systemPrompt).then((success) => {
      if (success) {
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2000)
      }
      setStatusMessage(success ? 'คัดลอก system prompt แล้ว' : 'คัดลอก system prompt ไม่สำเร็จ')
    })
  }

  const handleCopyHistorySystemPrompt = (item: AiCreatorGeneratedItem) => {
    void safeWriteClipboardText(getSafeClipboard(), item.response.draft.systemPrompt).then((success) => {
      setStatusMessage(success ? 'คัดลอก system prompt ของชิ้นงานแล้ว' : 'คัดลอก system prompt ไม่สำเร็จ')
    })
  }

  return {
    copiedPrompt,
    handleSaveToStudio,
    handleCopySystemPrompt,
    handleCopyHistorySystemPrompt,
  }
}
