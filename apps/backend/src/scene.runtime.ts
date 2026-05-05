import type { RelationshipState } from './relationship.engine'

export type SceneEvent = {
  code: string
  title: string
  prompt: string
  priority: number
  cooldownTurns: number
  repeatable: boolean
  expiresAtTurn: number
  status: 'pending' | 'held'
}

export type ActiveScene = {
  code: string
  title: string
  objective: string
  startedAtTurn: number
  exitAfterTurns: number
}

export type SceneOutcome = {
  code: string
  title: string
  outcome: 'accepted' | 'rejected' | 'resolved' | 'abandoned' | 'expired'
  turn: number
  createdAt: string
}

export type EmotionalMomentum = {
  direction: 'warming' | 'cooling' | 'volatile' | 'steady'
  positive: number
  negative: number
  vulnerable: number
  threatening: number
  updatedAt: string
}

export type SceneState = {
  currentScene: string
  lastUserIntent: string
  mode: 'sandbox' | 'scene'
  pendingEvents: SceneEvent[]
  activeScene: ActiveScene | null
  sceneOutcomes: SceneOutcome[]
  eventCooldowns: Record<string, number>
  consumedEvents: string[]
  declinedEvents: string[]
  updatedAt: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

export function inferIntent(userMessage: string) {
  const message = userMessage.toLowerCase()
  if (message.startsWith('/scene ')) return 'scene-control'
  if (message.includes('?') || message.includes('ไหม') || message.includes('อะไร')) return 'question'
  if (message.includes('ช่วย') || message.includes('ขอ')) return 'request'
  if (message.includes('สรุป')) return 'summarize'
  if (message.includes('เขียน')) return 'writing'
  return 'conversation'
}

function sceneTitle(code: string) {
  const titles: Record<string, string> = {
    soft_confession_available: 'ช่วงเวลาที่เริ่มเปิดใจ',
    devotion_shift: 'จุดเปลี่ยนของความผูกพัน',
    relationship_break: 'รอยร้าวสำคัญ',
    fear_lock: 'ช่วงที่ความกลัวครอบงำ',
    unfinished_business_surfaces: 'เรื่องค้างคาที่เริ่มเผยออกมา',
    constraint_guard: 'ขอบเขตความสัมพันธ์',
  }

  return titles[code] ?? code.replace(/_/g, ' ')
}

function sceneObjective(code: string) {
  const objectives: Record<string, string> = {
    soft_confession_available:
      'Let the character open up carefully. The moment should feel optional, vulnerable, and not like a full confession unless the user leans in.',
    devotion_shift:
      'Move into a major emotional turning point. Show deeper attachment while preserving character consistency and agency.',
    relationship_break:
      'Handle the conflict as a serious scene. Give the user a chance to repair, apologize, escalate, or step away.',
    fear_lock: 'Keep the scene tense and careful. The character should protect themself and not become instantly warm.',
    unfinished_business_surfaces:
      'Surface unresolved history through subtext, memory, or a pointed question. Avoid dumping exposition.',
    constraint_guard: 'Redirect the interaction away from blocked intimacy or romance into a safe dynamic.',
  }

  return objectives[code] ?? 'Run a focused relationship scene that can resolve back into sandbox mode.'
}

function sceneCommand(userMessage: string) {
  const match = userMessage.trim().match(/^\/scene\s+(enter|hold|decline|exit|resolve|accept|reject)\s*([a-z0-9_-]+)?/i)
  if (!match) return null

  return {
    action: (match[1] ?? 'enter').toLowerCase() as
      | 'enter'
      | 'hold'
      | 'decline'
      | 'exit'
      | 'resolve'
      | 'accept'
      | 'reject',
    code: match[2],
  }
}

export function messageSignals(userMessage: string) {
  const message = userMessage.toLowerCase()
  return {
    positive: /(ขอบคุณ|ดี|เยี่ยม|ชอบ|รัก|คิดถึง|ห่วง|thanks|thank|love|like)/i.test(message),
    negative: /(เกลียด|รำคาญ|โกรธ|แย่|ไม่ชอบ|หุบปาก|hate|angry|annoy)/i.test(message),
    vulnerable: /(ไว้ใจ|เล่าให้ฟัง|ความลับ|กลัวว่า|เหงา|trust|secret|lonely)/i.test(message),
    threatening: /(กลัว|ขู่|ฆ่า|ทำร้าย|threat|hurt|kill)/i.test(message),
  }
}

export function updateEmotionalMomentum(previous: unknown, userMessage: string, now: string): EmotionalMomentum {
  const record = asRecord(previous)
  const signals = messageSignals(userMessage)
  const positive = Math.max(0, (typeof record.positive === 'number' ? record.positive : 0) * 0.65 + (signals.positive ? 1 : 0))
  const negative = Math.max(0, (typeof record.negative === 'number' ? record.negative : 0) * 0.65 + (signals.negative ? 1 : 0))
  const vulnerable = Math.max(0, (typeof record.vulnerable === 'number' ? record.vulnerable : 0) * 0.65 + (signals.vulnerable ? 1 : 0))
  const threatening = Math.max(0, (typeof record.threatening === 'number' ? record.threatening : 0) * 0.65 + (signals.threatening ? 1 : 0))
  const direction =
    threatening > 1 || (positive > 0.8 && negative > 0.8)
      ? 'volatile'
      : positive + vulnerable > negative + 0.7
        ? 'warming'
        : negative > positive + 0.7
          ? 'cooling'
          : 'steady'

  return { direction, positive, negative, vulnerable, threatening, updatedAt: now }
}

function mergePendingEvents({
  previous,
  relationship,
  turnCount,
  consumed,
  declined,
  cooldowns,
}: {
  previous: SceneEvent[]
  relationship: RelationshipState
  turnCount: number
  consumed: string[]
  declined: string[]
  cooldowns: Record<string, number>
}) {
  const previousByCode = new Map(previous.map((event) => [event.code, event]))
  const next = previous
    .filter((event) => event.expiresAtTurn > turnCount)
    .filter((event) => (event.repeatable || !consumed.includes(event.code)) && !declined.includes(event.code))

  for (const event of relationship.events) {
    if ((!event.repeatable && consumed.includes(event.code)) || declined.includes(event.code)) continue
    if ((cooldowns[event.code] ?? 0) > turnCount) continue
    if (next.some((item) => item.code === event.code)) continue

    const existing = previousByCode.get(event.code)
    next.push({
      code: event.code,
      title: sceneTitle(event.code),
      prompt: sceneObjective(event.code),
      priority: event.priority,
      cooldownTurns: event.cooldownTurns,
      repeatable: event.repeatable,
      expiresAtTurn: existing?.expiresAtTurn ?? turnCount + 5,
      status: existing?.status ?? 'pending',
    })
  }

  return next.sort((a, b) => b.priority - a.priority).slice(0, 3)
}

export function updateSceneState({
  previousSceneState,
  relationship,
  userMessage,
  turnCount,
}: {
  previousSceneState: unknown
  relationship: RelationshipState
  userMessage: string
  turnCount: number
}): SceneState {
  const now = new Date().toISOString()
  const previous = asRecord(previousSceneState)
  const consumedEvents = asStringArray(previous.consumedEvents)
  const declinedEvents = asStringArray(previous.declinedEvents)
  const sceneOutcomes = (Array.isArray(previous.sceneOutcomes) ? previous.sceneOutcomes : []).filter(
    (outcome): outcome is SceneOutcome =>
      outcome &&
      typeof outcome === 'object' &&
      typeof (outcome as SceneOutcome).code === 'string' &&
      typeof (outcome as SceneOutcome).outcome === 'string',
  )
  const eventCooldowns = Object.fromEntries(
    Object.entries(asRecord(previous.eventCooldowns)).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  )
  const previousPending = (Array.isArray(previous.pendingEvents) ? previous.pendingEvents : []).filter(
    (event): event is SceneEvent =>
      event &&
      typeof event === 'object' &&
      typeof (event as SceneEvent).code === 'string' &&
      typeof (event as SceneEvent).title === 'string',
  )
  const previousActive = asRecord(previous.activeScene)
  let activeScene: ActiveScene | null =
    typeof previousActive.code === 'string' && typeof previousActive.title === 'string'
      ? {
          code: previousActive.code,
          title: previousActive.title,
          objective: typeof previousActive.objective === 'string' ? previousActive.objective : sceneObjective(previousActive.code),
          startedAtTurn: typeof previousActive.startedAtTurn === 'number' ? previousActive.startedAtTurn : turnCount,
          exitAfterTurns: typeof previousActive.exitAfterTurns === 'number' ? previousActive.exitAfterTurns : 4,
        }
      : null
  let pendingEvents = mergePendingEvents({
    previous: previousPending,
    relationship,
    turnCount,
    consumed: consumedEvents,
    declined: declinedEvents,
    cooldowns: eventCooldowns,
  })

  const command = sceneCommand(userMessage)
  if (command?.action === 'enter') {
    const selected = pendingEvents.find((event) => event.code === command.code) ?? pendingEvents[0]
    if (selected) {
      activeScene = {
        code: selected.code,
        title: selected.title,
        objective: selected.prompt,
        startedAtTurn: turnCount,
        exitAfterTurns: 4,
      }
      eventCooldowns[selected.code] = turnCount + selected.cooldownTurns
      pendingEvents = pendingEvents.filter((event) => event.code !== selected.code)
    }
  }

  if (command?.action === 'hold' && command.code) {
    pendingEvents = pendingEvents.map((event) =>
      event.code === command.code ? { ...event, status: 'held', expiresAtTurn: turnCount + 8 } : event,
    )
  }

  if (command?.action === 'decline' && command.code) {
    pendingEvents = pendingEvents.filter((event) => event.code !== command.code)
    declinedEvents.push(command.code)
    eventCooldowns[command.code] = turnCount + 12
  }

  if (command?.action === 'exit' && activeScene) {
    sceneOutcomes.push({ code: activeScene.code, title: activeScene.title, outcome: 'abandoned', turn: turnCount, createdAt: now })
    consumedEvents.push(activeScene.code)
    activeScene = null
  }

  if ((command?.action === 'resolve' || command?.action === 'accept' || command?.action === 'reject') && activeScene) {
    sceneOutcomes.push({
      code: activeScene.code,
      title: activeScene.title,
      outcome: command.action === 'accept' ? 'accepted' : command.action === 'reject' ? 'rejected' : 'resolved',
      turn: turnCount,
      createdAt: now,
    })
    consumedEvents.push(activeScene.code)
    activeScene = null
  }

  if (activeScene && turnCount - activeScene.startedAtTurn >= activeScene.exitAfterTurns) {
    sceneOutcomes.push({ code: activeScene.code, title: activeScene.title, outcome: 'expired', turn: turnCount, createdAt: now })
    consumedEvents.push(activeScene.code)
    activeScene = null
  }

  return {
    currentScene: activeScene?.title ?? 'sandbox',
    lastUserIntent: inferIntent(userMessage),
    mode: activeScene ? 'scene' : 'sandbox',
    pendingEvents: activeScene ? pendingEvents.map((event) => ({ ...event, status: 'held' })) : pendingEvents,
    activeScene,
    sceneOutcomes: sceneOutcomes.slice(-12),
    eventCooldowns,
    consumedEvents: unique(consumedEvents),
    declinedEvents: unique(declinedEvents),
    updatedAt: now,
  }
}

export function buildScenePrompt(sceneState: SceneState) {
  const lines = [
    `Scene mode: ${sceneState.mode}.`,
    sceneState.activeScene
      ? `Active scene: ${sceneState.activeScene.title}. Objective: ${sceneState.activeScene.objective}`
      : 'Sandbox mode: continue free roleplay. Do not force pending events into the scene.',
    sceneState.pendingEvents.length > 0 && sceneState.mode === 'sandbox'
      ? `Pending scene notifications available to the user: ${sceneState.pendingEvents
          .map((event) => `${event.code} (${event.title})`)
          .join(', ')}. Mention them only as a subtle system notification, not as character dialogue.`
      : '',
    sceneState.mode === 'scene'
      ? 'In scene mode, keep the scene focused and let the user resolve, reject, or leave the moment naturally.'
      : '',
  ].filter(Boolean)

  return `Scene engine state:\n${lines.join('\n')}`
}

export function outcomeRelationshipDelta(outcome: SceneOutcome): Partial<{
  affinity: number
  trust: number
  intimacy: number
  dominance: number
  fear: number
  respect: number
}> {
  const table: Record<string, Record<SceneOutcome['outcome'], Partial<RelationshipState>>> = {
    soft_confession_available: {
      accepted: { affinity: 12, trust: 8, intimacy: 5 },
      resolved: { affinity: 7, trust: 6, intimacy: 2 },
      rejected: { affinity: -10, trust: -6, respect: 2 },
      abandoned: { trust: -3 },
      expired: { trust: -1 },
    },
    devotion_shift: {
      accepted: { affinity: 10, trust: 12, intimacy: 6, respect: 4 },
      resolved: { affinity: 6, trust: 8, respect: 3 },
      rejected: { affinity: -14, trust: -10, fear: 4 },
      abandoned: { trust: -5, affinity: -3 },
      expired: { trust: -2 },
    },
    relationship_break: {
      accepted: { trust: 5, respect: 4, fear: -6 },
      resolved: { trust: 10, affinity: 5, fear: -10, respect: 6 },
      rejected: { trust: -12, affinity: -10, fear: 6 },
      abandoned: { trust: -8, affinity: -5 },
      expired: { trust: -4, fear: 3 },
    },
    fear_lock: {
      accepted: { fear: -6, trust: 3, respect: 2 },
      resolved: { fear: -12, trust: 5, respect: 4 },
      rejected: { fear: 8, trust: -8 },
      abandoned: { fear: 4, trust: -4 },
      expired: { fear: 2 },
    },
    unfinished_business_surfaces: {
      accepted: { trust: 9, affinity: 6 },
      resolved: { trust: 12, affinity: 8, respect: 3 },
      rejected: { trust: -8, affinity: -6 },
      abandoned: { trust: -5 },
      expired: { trust: -2 },
    },
    constraint_guard: {
      accepted: { respect: 8, trust: 4, intimacy: -8 },
      resolved: { respect: 6, trust: 3, intimacy: -5 },
      rejected: { respect: -8, trust: -8, fear: 4 },
      abandoned: { respect: -3 },
      expired: { respect: -1 },
    },
  }
  const fallback: Record<SceneOutcome['outcome'], Partial<RelationshipState>> = {
    accepted: { affinity: 6, trust: 5, intimacy: 2 },
    resolved: { affinity: 4, trust: 5, respect: 3 },
    rejected: { affinity: -6, trust: -5 },
    abandoned: { trust: -3 },
    expired: { trust: -1 },
  }

  return (table[outcome.code] ?? fallback)[outcome.outcome]
}

export function momentumRelationshipDelta(momentum: EmotionalMomentum): ReturnType<typeof outcomeRelationshipDelta> {
  if (momentum.direction === 'warming') return { affinity: 2, trust: 2 }
  if (momentum.direction === 'cooling') return { affinity: -2, trust: -2 }
  if (momentum.direction === 'volatile') return { trust: -2, fear: 2 }
  return {}
}
