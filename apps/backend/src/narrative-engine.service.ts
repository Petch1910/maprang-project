export type NarrativeIntent =
  | 'scene_control'
  | 'conflict'
  | 'affection'
  | 'vulnerability'
  | 'request'
  | 'question'
  | 'conversation'

export type NarrativePlan = {
  source: 'ainovel-inspired'
  intent: NarrativeIntent
  coordinator: {
    route: 'roleplay_turn'
    checkpoint: 'turn' | 'scene' | 'relationship'
  }
  architect: {
    focus: string
    tension: string
    continuity: string
  }
  writer: {
    beats: string[]
    minimumParagraphs: number
    preserveUserAgency: boolean
  }
  editor: {
    rubric: string[]
    revisionTriggers: string[]
  }
  contextStrategy: {
    recentTurns: number
    timelineItems: number
    summaryMode: 'none' | 'light' | 'rolling'
  }
}

export type NarrativeQualityDimension =
  | 'continuity'
  | 'characterVoice'
  | 'sceneProgression'
  | 'relationshipAwareness'
  | 'emotionalDepth'
  | 'sensoryGrounding'
  | 'playerAgency'

export type NarrativeQualityMetadata = {
  source: 'ainovel-inspired'
  score: number
  dimensions: Record<NarrativeQualityDimension, number>
  intent: NarrativeIntent
  checkpoint: NarrativePlan['coordinator']['checkpoint']
  notes: string[]
}

export type NarrativePlanInput = {
  userMessage: string
  characterName?: string | null
  scenario?: string | null
  relationshipStatus?: string | null
  sceneMode?: string | null
  activeSceneTitle?: string | null
  pendingEventCount?: number | null
  timelineSummaries?: string[]
  responseDepth?: string | null
  replyProfile?: string | null
}

export type NarrativeQualityInput = {
  reply: string
  userMessage: string
  responseDepth?: string | null
  replyProfile?: string | null
  activeScene?: boolean
}

function includesAny(text: string, patterns: Array<string | RegExp>) {
  return patterns.some((pattern) => (typeof pattern === 'string' ? text.includes(pattern.toLowerCase()) : pattern.test(text)))
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function classifyNarrativeIntent(userMessage: string): NarrativeIntent {
  const message = userMessage.toLowerCase()
  if (message.trim().startsWith('/scene')) return 'scene_control'
  if (includesAny(message, ['ทำไม', 'อะไร', 'ยังไง', 'ไหม', '?', 'why', 'what', 'how'])) return 'question'
  if (includesAny(message, ['ช่วย', 'ขอ', 'อยากให้', 'please', 'help'])) return 'request'
  if (includesAny(message, ['ไว้ใจ', 'ความลับ', 'กลัว', 'เหงา', 'เจ็บ', 'trust', 'secret', 'lonely', 'afraid'])) return 'vulnerability'
  if (includesAny(message, ['รัก', 'คิดถึง', 'ชอบ', 'ห่วง', 'love', 'miss', 'like'])) return 'affection'
  if (includesAny(message, ['ไม่', 'หยุด', 'เกลียด', 'โกรธ', 'ท้า', 'โกหก', 'hate', 'angry', 'stop'])) return 'conflict'
  return 'conversation'
}

function checkpointFor(input: NarrativePlanInput, intent: NarrativeIntent): NarrativePlan['coordinator']['checkpoint'] {
  if (input.sceneMode === 'scene' || input.activeSceneTitle) return 'scene'
  if (intent === 'affection' || intent === 'conflict' || intent === 'vulnerability') return 'relationship'
  return 'turn'
}

function focusFor(input: NarrativePlanInput, intent: NarrativeIntent) {
  if (input.sceneMode === 'scene' && input.activeSceneTitle) return `keep the active scene moving toward "${input.activeSceneTitle}"`
  if ((input.pendingEventCount ?? 0) > 0) return 'keep sandbox flow natural while softly foreshadowing pending scene choices'
  if (intent === 'conflict') return 'hold emotional friction without resolving it too quickly'
  if (intent === 'affection') return 'let closeness build through reaction, subtext, and earned trust'
  if (intent === 'vulnerability') return 'answer with care while preserving the player choice to continue or pull back'
  if (intent === 'question') return 'answer in character and convert the answer back into playable roleplay'
  if (intent === 'request') return 'respond to the request through action and character voice, not a flat summary'
  return 'continue the current emotional beat with concrete action'
}

function contextStrategyFor(input: NarrativePlanInput): NarrativePlan['contextStrategy'] {
  const depth = input.responseDepth?.toLowerCase()
  const timelineItems = Math.min(Math.max(input.timelineSummaries?.length ?? 0, 2), 6)
  if (depth === 'cinematic' || input.sceneMode === 'scene') {
    return { recentTurns: 8, timelineItems, summaryMode: 'rolling' }
  }
  if (depth === 'deep' || input.replyProfile === 'deep_roleplay') {
    return { recentTurns: 6, timelineItems, summaryMode: 'light' }
  }
  return { recentTurns: 4, timelineItems: Math.min(timelineItems, 4), summaryMode: 'light' }
}

export function buildNarrativePlan(input: NarrativePlanInput): NarrativePlan {
  const intent = classifyNarrativeIntent(input.userMessage)
  const checkpoint = checkpointFor(input, intent)
  const characterName = input.characterName?.trim() || 'the character'
  const relationship = input.relationshipStatus?.trim() || 'current relationship'
  const scenario = input.scenario?.trim() || 'current chat setting'
  const contextStrategy = contextStrategyFor(input)
  const minimumParagraphs = input.responseDepth === 'quick' ? 2 : input.responseDepth === 'cinematic' ? 5 : 3

  return {
    source: 'ainovel-inspired',
    intent,
    coordinator: {
      route: 'roleplay_turn',
      checkpoint,
    },
    architect: {
      focus: focusFor(input, intent),
      tension: `anchor ${characterName} inside ${scenario} and the ${relationship} relationship frame`,
      continuity: 'reuse the latest memory, relationship timeline, scene state, and world state before adding new beats',
    },
    writer: {
      beats: [
        'open with visible reaction or physical grounding',
        'show internal pressure through subtext instead of explaining the system',
        'answer the user turn directly in character',
        'end with a playable hook that leaves agency with the player',
      ],
      minimumParagraphs,
      preserveUserAgency: true,
    },
    editor: {
      rubric: [
        'continuity with recent turns',
        'stable character voice',
        'clear scene or relationship movement',
        'emotional texture beyond one-line acknowledgement',
        'concrete action or sensory grounding',
        'no narration of player choices as facts',
        'a hook the player can answer',
      ],
      revisionTriggers: [
        'one-line reply for roleplay',
        'generic assistant explanation',
        'ignores relationship or scene state',
        'resolves conflict or intimacy too fast',
        'removes player agency',
      ],
    },
    contextStrategy,
  }
}

export function buildNarrativePromptBlock(plan: NarrativePlan) {
  return [
    'Maprang Narrative Engine:',
    `- Source pattern: ${plan.source}; use Coordinator -> Architect -> Writer -> Editor as an internal workflow.`,
    `- Coordinator route: ${plan.coordinator.route}; checkpoint: ${plan.coordinator.checkpoint}; intent: ${plan.intent}.`,
    `- Architect focus: ${plan.architect.focus}.`,
    `- Architect tension: ${plan.architect.tension}.`,
    `- Continuity rule: ${plan.architect.continuity}.`,
    `- Context strategy: recentTurns=${plan.contextStrategy.recentTurns}, timelineItems=${plan.contextStrategy.timelineItems}, summaryMode=${plan.contextStrategy.summaryMode}.`,
    `- Writer minimum paragraphs: ${plan.writer.minimumParagraphs}; preserve player agency: ${plan.writer.preserveUserAgency ? 'yes' : 'no'}.`,
    `- Writer beats: ${plan.writer.beats.join(' | ')}.`,
    `- Editor rubric: ${plan.editor.rubric.join(' | ')}.`,
    `- Revise before final answer if any trigger appears: ${plan.editor.revisionTriggers.join(' | ')}.`,
  ].join('\n')
}

function dimensionScore(value: boolean, partial = false) {
  if (value) return 100
  if (partial) return 60
  return 30
}

export function analyzeNarrativeQuality(input: NarrativeQualityInput): NarrativeQualityMetadata {
  const reply = input.reply.trim()
  const normalized = reply.toLowerCase()
  const intent = classifyNarrativeIntent(input.userMessage)
  const hasContinuity = includesAny(normalized, ['เมื่อกี้', 'ก่อนหน้านี้', 'จำ', 'ฉาก', 'สถานะ', 'ความสัมพันธ์', 'last', 'before'])
  const hasVoice = reply.length > 0 && !includesAny(normalized, ['as an ai', 'system prompt', 'language model'])
  const hasSceneProgression = input.activeScene || includesAny(normalized, ['ขยับ', 'มอง', 'เดิน', 'จับ', 'เงียบ', 'บรรยากาศ', '*'])
  const hasRelationship = includesAny(normalized, ['ความสัมพันธ์', 'ไว้ใจ', 'ระยะ', 'ใกล้', 'ห่าง', 'ห่วง', 'รัก', 'โกรธ'])
  const hasEmotion = includesAny(normalized, ['รู้สึก', 'ใจ', 'กลัว', 'เขิน', 'โกรธ', 'เหงา', 'สั่น', 'ลังเล'])
  const hasSenses = includesAny(normalized, ['เสียง', 'แสง', 'ลมหายใจ', 'สายตา', 'ปลายนิ้ว', 'อากาศ', 'เงา', 'กลิ่น'])
  const preservesAgency = !includesAny(normalized, ['คุณรู้สึกว่า', 'คุณตัดสินใจว่า', 'คุณยอมรับว่า', 'you feel that', 'you decide that'])
  const hasHook = /[?？]|ไหม|หรือ|อยาก|จะ/.test(reply)

  const dimensions: Record<NarrativeQualityDimension, number> = {
    continuity: dimensionScore(hasContinuity, reply.length > 500),
    characterVoice: dimensionScore(hasVoice),
    sceneProgression: dimensionScore(hasSceneProgression),
    relationshipAwareness: dimensionScore(hasRelationship, intent === 'affection' || intent === 'conflict' || intent === 'vulnerability'),
    emotionalDepth: dimensionScore(hasEmotion, reply.length > 400),
    sensoryGrounding: dimensionScore(hasSenses, reply.length > 350),
    playerAgency: dimensionScore(preservesAgency && hasHook, preservesAgency),
  }
  const score = clampScore(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / Object.keys(dimensions).length)
  const notes: string[] = []

  if (!hasContinuity) notes.push('Add a clear reference to recent context, relationship state, or active scene.')
  if (!hasSceneProgression) notes.push('Add visible action or scene movement.')
  if (!hasRelationship) notes.push('Reflect how the relationship frame changes the reply.')
  if (!hasEmotion) notes.push('Add internal emotional pressure or subtext.')
  if (!hasSenses) notes.push('Ground the turn with sensory detail.')
  if (!hasHook) notes.push('End with a playable hook.')
  if (!preservesAgency) notes.push('Do not decide the player feelings or actions for them.')

  return {
    source: 'ainovel-inspired',
    score,
    dimensions,
    intent,
    checkpoint: input.activeScene ? 'scene' : intent === 'affection' || intent === 'conflict' || intent === 'vulnerability' ? 'relationship' : 'turn',
    notes,
  }
}
