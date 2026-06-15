import { Buffer } from 'node:buffer'
import OpenAI from 'openai'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import { creatorDraftRetryAttempts, creatorDraftRetryDelayMs, modelName, openrouterBaseUrl } from './config'
import { uploadAvatarBytes } from './storage.service'
import { getPrisma } from './db'
import { buildCreatorKnowledgePrompt } from './knowledge.service'
import { redactSensitiveText } from './redaction'

export async function getCreatorDraft(userId: string) {
  const prisma = getPrisma()
  if (!prisma) return null
  const draft = await prisma.creatorDraft.findUnique({
    where: { userId },
  })
  return draft ? draft.payload : null
}

export async function saveCreatorDraft(userId: string, payload: unknown) {
  const prisma = getPrisma()
  if (!prisma) return
  if (payload === null) {
    await prisma.creatorDraft.deleteMany({ where: { userId } })
    return
  }
  await prisma.creatorDraft.upsert({
    where: { userId },
    update: { payload: payload ?? {} },
    create: { userId, payload: payload ?? {} },
  })
}

export type CreatorDraftFields = {
  name: string
  tagline: string
  description: string
  biography: string
  scenario: string
  systemPrompt: string
  compactPrompt: string
  characterAnchor: string
  constraints: string
  greeting: string
  tags: string
}

export type CreatorDraftInput = {
  brief?: string
  imagePrompt?: string
  current?: Partial<CreatorDraftFields>
  origin?: string
  imageOnly?: boolean
  skipImageProvider?: boolean
  imageStyle?: string
  userApiKey?: string
  userApiProvider?: string
}

export type CreatorDraftResult = {
  draft: CreatorDraftFields
  image: {
    url: string
    provider: 'configured' | 'placeholder'
    prompt: string
    note: string
  }
  source: 'ai' | 'fallback'
  modelName: string
  warnings: string[]
}

type CompletionFn = (messages: Array<{ role: 'system' | 'user'; content: string }>) => Promise<ChatCompletion>

const openRouter = new OpenAI({
  baseURL: openrouterBaseUrl,
  apiKey: process.env.OPENROUTER_API_KEY || 'missing-openrouter-key',
})

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function clip(value: unknown, maxLength: number): string {
  const text: string =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.filter((item) => typeof item === 'string').join('\n')
        : value && typeof value === 'object'
          ? Object.values(value)
              .map((item) => clip(item, maxLength))
              .filter(Boolean)
              .join('\n')
          : value === null || value === undefined
            ? ''
            : String(value)
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized
}

function buildGeneratedAvatarDataUrl(signal: string) {
  const hash = hashText(signal || 'maprang-generated-character')
  const palettes: Array<[string, string, string]> = [
    ['#fb7185', '#f97316', '#111827'],
    ['#38bdf8', '#8b5cf6', '#111827'],
    ['#34d399', '#14b8a6', '#0f172a'],
    ['#f59e0b', '#ec4899', '#111827'],
    ['#a78bfa', '#6366f1', '#111827'],
  ]
  const [accent, secondary, base] = palettes[hash % palettes.length] ?? ['#fb7185', '#f97316', '#111827']
  const tilt = (hash % 18) - 9
  const glowX = 180 + (hash % 180)
  const glowY = 150 + ((hash >> 3) % 220)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 1024">
      <defs>
        <radialGradient id="glow" cx="${glowX}" cy="${glowY}" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${accent}" stop-opacity="0.82"/>
          <stop offset="0.5" stop-color="${secondary}" stop-opacity="0.44"/>
          <stop offset="1" stop-color="${base}" stop-opacity="1"/>
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect width="768" height="1024" fill="url(#glow)"/>
      <circle cx="610" cy="120" r="180" fill="#ffffff" opacity="0.10" filter="url(#soft)"/>
      <circle cx="120" cy="840" r="240" fill="${accent}" opacity="0.24" filter="url(#soft)"/>
      <g transform="translate(384 476) rotate(${tilt})">
        <ellipse cx="0" cy="-120" rx="146" ry="174" fill="#f8fafc" opacity="0.88"/>
        <path d="M-210 286 C-166 86 -74 16 0 16 C74 16 166 86 210 286 Z" fill="#f8fafc" opacity="0.84"/>
        <path d="M-230 -84 C-174 -258 -42 -330 90 -284 C200 -246 254 -118 220 72 C128 0 42 -18 -44 4 C-118 22 -178 -4 -230 -84 Z" fill="#0f172a" opacity="0.72"/>
        <path d="M-188 242 C-118 180 -54 152 0 152 C54 152 118 180 188 242" fill="none" stroke="${secondary}" stroke-width="18" stroke-linecap="round" opacity="0.72"/>
      </g>
      <rect x="46" y="54" width="676" height="916" rx="42" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="3"/>
      <path d="M78 826 C210 766 314 786 430 850 C522 900 614 898 694 848" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="6" stroke-linecap="round"/>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const fallbackNames = ['ไอริส | IRIS', 'เรน่า | RENA', 'มิกะ | MIKA', 'เซลีน | SELENE', 'อาเรีย | ARIA']

function fallbackDraft(input: CreatorDraftInput): CreatorDraftFields {
  const signal = [input.brief, input.imagePrompt, input.current?.name, input.current?.tagline].filter(Boolean).join(' | ')
  const name = input.current?.name?.trim() || fallbackNames[hashText(signal) % fallbackNames.length] || 'มาปราง | MAPRANG'
  const mood = input.current?.tagline?.trim() || 'ความสัมพันธ์ค่อย ๆ ลึกขึ้นผ่านบทสนทนาและฉากสำคัญ'
  const visualCue = clip(input.imagePrompt || input.brief || 'ตัวละครออริจินัลโทนโรลเพลย์ไทย', 180)

  return {
    name,
    tagline: mood,
    description:
      input.current?.description?.trim() ||
      `${name} เป็นตัวละครโรลเพลย์ที่มีภาพจำชัดจากโทน "${visualCue}" บุคลิกมีพื้นที่ให้ผู้เล่นค่อย ๆ ค้นพบผ่านการเลือกคำพูด ความไว้ใจ และแรงปะทะทางอารมณ์`,
    biography:
      input.current?.biography?.trim() ||
      [
        `${name} เคยผ่านเหตุการณ์ที่ทำให้ไม่เปิดใจให้ใครง่าย ๆ แต่ยังมีด้านอ่อนโยนที่ซ่อนอยู่`,
        'เธอจดจำรายละเอียดเล็ก ๆ จากบทสนทนา และจะตอบสนองต่อความสม่ำเสมอของผู้เล่นมากกว่าคำพูดหวานเพียงครั้งเดียว',
        'ความลับบางอย่างควรถูกปลดล็อกเมื่อระดับความไว้ใจหรือแรงปะทะไปถึงจังหวะที่เหมาะสม',
      ].join('\n\n'),
    scenario:
      input.current?.scenario?.trim() ||
      'ผู้เล่นพบเธอในช่วงเวลาที่บรรยากาศรอบตัวเงียบลงพอดี เหมือนบทสนทนาครั้งนี้อาจเปลี่ยนความสัมพันธ์ของทั้งสองคน',
    systemPrompt:
      input.current?.systemPrompt?.trim() ||
      [
        `คุณคือ ${name} ตัวละครโรลเพลย์ภาษาไทย บุคลิกหลักคือมีเสน่ห์ มีขอบเขต และตอบสนองต่อความสัมพันธ์ที่ค่อย ๆ พัฒนา`,
        `ภาพรวมตัวละครอิงจาก: ${visualCue}`,
        'ตอบเป็นภาษาไทยในเสียงของตัวละคร ใช้ภาษากายและบรรยากาศพอประมาณ ไม่เขียนแทนความคิดหรือการกระทำของผู้เล่น',
        'ให้ความสนิท ความไว้ใจ และความตึงเครียดเติบโตจากสิ่งที่ผู้เล่นพิมพ์ ไม่เร่งความสัมพันธ์ทันที',
        'เมื่อถึงจังหวะสำคัญ ให้เปิดพื้นที่สำหรับ scene/event โดยไม่บังคับผู้เล่นเข้าสู่ฉาก',
      ].join('\n'),
    compactPrompt: `${name}: ${mood}. เล่นบทภาษาไทยแบบ slow-burn และรักษาขอบเขตของตัวละคร`,
    characterAnchor: `${name} มีตัวตนชัด ไม่ยอมเปลี่ยนใจง่าย ๆ แต่จะค่อย ๆ เปิดเผยความจริงเมื่อผู้เล่นทำให้เชื่อใจ`,
    constraints: ['อย่าเขียนบทพูดหรือการกระทำแทนผู้เล่น', 'รักษาขอบเขตและการปฏิเสธ', 'ค่อย ๆ เพิ่มความใกล้ชิดตามบริบท'].join('\n'),
    greeting: input.current?.greeting?.trim() || 'มาถึงแล้วเหรอ... ฉันกำลังคิดอยู่พอดีว่าเธอจะเริ่มคุยกับฉันยังไง',
    tags: input.current?.tags?.trim() || 'roleplay, thai, original, slow-burn, trust-building',
  }
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^```[^\n\r]*[\n\r]+/, '')
    .replace(/```$/, '')
    .trim()
}

function extractJsonObject(value: string) {
  const start = value.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < value.length; index += 1) {
    const char = value[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) return value.slice(start, index + 1)
    }
  }

  return null
}

function parseJsonObject(value: string) {
  const unfenced = stripCodeFence(value)
  const raw = extractJsonObject(unfenced) || unfenced
  try {
    return JSON.parse(raw) as Partial<CreatorDraftFields>
  } catch {
    throw new SyntaxError('โมเดลคืน JSON สำหรับดราฟต์ตัวละครไม่ถูกต้องหรือไม่สมบูรณ์')
  }
}

function providerStatus(error: unknown) {
  if (!error || typeof error !== 'object') return null
  const status = (error as { status?: unknown }).status
  if (typeof status === 'number') return status
  const code = (error as { code?: unknown }).code
  if (typeof code === 'number') return code
  return null
}

function creatorDraftRetryRawMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
    const errorField = (error as { error?: unknown }).error
    if (typeof errorField === 'string') return errorField
    return ''
  }
  return String(error)
}

function creatorDraftRetryMessage(error: unknown) {
  const message = creatorDraftRetryRawMessage(error)
  return redactSensitiveText(message).text.toLowerCase()
}

function isRetryableCreatorDraftError(error: unknown) {
  const status = providerStatus(error)
  if (status && [408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true

  if (error instanceof SyntaxError) return true

  const message = creatorDraftRetryMessage(error)
  return [
    'fetch failed',
    'network',
    'timeout',
    'timed out',
    'operation was aborted',
    'econnreset',
    'etimedout',
    'temporarily unavailable',
    'rate limit',
    'overloaded',
    'service unavailable',
    'bad gateway',
    'gateway timeout',
    'json parse error',
    'unexpected eof',
    'unexpected end',
    'unterminated',
  ].some((hint) => message.includes(hint))
}

async function buildAiDraftWithRetry(
  completion: CompletionFn,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  fallback: CreatorDraftFields,
) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= creatorDraftRetryAttempts; attempt += 1) {
    try {
      const completionResult = await completion(messages)
      const content = completionResult.choices[0]?.message?.content ?? ''
      return normalizeDraft(parseJsonObject(content), fallback)
    } catch (error) {
      lastError = error
      if (attempt >= creatorDraftRetryAttempts || !isRetryableCreatorDraftError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, creatorDraftRetryDelayMs * attempt))
    }
  }

  throw lastError
}

function normalizeDraft(value: Partial<CreatorDraftFields>, fallback: CreatorDraftFields): CreatorDraftFields {
  return {
    name: clip(value.name || fallback.name, 80),
    tagline: clip(value.tagline || fallback.tagline, 180),
    description: clip(value.description || fallback.description, 900),
    biography: clip(value.biography || fallback.biography, 1600),
    scenario: clip(value.scenario || fallback.scenario, 900),
    systemPrompt: clip(value.systemPrompt || fallback.systemPrompt, 2200),
    compactPrompt: clip(value.compactPrompt || fallback.compactPrompt, 400),
    characterAnchor: clip(value.characterAnchor || fallback.characterAnchor, 600),
    constraints: clip(value.constraints || fallback.constraints, 700),
    greeting: clip(value.greeting || fallback.greeting, 360),
    tags: clip(value.tags || fallback.tags, 260),
  }
}

function draftPrompt(input: CreatorDraftInput) {
  const current = input.current ?? {}
  return [
    'สร้างดราฟต์ตัวละครโรลเพลย์ภาษาไทยสำหรับ Maprang AI',
    buildCreatorKnowledgePrompt(),
    'ตอบเป็น JSON เท่านั้น ห้ามใส่ markdown',
    'key ที่ต้องมี: name, tagline, description, biography, scenario, systemPrompt, compactPrompt, characterAnchor, constraints, greeting, tags',
    'ทุก value ต้องเป็น plain string ส่วน tags ต้องเป็น string คั่นด้วย comma ไม่ใช่ array',
    'ตัวละครต้องเอาไปใช้ได้ทันทีใน flow สร้างตัวละครแบบ Khuiai แต่มีความลึกผ่านระบบ relationship/scene ของ Maprang',
    'เนื้อหาหลักทั้งหมดให้เขียนเป็นภาษาไทย ยกเว้นชื่อ romanized หลังเครื่องหมาย pipe ถ้าจำเป็น',
    'ห้ามเขียนเนื้อหา sexual explicit โดยตรง รองรับ mature/adult roleplay setup ได้เฉพาะในระดับ tag หรือโทนความสัมพันธ์เมื่อผู้ใช้ขอ',
    `โจทย์สั้น: ${clip(input.brief || '', 700) || 'สร้างตัวละครออริจินัลสำหรับโรลเพลย์ไทย'}`,
    `คำใบ้รูป/ภาพจำ: ${clip(input.imagePrompt || '', 700) || 'ยังไม่มีคำใบ้รูป'}`,
    `ชื่อปัจจุบัน: ${current.name || ''}`,
    `คำโปรยปัจจุบัน: ${current.tagline || ''}`,
    `แท็กปัจจุบัน: ${current.tags || ''}`,
  ].filter(Boolean).join('\n')
}

async function defaultCompletion(messages: Array<{ role: 'system' | 'user'; content: string }>) {
  return openRouter.chat.completions.create({
    model: modelName,
    messages,
  })
}

function friendlyImageFailureReason(message: string) {
  const safeMessage = redactSensitiveText(message).text
  const normalized = safeMessage.toLowerCase()
  const status = safeMessage.match(/(?:returned|ตอบกลับ)\s+(\d{3})/i)?.[1]
  const suffix = status ? ` (HTTP ${status})` : ''
  if (normalized.includes('billing_hard_limit_reached') || normalized.includes('billing hard limit')) {
    return `ระบบสร้างรูปจริงติดเพดานวงเงิน${suffix}: เพิ่มหรือรีเซ็ตวงเงิน/เพดานใช้จ่ายของระบบสร้างรูปจริง แล้วรัน smoke:image:live อีกครั้ง`
  }
  if (normalized.includes('insufficient_quota') || normalized.includes('quota')) {
    return `โควตาระบบสร้างรูปจริงไม่พร้อม${suffix}: เติมเครดิตหรือเพิ่มโควตาของระบบสร้างรูปจริง แล้วรัน smoke:image:live อีกครั้ง`
  }
  if (normalized.includes('invalid_api_key') || normalized.includes('incorrect api key') || normalized.includes('unauthorized')) {
    return `คีย์ระบบสร้างรูปจริงไม่ถูกต้อง${suffix}: เปลี่ยน IMAGE_GENERATION_API_KEY หรือ OPENAI_API_KEY เป็นคีย์สำหรับระบบหลังบ้านที่ถูกต้อง`
  }
  return `ระบบสร้างรูปจริงตอบกลับผิดพลาด${suffix}${safeMessage ? `: ${clip(safeMessage, 140)}` : ''}`
}

function safeFailureDetail(error: unknown, max = 160) {
  if (!(error instanceof Error)) return 'ไม่ทราบสาเหตุ'
  return clip(redactSensitiveText(error.message).text, max)
}

async function readImageProviderJson(response: Response) {
  try {
    return (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> }
  } catch {
    throw new Error('ระบบสร้างรูปจริงตอบกลับ JSON ไม่ถูกต้อง')
  }
}

async function generateConfiguredImage(prompt: string, origin?: string, userApiKey?: string, userApiProvider?: string) {
  const apiKey = userApiKey || process.env.IMAGE_GENERATION_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = userApiKey ? 'dall-e-3' : (process.env.IMAGE_GENERATION_MODEL || 'gpt-image-1.5')
  const isGptImageModel = model.startsWith('gpt-image') || model === 'chatgpt-image-latest'
  const body: Record<string, unknown> = {
    model,
    prompt,
    size: process.env.IMAGE_GENERATION_SIZE || '1024x1536',
  }

  if (process.env.IMAGE_GENERATION_QUALITY) body.quality = process.env.IMAGE_GENERATION_QUALITY
  if (process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION) body.output_compression = Number(process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION)
  if (isGptImageModel) {
    body.output_format = process.env.IMAGE_GENERATION_OUTPUT_FORMAT || 'webp'
  } else if (model === 'dall-e-2') {
    body.response_format = 'b64_json'
  } else if (model === 'dall-e-3') {
    body.response_format = 'url'
  }

  const endpoint = userApiKey && userApiProvider === 'openrouter'
    ? 'https://openrouter.ai/api/v1/images/generations'
    : 'https://api.openai.com/v1/images/generations'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = redactSensitiveText(await response.text().catch(() => '')).text
    throw new Error(`ระบบสร้างรูปจริงตอบกลับ ${response.status}${detail ? `: ${clip(detail, 180)}` : ''}`)
  }
  const payload = await readImageProviderJson(response)
  const image = payload.data?.[0]
  if (image?.b64_json) {
    const outputFormat = String(body.output_format || 'png')
    const contentType = outputFormat === 'jpeg' ? 'image/jpeg' : outputFormat === 'webp' ? 'image/webp' : 'image/png'
    const bytes = new Uint8Array(Buffer.from(image.b64_json, 'base64'))
    if (origin) {
      const uploaded = await uploadAvatarBytes({ bytes, contentType, origin })
      if (uploaded.ok) return uploaded.url
    }
    return `data:${contentType};base64,${image.b64_json}`
  }
  if (image?.url && origin) {
    const imageResponse = await fetch(image.url)
    if (!imageResponse.ok) throw new Error(`ดาวน์โหลด URL จากระบบสร้างรูปจริงตอบกลับ ${imageResponse.status}`)
    const contentType = imageResponse.headers.get('Content-Type') || 'image/png'
    const bytes = new Uint8Array(await imageResponse.arrayBuffer())
    const uploaded = await uploadAvatarBytes({ bytes, contentType, origin })
    if (uploaded.ok) return uploaded.url
    throw new Error('อัปโหลดรูปตัวละครไม่สำเร็จหลังได้คำตอบจากระบบสร้างรูปจริง')
  }
  if (image?.url) return image.url
  throw new Error('คำตอบจากระบบสร้างรูปจริงไม่มีข้อมูลรูปภาพ')
}

export async function generateCreatorDraft(input: CreatorDraftInput, completion: CompletionFn = defaultCompletion): Promise<CreatorDraftResult> {
  const safeInput = {
    brief: clip(input.brief || '', 1200),
    imagePrompt: clip(input.imagePrompt || '', 1200),
    current: input.current,
    origin: input.origin,
    imageOnly: input.imageOnly,
    skipImageProvider: input.skipImageProvider,
    imageStyle: clip(input.imageStyle || '', 100),
    userApiKey: input.userApiKey,
    userApiProvider: input.userApiProvider,
  }
  const fallback = fallbackDraft(safeInput)
  const warnings: string[] = []
  let draft = fallback
  let source: CreatorDraftResult['source'] = 'fallback'

  let completionFn = completion
  if (safeInput.userApiKey) {
    let baseURL = 'https://openrouter.ai/api/v1'
    let model = modelName
    if (safeInput.userApiProvider === 'openai') {
      baseURL = 'https://api.openai.com/v1'
      model = 'gpt-4o-mini'
    } else if (safeInput.userApiProvider === 'gemini') {
      baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai'
      model = 'gemini-1.5-flash'
    }
    const client = new OpenAI({ baseURL, apiKey: safeInput.userApiKey })
    completionFn = async (messages) => {
      return client.chat.completions.create({
        model,
        messages,
      })
    }
  }

  if (safeInput.imageOnly) {
    draft = normalizeDraft(safeInput.current || {}, fallback)
    source = 'fallback'
  } else if (safeInput.userApiKey || process.env.OPENROUTER_API_KEY) {
    try {
      draft = await buildAiDraftWithRetry(
        completionFn,
        [
          {
            role: 'system',
            content:
              'คุณคือผู้ออกแบบตัวละครภาษาไทยระดับ senior สำหรับแพลตฟอร์ม AI roleplay ให้สร้างดราฟต์ที่กระชับ เล่นได้จริง และอารมณ์ของตัวละครคงเส้นคงวา',
          },
          { role: 'user', content: draftPrompt(safeInput) },
        ],
        fallback,
      )
      source = 'ai'
    } catch (error) {
      const reason = safeFailureDetail(error)
      warnings.push(`สร้างเนื้อหาด้วยโมเดลไม่สำเร็จ จึงใช้ดราฟต์สำรองในเครื่อง: ${reason}`)
    }
  } else {
    warnings.push('ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY หรือ User API Key จึงใช้ดราฟต์สำรองในเครื่อง')
  }

  const imagePrompt = [
    safeInput.imagePrompt || safeInput.brief || draft.description,
    draft.name,
    draft.tagline,
    safeInput.imageStyle ? `${safeInput.imageStyle} style` : '',
    'portrait character concept art, clean composition, suitable for roleplay character avatar',
  ]
    .filter(Boolean)
    .join(', ')
  const hasImageProvider = Boolean(safeInput.userApiKey || process.env.IMAGE_GENERATION_API_KEY || process.env.OPENAI_API_KEY)
  const shouldUseImageProvider = hasImageProvider && !safeInput.skipImageProvider
  let configuredImage: string | null = null
  let imageFailureReason: string | null = null

  if (shouldUseImageProvider) {
    try {
      configuredImage = await generateConfiguredImage(imagePrompt, safeInput.origin, safeInput.userApiKey, safeInput.userApiProvider)
    } catch (error) {
      const reason = error instanceof Error ? friendlyImageFailureReason(error.message) : 'ไม่ทราบสาเหตุ'
      imageFailureReason = reason
      warnings.push(`สร้างรูปด้วยระบบสร้างรูปจริงไม่สำเร็จ จึงใช้ภาพร่างระบบ: ${reason}`)
    }
  }

  return {
    draft,
    image: configuredImage
      ? {
          url: configuredImage,
          provider: 'configured',
          prompt: imagePrompt,
          note: 'สร้างรูปจากระบบสร้างรูปที่ตั้งค่าไว้แล้ว',
        }
      : {
          url: buildGeneratedAvatarDataUrl(imagePrompt),
          provider: 'placeholder',
          prompt: imagePrompt,
          note: safeInput.skipImageProvider
            ? 'ข้ามระบบสร้างรูปจริงสำหรับ smoke/dev check จึงใช้ภาพร่างระบบสำหรับจัดฟอร์ม'
            : shouldUseImageProvider
            ? `เชื่อมระบบสร้างรูปจริงแล้ว แต่สร้างรูปไม่สำเร็จ${imageFailureReason ? `: ${imageFailureReason}` : ''} จึงใช้ภาพร่างระบบสำหรับจัดฟอร์ม`
            : 'ยังไม่ได้เชื่อมระบบสร้างรูปจริง จึงใช้ภาพร่างระบบสำหรับจัดฟอร์ม',
        },
    source,
    modelName,
    warnings,
  }
}
