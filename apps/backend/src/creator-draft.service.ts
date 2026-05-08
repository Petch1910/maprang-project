import { Buffer } from 'node:buffer'
import OpenAI from 'openai'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import { modelName } from './config'
import { uploadAvatarBytes } from './storage.service'

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
  baseURL: 'https://openrouter.ai/api/v1',
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

function parseJsonObject(value: string) {
  const trimmed = value.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
  const raw = fenced || trimmed.match(/\{[\s\S]*\}/)?.[0] || trimmed
  return JSON.parse(raw) as Partial<CreatorDraftFields>
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
    'Create a Thai roleplay character draft for Maprang AI.',
    'Return JSON only. Do not include markdown.',
    'Required keys: name, tagline, description, biography, scenario, systemPrompt, compactPrompt, characterAnchor, constraints, greeting, tags.',
    'Every value must be a plain string. tags must be one comma-separated string, not an array.',
    'The character must feel usable immediately in a Khuiai-like creator flow, but deeper through relationship/scene systems.',
    'Keep all prose in Thai except optional romanized name after a pipe.',
    'Do not write sexual explicit content. You may support mature/adult roleplay setup only as tags/relationship tone when the user asks.',
    `Brief: ${clip(input.brief || '', 700) || 'สร้างตัวละครออริจินัลสำหรับโรลเพลย์ไทย'}`,
    `Image prompt/cue: ${clip(input.imagePrompt || '', 700) || 'no image cue yet'}`,
    `Current name: ${current.name || ''}`,
    `Current tagline: ${current.tagline || ''}`,
    `Current tags: ${current.tags || ''}`,
  ].join('\n')
}

async function defaultCompletion(messages: Array<{ role: 'system' | 'user'; content: string }>) {
  return openRouter.chat.completions.create({
    model: modelName,
    messages,
  })
}

async function generateConfiguredImage(prompt: string, origin?: string) {
  const apiKey = process.env.IMAGE_GENERATION_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = process.env.IMAGE_GENERATION_MODEL || 'gpt-image-1.5'
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
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`image provider returned ${response.status}${detail ? `: ${clip(detail, 180)}` : ''}`)
  }
  const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> }
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
    if (!imageResponse.ok) throw new Error(`image provider URL download returned ${imageResponse.status}`)
    const contentType = imageResponse.headers.get('Content-Type') || 'image/png'
    const bytes = new Uint8Array(await imageResponse.arrayBuffer())
    const uploaded = await uploadAvatarBytes({ bytes, contentType, origin })
    if (uploaded.ok) return uploaded.url
    throw new Error('avatar upload failed after image provider response')
  }
  if (image?.url) return image.url
  throw new Error('image provider response did not include image data')
}

export async function generateCreatorDraft(input: CreatorDraftInput, completion: CompletionFn = defaultCompletion): Promise<CreatorDraftResult> {
  const safeInput = {
    brief: clip(input.brief || '', 1200),
    imagePrompt: clip(input.imagePrompt || '', 1200),
    current: input.current,
    origin: input.origin,
  }
  const fallback = fallbackDraft(safeInput)
  const warnings: string[] = []
  let draft = fallback
  let source: CreatorDraftResult['source'] = 'fallback'

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const completionResult = await completion([
        {
          role: 'system',
          content:
            'You are a senior Thai character designer for an AI roleplay platform. Produce concise, playable, emotionally coherent character drafts.',
        },
        { role: 'user', content: draftPrompt(safeInput) },
      ])
      const content = completionResult.choices[0]?.message?.content ?? ''
      draft = normalizeDraft(parseJsonObject(content), fallback)
      source = 'ai'
    } catch (error) {
      const reason = error instanceof Error ? clip(error.message, 160) : 'unknown error'
      warnings.push(`สร้างเนื้อหาด้วยโมเดลไม่สำเร็จ จึงใช้ดราฟต์สำรองในเครื่อง: ${reason}`)
    }
  } else {
    warnings.push('ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY จึงใช้ดราฟต์สำรองในเครื่อง')
  }

  const imagePrompt = [
    safeInput.imagePrompt || safeInput.brief || draft.description,
    draft.name,
    draft.tagline,
    'portrait character concept art, clean composition, suitable for roleplay character avatar',
  ]
    .filter(Boolean)
    .join(', ')
  const hasImageProvider = Boolean(process.env.IMAGE_GENERATION_API_KEY || process.env.OPENAI_API_KEY)
  let configuredImage: string | null = null
  let imageFailureReason: string | null = null

  if (hasImageProvider) {
    try {
      configuredImage = await generateConfiguredImage(imagePrompt, safeInput.origin)
    } catch (error) {
      const reason = error instanceof Error ? clip(error.message, 180) : 'unknown error'
      imageFailureReason = reason
      warnings.push(`สร้างรูปด้วย image provider ไม่สำเร็จ จึงใช้ภาพตัวอย่างระบบ: ${reason}`)
    }
  }

  return {
    draft,
    image: configuredImage
      ? {
          url: configuredImage,
          provider: 'configured',
          prompt: imagePrompt,
          note: 'สร้างรูปจาก image provider ที่ตั้งค่าไว้แล้ว',
        }
      : {
          url: buildGeneratedAvatarDataUrl(imagePrompt),
          provider: 'placeholder',
          prompt: imagePrompt,
          note: hasImageProvider
            ? `ตั้งค่า image provider แล้ว แต่สร้างรูปไม่สำเร็จ${imageFailureReason ? `: ${imageFailureReason}` : ''} จึงใช้ภาพตัวอย่างระบบชั่วคราว`
            : 'ยังไม่ได้ตั้งค่า image provider จริง จึงใช้ภาพตัวอย่างระบบชั่วคราว',
        },
    source,
    modelName,
    warnings,
  }
}
