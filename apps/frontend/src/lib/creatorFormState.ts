import {
  clearStoredCreatorDraft,
  readStoredCreatorDraft,
  writeStoredCreatorDraft,
  type CreatorStoredDraft,
} from './characterDraft'
import { type CharacterInput } from './api'
import { normalizeTag, type TagAnalysis, type TagIssue } from './tagAnalysis'

export type CreatorDraftStatus = {
  hasAvatar: boolean
  avatarSource: 'none' | 'manual' | 'placeholder' | 'provider'
  hasIdentity: boolean
  hasPrompt: boolean
  hasScenario: boolean
  hasGreeting: boolean
  hasDangerConflict: boolean
  hasWarning: boolean
  hasPreviewRun: boolean
  draftGeneratedFromImage: boolean
  canSubmit: boolean
  readinessLabel: string
  readinessScore: number
  tagCounts: {
    discovery: number
    engine: number
    safety: number
    unknown: number
  }
  issueMessages: TagIssue[]
  note: string
}

export const emptyCharacter = {
  name: '',
  avatarUrl: '',
  tagline: '',
  description: '',
  biography: '',
  scenario: '',
  systemPrompt: '',
  compactPrompt: '',
  characterAnchor: '',
  constraints: '',
  greeting: '',
  tags: 'บทบาทสมมุติ, ไทย',
}

export function avatarSourceLabel(source: CreatorDraftStatus['avatarSource']) {
  if (source === 'provider') return 'ระบบสร้างรูป'
  if (source === 'placeholder') return 'ภาพร่างระบบ'
  if (source === 'manual') return 'ผู้ใช้เลือกเอง'
  return 'ยังไม่ระบุ'
}

export function withCreatorUiTimeout<T>(promise: Promise<T>, timeoutMs = 15_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('creator_ai_draft_timeout')), timeoutMs)
    promise.then(resolve, reject).finally(() => window.clearTimeout(timeoutId))
  })
}

export function loadStoredCreatorDraft(): CreatorStoredDraft | null {
  if (typeof window === 'undefined') return null
  return readStoredCreatorDraft(window.localStorage)
}

export function clearLocalCreatorDraft() {
  if (typeof window === 'undefined') return
  clearStoredCreatorDraft(window.localStorage)
}

export function persistLocalCreatorDraft(payload: CreatorStoredDraft) {
  if (typeof window === 'undefined') return
  writeStoredCreatorDraft(window.localStorage, payload)
}

export function mergeStoredForm(stored: CreatorStoredDraft | null) {
  return {
    ...emptyCharacter,
    ...(stored?.form ?? {}),
  }
}

export function buildReadinessSummary({
  form,
  analysis,
  hasDangerConflict,
}: {
  form: typeof emptyCharacter
  analysis: TagAnalysis
  hasDangerConflict: boolean
}) {
  const hasAvatar = Boolean(form.avatarUrl.trim())
  const hasIdentity = Boolean(form.name.trim() && (form.tagline.trim() || form.description.trim()))
  const hasPrompt = Boolean(form.systemPrompt.trim() || form.characterAnchor.trim())
  const hasScenario = Boolean(form.scenario.trim())
  const hasGreeting = Boolean(form.greeting.trim())
  const essentials = [hasAvatar, hasIdentity, hasPrompt, hasScenario, hasGreeting].filter(Boolean).length
  const tagScore = Math.min(18, analysis.engine.length * 4 + analysis.safety.length * 3 + analysis.discovery.length * 2)
  const readinessScore = hasDangerConflict ? 42 : Math.min(96, 28 + essentials * 10 + tagScore)
  const readinessLabel = hasDangerConflict
    ? 'ต้องแก้แท็กขัดแย้ง'
    : readinessScore >= 88
      ? 'พร้อมลองบทก่อนเผยแพร่'
      : readinessScore >= 72
        ? 'โครงดีแล้ว เติมรายละเอียดอีกนิด'
        : 'ยังควรเติมแกนบุคลิก'

  return {
    hasAvatar,
    hasIdentity,
    hasPrompt,
    hasScenario,
    hasGreeting,
    readinessScore,
    readinessLabel,
  }
}

export function buildCreatorCharacterInput({
  form,
  coverImageUrl,
}: {
  form: typeof emptyCharacter
  coverImageUrl: string
}): CharacterInput {
  return {
    name: form.name.trim(),
    avatarUrl: form.avatarUrl.trim() || null,
    coverUrl: coverImageUrl.trim() || null,
    tagline: form.tagline.trim() || null,
    description: form.description.trim() || null,
    biography: form.biography.trim() || null,
    scenario: form.scenario.trim() || null,
    systemPrompt: form.systemPrompt.trim(),
    compactPrompt: form.compactPrompt.trim() || null,
    characterAnchor: form.characterAnchor.trim() || null,
    constraints: form.constraints.trim() || null,
    greeting: form.greeting.trim() || null,
    tags: form.tags
      .split(',')
      .map((tag) => normalizeTag(tag))
      .filter(Boolean),
    visibility: 'PRIVATE',
    status: 'DRAFT',
  }
}
