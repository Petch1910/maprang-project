import {
  ApiError,
  logUnexpectedError,
  type ChatRuntimeState,
  type SavedChat,
} from './api'

export const savedChatMessageWindowLimit = 120

export function apiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback
  if (error.status === 401) return 'กรุณาเข้าสู่ระบบใหม่ เซสชันอาจหมดอายุแล้ว'
  if (error.status === 403) return 'บัญชีนี้ไม่มีสิทธิ์ทำคำสั่งนี้'
  if (error.status === 404) return 'ไม่พบข้อมูลนี้ หรือข้อมูลเป็นของบัญชีอื่น'
  if (error.status === 413) return 'ไฟล์ที่อัปโหลดมีขนาดใหญ่เกินไป'
  if (error.status === 415) return 'ไม่รองรับไฟล์ประเภทนี้'
  if (error.status === 422) return 'ข้อมูลที่ส่งยังไม่ครบหรือไม่ถูกต้อง'
  if (error.status === 429) return 'มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่'
  return fallback
}

export function isExpectedUserApiError(error: unknown) {
  return error instanceof ApiError && [401, 403, 404, 413, 415, 422, 429].includes(error.status)
}

export function shouldUseNonStreamingFallback(error: unknown) {
  return !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status))
}

export function logUnexpectedWorkspaceError(label: string, error: unknown) {
  logUnexpectedError(label, error)
}

export function defaultSceneState(): ChatRuntimeState['sceneState'] {
  return {
    currentScene: 'sandbox',
    lastUserIntent: 'conversation',
    mode: 'sandbox',
    pendingEvents: [],
    activeScene: null,
    sceneOutcomes: [],
    eventCooldowns: {},
    consumedEvents: [],
    declinedEvents: [],
    updatedAt: '',
  }
}

export function defaultMemoryState(): ChatRuntimeState['memory'] {
  return {
    summary: '',
    facts: [],
    turnCount: 0,
    updatedAt: '',
  }
}

export function defaultRelationshipState(): ChatRuntimeState['relationshipState'] {
  return {
    affinity: 0,
    trust: 0,
    intimacy: 0,
    dominance: 0,
    fear: 0,
    respect: 0,
    route: 'general',
    arcStage: 'setup',
    status: 'NEUTRAL',
    tier: 'neutral',
    tone: 'neutral',
    flags: [],
    constraints: [],
    events: [],
    multipliers: {
      affinityGain: 1,
      trustGain: 1,
      intimacyGain: 1,
      respectGain: 1,
    },
    normalized: {
      affinity: 0,
      trust: 0,
      intimacy: 0,
      dominance: 0,
      fear: 0,
      respect: 0,
    },
    promptProfile: '',
    tagProfile: {
      discovery: [],
      engine: [],
      safety: [],
      unknown: [],
    },
    updatedAt: '',
  }
}

export function savedChatRuntimeState(
  chat: Pick<SavedChat, 'memory' | 'sceneState' | 'relationshipState'>,
): ChatRuntimeState {
  return {
    memory: { ...defaultMemoryState(), ...(chat.memory ?? {}) },
    sceneState: { ...defaultSceneState(), ...(chat.sceneState ?? {}) },
    relationshipState: chat.relationshipState ?? {
      ...defaultRelationshipState(),
    },
  }
}
