import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { redactSensitiveText } from './redaction'

function findProjectRoot() {
  const candidates = [
    process.env.KNOWLEDGE_ROOT ? resolve(process.env.KNOWLEDGE_ROOT, '..') : '',
    resolve(import.meta.dir, '..'),
    resolve(import.meta.dir, '../..'),
    resolve(import.meta.dir, '../../..'),
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(join(candidate, 'knowledge', 'structured'))) ?? resolve(import.meta.dir, '../../..')
}

const projectRoot = findProjectRoot()
const structuredRoot = join(projectRoot, 'knowledge', 'structured')

const requiredKnowledgeFiles = [
  'chat-style-guide.json',
  'creator-guides.json',
  'relationship-rules.json',
  'scene-rules.json',
  'content-policy.json',
] as const

type KnowledgeFileName = (typeof requiredKnowledgeFiles)[number]

type JsonRecord = Record<string, unknown>

export type StructuredKnowledgeStatus = {
  ok: boolean
  root: string
  files: Array<{
    file: KnowledgeFileName | string
    ok: boolean
    id?: string
    schemaVersion?: number
    updatedAt?: string
    errors: string[]
  }>
  missing: string[]
  errors: string[]
}

export type StructuredKnowledge = {
  chatStyle: JsonRecord
  creatorGuides: JsonRecord
  relationshipRules: JsonRecord
  sceneRules: JsonRecord
  contentPolicy: JsonRecord
  status: StructuredKnowledgeStatus
}

let cachedKnowledge: StructuredKnowledge | null = null

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function childRecord(source: JsonRecord, key: string) {
  return asRecord(source[key])
}

function validateBase(file: string, value: JsonRecord) {
  const errors: string[] = []
  if (value.schemaVersion !== 1) errors.push('schemaVersion ต้องเป็น 1')
  if (typeof value.id !== 'string' || value.id.length === 0) errors.push('ต้องมี id')
  if (typeof value.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.updatedAt)) errors.push('updatedAt ต้องเป็นรูปแบบ YYYY-MM-DD')
  if (!file.startsWith(`${String(value.id)}.`)) {
    errors.push(`ชื่อไฟล์ต้องขึ้นต้นด้วย id "${String(value.id)}"`)
  }
  return errors
}

function validateStructuredFile(file: string, value: JsonRecord) {
  const errors = validateBase(file, value)

  if (file === 'chat-style-guide.json') {
    const prompt = childRecord(value, 'runtimePrompt')
    if (stringArray(prompt.principles).length < 3) errors.push('runtimePrompt.principles ต้องมีอย่างน้อย 3 รายการ')
    if (stringArray(prompt.replyShape).length < 2) errors.push('runtimePrompt.replyShape ต้องมีอย่างน้อย 2 รายการ')
    if (stringArray(prompt.avoid).length < 2) errors.push('runtimePrompt.avoid ต้องมีอย่างน้อย 2 รายการ')
  }

  if (file === 'creator-guides.json') {
    const prompt = childRecord(value, 'draftPrompt')
    if (stringArray(prompt.principles).length < 3) errors.push('draftPrompt.principles ต้องมีอย่างน้อย 3 รายการ')
    if (stringArray(prompt.requiredQualities).length < 3) errors.push('draftPrompt.requiredQualities ต้องมีอย่างน้อย 3 รายการ')
    if (stringArray(prompt.avoid).length < 2) errors.push('draftPrompt.avoid ต้องมีอย่างน้อย 2 รายการ')
  }

  if (file === 'relationship-rules.json') {
    if (!Array.isArray(value.presetSeeds) || value.presetSeeds.length < 3) errors.push('presetSeeds ต้องมีอย่างน้อย 3 รายการ')
    if (stringArray(value.runtimeRules).length < 3) errors.push('runtimeRules ต้องมีอย่างน้อย 3 รายการ')
  }

  if (file === 'scene-rules.json') {
    const sceneMode = childRecord(value, 'sceneMode')
    if (sceneMode.defaultMode !== 'sandbox') errors.push('sceneMode.defaultMode ต้องเป็น sandbox')
    if (stringArray(value.eventTypes).length < 3) errors.push('eventTypes ต้องมีอย่างน้อย 3 รายการ')
    if (stringArray(value.runtimeRules).length < 3) errors.push('runtimeRules ต้องมีอย่างน้อย 3 รายการ')
  }

  if (file === 'content-policy.json') {
    const policy = childRecord(value, 'runtimePolicy')
    if (typeof policy.fictionNotice !== 'string' || policy.fictionNotice.length === 0) errors.push('ต้องมี runtimePolicy.fictionNotice')
    if (stringArray(policy.ageMode).length < 2) errors.push('runtimePolicy.ageMode ต้องมีอย่างน้อย 2 รายการ')
    if (stringArray(policy.promptControl).length < 2) errors.push('runtimePolicy.promptControl ต้องมีอย่างน้อย 2 รายการ')
  }

  return errors
}

function readJsonFile(file: KnowledgeFileName) {
  const raw = readFileSync(join(structuredRoot, file), 'utf8')
  return asRecord(JSON.parse(raw))
}

export function formatKnowledgeError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  return redactSensitiveText(raw).text.slice(0, 500) || 'ไม่ทราบสาเหตุ'
}

export function loadStructuredKnowledge({ force = false } = {}): StructuredKnowledge {
  if (cachedKnowledge && !force) return cachedKnowledge

  const files: StructuredKnowledgeStatus['files'] = []
  const missing: string[] = []
  const errors: string[] = []
  const values = new Map<KnowledgeFileName, JsonRecord>()

  let existingFiles: string[] = []
  try {
    existingFiles = readdirSync(structuredRoot).filter((file) => file.endsWith('.json'))
  } catch (error) {
    errors.push(formatKnowledgeError(error))
  }

  for (const file of requiredKnowledgeFiles) {
    if (!existingFiles.includes(file)) {
      missing.push(file)
      files.push({ file, ok: false, errors: ['missing file'] })
      continue
    }

    try {
      const value = readJsonFile(file)
      const fileErrors = validateStructuredFile(file, value)
      values.set(file, value)
      files.push({
        file,
        ok: fileErrors.length === 0,
        id: typeof value.id === 'string' ? value.id : undefined,
        schemaVersion: typeof value.schemaVersion === 'number' ? value.schemaVersion : undefined,
        updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
        errors: fileErrors,
      })
      errors.push(...fileErrors.map((issue) => `${file}: ${issue}`))
    } catch (error) {
      const message = formatKnowledgeError(error)
      files.push({ file, ok: false, errors: [message] })
      errors.push(`${file}: ${message}`)
    }
  }

  for (const file of existingFiles) {
    if (!requiredKnowledgeFiles.includes(file as KnowledgeFileName)) {
      files.push({ file, ok: true, id: basename(file, '.json'), errors: [] })
    }
  }

  const status: StructuredKnowledgeStatus = {
    ok: missing.length === 0 && errors.length === 0,
    root: structuredRoot,
    files,
    missing,
    errors,
  }

  cachedKnowledge = {
    chatStyle: values.get('chat-style-guide.json') ?? {},
    creatorGuides: values.get('creator-guides.json') ?? {},
    relationshipRules: values.get('relationship-rules.json') ?? {},
    sceneRules: values.get('scene-rules.json') ?? {},
    contentPolicy: values.get('content-policy.json') ?? {},
    status,
  }

  return cachedKnowledge
}

function bulletBlock(title: string, values: string[], maxItems = 6) {
  const items = values.slice(0, maxItems)
  if (items.length === 0) return ''
  return [title, ...items.map((item) => `- ${item}`)].join('\n')
}

export function buildChatKnowledgePrompt() {
  const knowledge = loadStructuredKnowledge()
  if (!knowledge.status.ok) return ''

  const runtimePrompt = childRecord(knowledge.chatStyle, 'runtimePrompt')
  const policy = childRecord(knowledge.contentPolicy, 'runtimePolicy')
  const sceneMode = childRecord(knowledge.sceneRules, 'sceneMode')
  const relationshipRules = stringArray(knowledge.relationshipRules.runtimeRules)
  const sceneRules = stringArray(knowledge.sceneRules.runtimeRules)
  const ageMode = stringArray(policy.ageMode)

  return [
    'ชุดความรู้ structured ของ Maprang:',
    bulletBlock('หลักการสไตล์แชท:', stringArray(runtimePrompt.principles)),
    bulletBlock('รูปทรงคำตอบ:', stringArray(runtimePrompt.replyShape)),
    bulletBlock('ข้อห้ามของแพลตฟอร์ม:', stringArray(runtimePrompt.avoid)),
    bulletBlock('กฎ runtime ของความสัมพันธ์:', relationshipRules, 4),
    bulletBlock('กฎ runtime ของฉาก:', sceneRules, 4),
    typeof sceneMode.defaultMode === 'string' ? `โหมดเริ่มต้น: ${sceneMode.defaultMode}` : '',
    typeof sceneMode.entryRule === 'string' ? `กฎเข้า scene: ${sceneMode.entryRule}` : '',
    typeof policy.fictionNotice === 'string' ? `คำเตือนเรื่องสมมุติ: ${policy.fictionNotice}` : '',
    bulletBlock('กฎโหมดอายุ/เนื้อหา:', ageMode, 4),
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildCreatorKnowledgePrompt() {
  const knowledge = loadStructuredKnowledge()
  if (!knowledge.status.ok) return ''

  const draftPrompt = childRecord(knowledge.creatorGuides, 'draftPrompt')
  const policy = childRecord(knowledge.contentPolicy, 'runtimePolicy')

  return [
    'ชุดความรู้ครีเอเตอร์ของ Maprang:',
    bulletBlock('หลักการร่างตัวละครสำหรับครีเอเตอร์:', stringArray(draftPrompt.principles)),
    bulletBlock('คุณภาพตัวละครที่ต้องมี:', stringArray(draftPrompt.requiredQualities)),
    bulletBlock('ข้อห้ามของดราฟต์ครีเอเตอร์:', stringArray(draftPrompt.avoid)),
    typeof policy.fictionNotice === 'string' ? `คำเตือนเรื่องสมมุติ: ${policy.fictionNotice}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function structuredKnowledgeHealth() {
  return loadStructuredKnowledge().status
}
