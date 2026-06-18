import { useState } from 'react'
import { type ReportDialogSubmit, type ReportDialogTarget } from '../components/ReportDialog'
import {
  createReport,
  type Character,
  type ChatMessage,
} from '../lib/api'
import {
  apiErrorMessage,
  logUnexpectedWorkspaceError,
} from '../lib/workspaceRuntime'

type WorkspaceReportTarget =
  | (ReportDialogTarget & { targetType: 'MESSAGE'; messageId: string; role: ChatMessage['role'] })
  | (ReportDialogTarget & { targetType: 'CHARACTER'; characterId: string })

type UseWorkspaceReportsParams = {
  character: Character | null
  chatId: string | null
  isLoading: boolean
  setConnectionNote: (note: string) => void
}

export function useWorkspaceReports({
  character,
  chatId,
  isLoading,
  setConnectionNote,
}: UseWorkspaceReportsParams) {
  const [reportTarget, setReportTarget] = useState<WorkspaceReportTarget | null>(null)
  const [isReporting, setIsReporting] = useState(false)

  const openMessageReport = (chat: ChatMessage) => {
    if (!character) return
    if (isLoading || chat.role === 'system' || !chat.content.trim()) return
    setReportTarget({
      targetType: 'MESSAGE',
      title: `ข้อความจาก${chat.role === 'assistant' ? character.name : 'ผู้ใช้'}`,
      preview: chat.content,
      messageId: chat.id,
      role: chat.role,
    })
  }

  const openCharacterReport = () => {
    if (!character?.id) return
    setReportTarget({
      targetType: 'CHARACTER',
      title: character.name,
      preview: character.biography || character.description || character.tagline || character.greeting || '',
      characterId: character.id,
    })
  }

  const reportMessage = async ({ reason, details }: ReportDialogSubmit) => {
    if (!character) return
    if (!reportTarget || isReporting) return
    setIsReporting(true)
    setConnectionNote(reportTarget.targetType === 'CHARACTER' ? 'กำลังส่งรายงานตัวละคร...' : 'กำลังส่งรายงานข้อความ...')
    try {
      if (reportTarget.targetType === 'CHARACTER') {
        await createReport({
          targetType: 'CHARACTER',
          characterId: reportTarget.characterId,
          reason,
          details: details || `รายงานตัวละคร ${character.name} จากหน้าห้องแชท`,
          metadata: {
            chatId,
            tags: character.tags,
            status: character.status,
            visibility: character.visibility,
          },
        })
      } else {
        await createReport({
          targetType: 'MESSAGE',
          messageId: reportTarget.messageId,
          reason,
          details: details || `รายงานข้อความจาก ${reportTarget.role} ในห้องแชท`,
          metadata: {
            chatId,
            characterId: character.id,
            role: reportTarget.role,
          },
        })
      }
      setConnectionNote(reportTarget.targetType === 'CHARACTER' ? 'ส่งรายงานตัวละครให้ผู้ดูแลตรวจแล้ว' : 'ส่งรายงานข้อความให้ผู้ดูแลตรวจแล้ว')
      setReportTarget(null)
    } catch (error) {
      logUnexpectedWorkspaceError('ส่งรายงานไม่สำเร็จ:', error)
      setConnectionNote(apiErrorMessage(error, 'ส่งรายงานไม่ได้ กรุณาลองใหม่หลังแชทซิงก์เสร็จ'))
    } finally {
      setIsReporting(false)
    }
  }

  return {
    isReporting,
    openCharacterReport,
    openMessageReport,
    reportMessage,
    reportTarget,
    setReportTarget,
  }
}
