import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  updateChatWorldState,
  type ChatRuntimeState,
  type WorldStateInput,
} from '../lib/api'
import {
  apiErrorMessage,
  defaultMemoryState,
  defaultRelationshipState,
  defaultSceneState,
  logUnexpectedWorkspaceError,
} from '../lib/workspaceRuntime'

type UseWorkspaceWorldStateParams = {
  chatId: string | null
  setConnectionNote: (note: string) => void
  setRuntimeState: Dispatch<SetStateAction<ChatRuntimeState | null>>
}

export function useWorkspaceWorldState({
  chatId,
  setConnectionNote,
  setRuntimeState,
}: UseWorkspaceWorldStateParams) {
  const [isWorldStateSaving, setIsWorldStateSaving] = useState(false)

  const saveWorldState = async (input: WorldStateInput) => {
    if (!chatId) {
      setConnectionNote('ต้องเริ่มแชทให้ระบบสร้างห้องก่อน แล้วค่อยบันทึกสถานะโลก')
      return false
    }

    setIsWorldStateSaving(true)
    try {
      const data = await updateChatWorldState(chatId, input)
      setRuntimeState((current) => ({
        memory: {
          ...defaultMemoryState(),
          ...(current?.memory ?? {}),
          worldState: data.worldState,
        },
        sceneState: current?.sceneState ?? defaultSceneState(),
        relationshipState: current?.relationshipState ?? defaultRelationshipState(),
      }))
      setConnectionNote('บันทึกสถานะโลกของแชทนี้แล้ว')
      return true
    } catch (error) {
      logUnexpectedWorkspaceError('บันทึกสถานะโลกไม่สำเร็จ:', error)
      setConnectionNote(apiErrorMessage(error, 'บันทึกสถานะโลกไม่สำเร็จ กรุณาลองใหม่'))
      return false
    } finally {
      setIsWorldStateSaving(false)
    }
  }

  return {
    isWorldStateSaving,
    saveWorldState,
  }
}
