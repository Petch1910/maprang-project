import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import { generateCreatorDraft } from './creator-draft.service'
import { characterRoutes } from './character.routes'
import { uploadRoot } from './storage.service'

function restoreOpenRouterKey(value: string | undefined) {
  if (value === undefined) {
    delete process.env.OPENROUTER_API_KEY
    return
  }
  process.env.OPENROUTER_API_KEY = value
}

function restoreEnvValue(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }
  process.env[name] = value
}

function completionWith(content: string) {
  return async () =>
    ({
      id: 'test',
      object: 'chat.completion',
      created: 0,
      model: 'test-model',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content,
            refusal: null,
          },
          logprobs: null,
        },
      ],
    }) as ChatCompletion
}

describe('creator AI draft', () => {
  test('normalizes AI JSON into a complete playable draft', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY
    const result = await generateCreatorDraft(
      {
        brief: 'สาวลึกลับในเมืองฝนตก slow burn',
        imagePrompt: 'dark rainy alley, elegant woman',
      },
      completionWith(
        JSON.stringify({
          name: 'ลูน่า | LUNA',
          tagline: 'คนแปลกหน้าที่ดูเหมือนรู้จักคุณมาก่อน',
          description: 'หญิงสาวลึกลับในเมืองฝนตกที่พูดน้อยแต่สังเกตทุกอย่าง',
          biography: 'ลูน่าเคยทิ้งบางอย่างไว้ในเมืองนี้ และกลับมาเพราะคำสัญญาที่ไม่เคยจบ',
          scenario: 'คุณพบเธอใต้ชายคาร้านปิดในคืนฝนตก',
          systemPrompt: 'คุณคือลูน่า ตอบเป็นภาษาไทยแบบลึกลับ สุขุม และไม่เขียนแทนผู้เล่น',
          compactPrompt: 'ลูน่า: ลึกลับ สุขุม slow-burn',
          characterAnchor: 'ไม่เปิดใจง่าย แต่จำรายละเอียดของผู้เล่นได้ดี',
          constraints: 'อย่าเขียนแทนผู้เล่น\nค่อย ๆ เปิดเผยความลับ',
          greeting: 'ฝนตกหนักขนาดนี้... เธอยังตามมาถึงนี่อีกเหรอ',
          tags: 'roleplay, thai, mystery, slow-burn',
        }),
      ),
    )
    restoreOpenRouterKey(previousKey)
    restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
    restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)

    expect(result.source).toBe('ai')
    expect(result.draft.name).toBe('ลูน่า | LUNA')
    expect(result.draft.systemPrompt).toContain('ลูน่า')
    expect(result.image.provider).toBe('placeholder')
    expect(result.image.note).toContain('ยังไม่ได้เชื่อมระบบสร้างรูปจริง')
    expect(result.image.note).toContain('ภาพร่างระบบ')
    expect(result.image.url.startsWith('data:image/svg+xml')).toBe(true)
  })

  test('route returns a draft and image status', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY
    const response = await characterRoutes.handle(
      new Request('http://localhost/creator/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: 'เพื่อนสนิทที่แอบมีความลับ',
          current: { tags: 'roleplay, thai, close-friend' },
        }),
      }),
    )
    const body = (await response.json()) as Awaited<ReturnType<typeof generateCreatorDraft>>
    restoreOpenRouterKey(previousKey)
    restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
    restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)

    expect(response.status).toBe(200)
    expect(body.draft.name.length).toBeGreaterThan(0)
    expect(body.draft.greeting.length).toBeGreaterThan(0)
    expect(['configured', 'placeholder']).toContain(body.image.provider)
  })

  test('coerces accidental object and array values from model JSON', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY
    const result = await generateCreatorDraft(
      {
        brief: 'นักสืบหญิงที่มีความลับ',
      },
      completionWith(
        JSON.stringify({
          name: 'นีรา | NIRA',
          tagline: 'นักสืบที่ไม่ยอมบอกว่ากำลังตามหาใคร',
          description: 'คดีเก่าและความสัมพันธ์ใหม่เดินเข้าหากัน',
          biography: ['นีราเคยทำคดีที่เปลี่ยนชีวิต', 'เธอไม่ไว้ใจใครง่าย ๆ'],
          scenario: 'คุณเจอเธอในสถานีรถไฟร้าง',
          systemPrompt: 'คุณคือนีรา ตอบแบบสุขุมและไม่เขียนแทนผู้เล่น',
          compactPrompt: 'นีรา: นักสืบสุขุม slow-burn',
          characterAnchor: { age: 28, job: 'นักสืบเอกชน', core: 'ระวังตัว แต่จำรายละเอียดของผู้เล่นได้ดี' },
          constraints: ['อย่าเขียนแทนผู้เล่น', 'ค่อย ๆ เปิดเผยคดีเก่า'],
          greeting: 'เธอไม่ควรมาที่นี่คนเดียว',
          tags: ['roleplay', 'thai', 'mystery', 'slow-burn'],
        }),
      ),
    )
    restoreOpenRouterKey(previousKey)
    restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
    restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)

    expect(result.draft.characterAnchor).not.toContain('[object Object]')
    expect(result.draft.characterAnchor).toContain('นักสืบเอกชน')
    expect(result.draft.biography).toContain('คดี')
    expect(result.draft.tags).toContain('slow-burn')
  })

  test('accepts fenced JSON from chat models without falling back', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY

    const result = await generateCreatorDraft(
      {
        brief: 'นักดนตรีกลางคืนที่ไม่ไว้ใจคนง่าย',
      },
      completionWith(`ได้เลย\n\`\`\`json\n${JSON.stringify({
        name: 'ลิน | LIN',
        tagline: 'นักดนตรีที่ยิ้มเหมือนมีความลับ',
        description: 'นักดนตรีกลางคืนที่ค่อยๆ เปิดใจผ่านบทสนทนา',
        biography: 'ลินเล่นดนตรีในบาร์เล็กๆ และจดจำคนฟังได้แม่นกว่าที่ใครคิด',
        scenario: 'คุณเจอเธอหลังเวทีตอนเพลงสุดท้ายจบลง',
        systemPrompt: 'คุณคือลิน ตอบเป็นภาษาไทยและไม่เขียนแทนผู้เล่น',
        compactPrompt: 'ลิน: นักดนตรีกลางคืน slow-burn',
        characterAnchor: 'นิ่ง สุภาพ ช่างสังเกต และไม่เชื่อใจเร็วเกินไป',
        constraints: 'อย่าเขียนแทนผู้เล่น\nค่อยๆ เปิดเผยความลับ',
        greeting: 'เพลงจบแล้ว... แต่เธอยังยืนอยู่ตรงนี้ มีอะไรจะถามฉันหรือเปล่า',
        tags: 'roleplay, thai, music, slow-burn',
      })}\n\`\`\``),
    )

    restoreOpenRouterKey(previousKey)
    restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
    restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)

    expect(result.source).toBe('ai')
    expect(result.draft.name).toBe('ลิน | LIN')
    expect(result.draft.tags).toContain('music')
  })

  test('retries when the text model returns truncated JSON once', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY
    let attempts = 0

    const result = await generateCreatorDraft(
      {
        brief: 'quiet cafe slow burn character',
      },
      async () => {
        attempts += 1
        const content =
          attempts === 1
            ? '{"name":"BROKEN"'
            : JSON.stringify({
                name: 'มิน | MIN',
                tagline: 'บาริสต้าที่จำรายละเอียดของคุณได้เสมอ',
                description: 'ตัวละคร slow-burn ในคาเฟ่เงียบ ๆ ที่ค่อย ๆ เปิดใจผ่านบทสนทนา',
                biography: 'มินเคยทำงานหนักจนลืมดูแลตัวเอง และเริ่มเรียนรู้ที่จะไว้ใจคนอื่นอีกครั้ง',
                scenario: 'คุณเข้ามาในร้านตอนใกล้ปิด และมินยังเก็บโต๊ะสุดท้ายไม่เสร็จ',
                systemPrompt: 'คุณคือมิน ตอบเป็นภาษาไทย อยู่ในบทบาท และไม่เขียนแทนผู้เล่น',
                compactPrompt: 'มิน: บาริสต้า slow-burn ที่จำรายละเอียดเล็ก ๆ ได้',
                characterAnchor: 'นิ่ง อ่อนโยน ช่างสังเกต และค่อย ๆ เปิดใจ',
                constraints: 'อย่าเขียนแทนผู้เล่น\nรักษาจังหวะ slow-burn',
                greeting: 'ร้านใกล้ปิดแล้วนะ... แต่ถ้าเธออยากนั่งต่ออีกหน่อย ฉันก็ไม่ว่าอะไร',
                tags: 'roleplay, thai, cafe, slow-burn',
              })
        return (await completionWith(content)()) as ChatCompletion
      },
    )

    restoreOpenRouterKey(previousKey)
    restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
    restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)

    expect(attempts).toBe(2)
    expect(result.source).toBe('ai')
    expect(result.draft.name).toBe('มิน | MIN')
    expect(result.warnings).toEqual([])
  })

  test('redacts text-model retry classifier input before matching transient hints', async () => {
    const source = readFileSync(new URL('./creator-draft.service.ts', import.meta.url), 'utf8')
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    const leakedProviderKey = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz123456'].join('-')
    const leakedDatabaseUrl = ['postgresql://maprang:', 'retry-secret', '@db.example.com:5432/maprang?sslmode=require'].join('')
    let attempts = 0

    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'retry redaction character',
        },
        async () => {
          attempts += 1
          if (attempts === 1) throw new Error(`fetch failed ${leakedProviderKey} ${leakedDatabaseUrl}`)
          return (await completionWith(
            JSON.stringify({
              name: 'RETRY',
              tagline: 'retry smoke',
              description: 'A retry redaction smoke-test character.',
              biography: 'Created for text-model retry classification tests.',
              scenario: 'A quiet room.',
              systemPrompt: 'You are RETRY. Stay in character.',
              compactPrompt: 'RETRY: smoke test.',
              characterAnchor: 'Calm and observant.',
              constraints: 'Do not write for the player.',
              greeting: 'Hello.',
              tags: 'roleplay, thai, slow-burn',
            }),
          )()) as ChatCompletion
        },
      )

      expect(source).toContain('function creatorDraftRetryMessage')
      expect(source).toContain('return redactSensitiveText(message).text.toLowerCase()')
      expect(source).not.toContain('error.message.toLowerCase() : String(error).toLowerCase()')
      expect(attempts).toBe(2)
      expect(result.source).toBe('ai')
      expect(result.warnings.join('\n')).not.toContain(leakedProviderKey)
      expect(result.warnings.join('\n')).not.toContain(leakedDatabaseUrl)
      expect(result.warnings.join('\n')).not.toContain('retry-secret')
    } finally {
      restoreOpenRouterKey(previousKey)
      restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
      restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)
    }
  })

  test('retries object-shaped text model errors without stringifying raw objects', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    const leakedProviderKey = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz123456'].join('-')
    let attempts = 0

    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'object-shaped retry character',
        },
        async () => {
          attempts += 1
          if (attempts === 1) {
            throw {
              message: `temporarily unavailable ${leakedProviderKey}`,
              toString() {
                throw new Error('raw object should not be stringified')
              },
            }
          }
          return (await completionWith(
            JSON.stringify({
              name: 'OBJ',
              tagline: 'object retry smoke',
              description: 'A retry smoke-test character.',
              biography: 'Created for object-shaped retry classification tests.',
              scenario: 'A quiet room.',
              systemPrompt: 'You are OBJ. Stay in character.',
              compactPrompt: 'OBJ: smoke test.',
              characterAnchor: 'Calm and observant.',
              constraints: 'Do not write for the player.',
              greeting: 'Hello.',
              tags: 'roleplay, thai, slow-burn',
            }),
          )()) as ChatCompletion
        },
      )

      expect(attempts).toBe(2)
      expect(result.source).toBe('ai')
      expect(result.warnings.join('\n')).not.toContain(leakedProviderKey)
    } finally {
      restoreOpenRouterKey(previousKey)
      restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
      restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)
    }
  })

  test('redacts secret-shaped text model failures before returning creator warnings', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    const leakedProviderKey = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz123456'].join('-')
    const leakedDatabaseUrl = ['postgresql://maprang:', 'runtime-secret', '@db.example.com:5432/maprang?sslmode=require'].join('')

    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'ตัวละครทดสอบ error redaction',
        },
        async () => {
          throw new Error(`provider rejected key ${leakedProviderKey} DATABASE_URL=${leakedDatabaseUrl}`)
        },
      )

      const warningText = result.warnings.join('\n')
      expect(result.source).toBe('fallback')
      expect(warningText).toContain('[REDACTED_SECRET]')
      expect(warningText).not.toContain(leakedProviderKey)
      expect(warningText).not.toContain(leakedDatabaseUrl)
      expect(warningText).not.toContain('runtime-secret')
    } finally {
      restoreOpenRouterKey(previousKey)
      restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
      restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)
    }
  })

  test('keeps broken model JSON warnings Thai-first without raw parser text', async () => {
    const previousKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENROUTER_API_KEY = 'test-key'
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'ตัวละครทดสอบ JSON จากโมเดลพัง',
        },
        completionWith('{"name":"BROKEN"'),
      )

      const warningText = result.warnings.join('\n')
      expect(result.source).toBe('fallback')
      expect(warningText).toContain('โมเดลคืน JSON สำหรับดราฟต์ตัวละครไม่ถูกต้องหรือไม่สมบูรณ์')
      expect(warningText).not.toContain('Unexpected')
      expect(warningText).not.toContain('SyntaxError')
    } finally {
      restoreOpenRouterKey(previousKey)
      restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
      restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)
    }
  })

  test('uses GPT Image request shape when image provider is configured', async () => {
    const previousOpenRouterKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousImageModel = process.env.IMAGE_GENERATION_MODEL
    const previousImageQuality = process.env.IMAGE_GENERATION_QUALITY
    const previousImageCompression = process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION
    const previousFetch = globalThis.fetch
    let requestBody: Record<string, unknown> | undefined
    let uploadedPath: string | undefined

    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.IMAGE_GENERATION_API_KEY = 'image-key'
    process.env.IMAGE_GENERATION_MODEL = 'gpt-image-1.5'
    process.env.IMAGE_GENERATION_QUALITY = 'medium'
    process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION = '85'
    globalThis.fetch = (async (input, init) => {
      const url = String(input)
      if (url.includes('/storage/v1/object/')) {
        return new Response('{}', { headers: { 'Content-Type': 'application/json' }, status: 200 })
      }
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(JSON.stringify({ data: [{ b64_json: 'abc123' }] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }) as typeof fetch

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'นักสืบหญิงในเมืองฝนตก',
          imagePrompt: 'cinematic detective portrait in rainy train station',
          origin: 'http://localhost',
        },
        completionWith(
          JSON.stringify({
            name: 'นีรา | NIRA',
            tagline: 'นักสืบที่ยังไม่ไว้ใจคุณ',
            description: 'นักสืบหญิงในเมืองฝนตกที่ตามคดีเก่า',
            biography: 'นีราเคยเสียคนสำคัญไปในคดีที่ปิดไม่ลง',
            scenario: 'คุณพบเธอในสถานีรถไฟร้าง',
            systemPrompt: 'คุณคือนีรา ตอบเป็นภาษาไทยและไม่เขียนแทนผู้เล่น',
            compactPrompt: 'นีรา: นักสืบ slow-burn',
            characterAnchor: 'ระวังตัวและสังเกตละเอียด',
            constraints: 'อย่าเขียนแทนผู้เล่น',
            greeting: 'เธอมาทำอะไรที่นี่',
            tags: 'roleplay, thai, mystery, slow-burn',
          }),
        ),
      )
      const filename = result.image.url.split('/').pop()
      if (filename) uploadedPath = join(uploadRoot, filename)

      expect(result.image.provider).toBe('configured')
      expect(result.image.url).toMatch(/^http:\/\/localhost\/uploads\/avatars\/[a-f0-9-]+\.webp$/)
      expect(requestBody?.model).toBe('gpt-image-1.5')
      expect(requestBody?.quality).toBe('medium')
      expect(requestBody?.output_format).toBe('webp')
      expect(requestBody?.output_compression).toBe(85)
      expect(requestBody?.response_format).toBeUndefined()
    } finally {
      restoreOpenRouterKey(previousOpenRouterKey)
      if (previousImageKey === undefined) delete process.env.IMAGE_GENERATION_API_KEY
      else process.env.IMAGE_GENERATION_API_KEY = previousImageKey
      if (previousImageModel === undefined) delete process.env.IMAGE_GENERATION_MODEL
      else process.env.IMAGE_GENERATION_MODEL = previousImageModel
      if (previousImageQuality === undefined) delete process.env.IMAGE_GENERATION_QUALITY
      else process.env.IMAGE_GENERATION_QUALITY = previousImageQuality
      if (previousImageCompression === undefined) delete process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION
      else process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION = previousImageCompression
      globalThis.fetch = previousFetch
      if (uploadedPath) await rm(uploadedPath, { force: true })
    }
  })

  test('can skip configured image provider for deterministic smoke checks', async () => {
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    const previousFetch = globalThis.fetch
    let fetchCalled = false

    process.env.IMAGE_GENERATION_API_KEY = 'image-key'
    delete process.env.OPENAI_API_KEY
    globalThis.fetch = (async () => {
      fetchCalled = true
      throw new Error('image provider should not be called')
    }) as unknown as typeof fetch

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'local smoke draft',
          imageOnly: true,
          skipImageProvider: true,
          current: {
            name: 'Smoke Draft',
            tags: 'roleplay, thai',
          },
        },
        completionWith('{}'),
      )

      expect(fetchCalled).toBe(false)
      expect(result.image.provider).toBe('placeholder')
      expect(result.image.note).toContain('smoke/dev')
      expect(result.image.note).toContain('ภาพร่างระบบ')
      expect(result.warnings.some((warning) => warning.includes('image provider'))).toBe(false)
    } finally {
      restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
      restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)
      globalThis.fetch = previousFetch
    }
  })

  test('reports configured image provider failure separately from missing provider', async () => {
    const previousOpenRouterKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousFetch = globalThis.fetch

    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.IMAGE_GENERATION_API_KEY = 'image-key'
    globalThis.fetch = (async (_url, _init) =>
      new Response(JSON.stringify({ error: { message: 'bad image model' } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })) as typeof fetch

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'นักเวทหญิงในเมืองกลางคืน',
          imagePrompt: 'moonlit mage portrait',
        },
        completionWith(
          JSON.stringify({
            name: 'เซลีน | SELENE',
            tagline: 'นักเวทที่ไม่ยอมบอกว่ากำลังปกป้องอะไร',
            description: 'นักเวทหญิงในเมืองกลางคืน',
            biography: 'เซลีนเก็บความลับไว้กับแสงจันทร์',
            scenario: 'คุณพบเธอบนสะพานหลังเที่ยงคืน',
            systemPrompt: 'คุณคือเซลีน ตอบเป็นภาษาไทยและไม่เขียนแทนผู้เล่น',
            compactPrompt: 'เซลีน: นักเวท slow-burn',
            characterAnchor: 'สุขุมและระวังตัว',
            constraints: 'อย่าเขียนแทนผู้เล่น',
            greeting: 'เธอเห็นแสงนั่นเหมือนกันใช่ไหม',
            tags: 'roleplay, thai, fantasy, slow-burn',
          }),
        ),
      )

      expect(result.image.provider).toBe('placeholder')
      expect(result.image.note).toContain('เชื่อมระบบสร้างรูปจริงแล้ว')
      expect(result.image.note).toContain('ภาพร่างระบบ')
      expect(result.warnings.some((warning) => warning.includes('ระบบสร้างรูปจริง') && warning.includes('400'))).toBe(true)
    } finally {
      restoreOpenRouterKey(previousOpenRouterKey)
      if (previousImageKey === undefined) delete process.env.IMAGE_GENERATION_API_KEY
      else process.env.IMAGE_GENERATION_API_KEY = previousImageKey
      globalThis.fetch = previousFetch
    }
  })

  test('keeps malformed image provider JSON warnings Thai-first', async () => {
    const previousOpenRouterKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    const previousFetch = globalThis.fetch

    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.IMAGE_GENERATION_API_KEY = 'image-key'
    delete process.env.OPENAI_API_KEY
    globalThis.fetch = (async () =>
      new Response('not-json', {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })) as unknown as typeof fetch

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'ตัวละครทดสอบ image JSON พัง',
          imagePrompt: 'cinematic portrait',
        },
        completionWith(
          JSON.stringify({
            name: 'มาย | MAI',
            tagline: 'คนที่อ่านบรรยากาศเก่งกว่าคำพูด',
            description: 'ตัวละครทดสอบ image provider malformed JSON',
            biography: 'มายเคยทำงานกับภาพถ่ายและจำรายละเอียดเล็ก ๆ ได้เสมอ',
            scenario: 'คุณพบเธอในสตูดิโอหลังไฟดับ',
            systemPrompt: 'คุณคือมาย ตอบเป็นภาษาไทยและไม่เขียนแทนผู้เล่น',
            compactPrompt: 'มาย: observant slow-burn',
            characterAnchor: 'ช่างสังเกต สุขุม และไม่รีบไว้ใจ',
            constraints: 'อย่าเขียนแทนผู้เล่น',
            greeting: 'ไฟดับแบบนี้ เธอยังอยากคุยต่อไหม',
            tags: 'roleplay, thai, slow-burn',
          }),
        ),
      )

      const returnedText = `${result.image.note}\n${result.warnings.join('\n')}`
      expect(result.image.provider).toBe('placeholder')
      expect(returnedText).toContain('ระบบสร้างรูปจริงตอบกลับ JSON ไม่ถูกต้อง')
      expect(returnedText).not.toContain('Unexpected')
      expect(returnedText).not.toContain('SyntaxError')
    } finally {
      restoreOpenRouterKey(previousOpenRouterKey)
      restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
      restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)
      globalThis.fetch = previousFetch
    }
  })

  test('redacts secret-shaped image provider failures before returning notes', async () => {
    const previousOpenRouterKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousOpenAiKey = process.env.OPENAI_API_KEY
    const previousFetch = globalThis.fetch
    const leakedImageKey = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz123456'].join('-')

    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.IMAGE_GENERATION_API_KEY = 'image-key'
    delete process.env.OPENAI_API_KEY
    globalThis.fetch = (async (_url, _init) =>
      new Response(JSON.stringify({ error: { message: `bad image key ${leakedImageKey}` } }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      })) as typeof fetch

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'ตัวละครทดสอบ image provider redaction',
          imagePrompt: 'cinematic portrait',
        },
        completionWith(
          JSON.stringify({
            name: 'เรย์ | RAY',
            tagline: 'คนที่จำอดีตได้ชัดเกินไป',
            description: 'ตัวละครทดสอบ image provider redaction',
            biography: 'เรย์เก็บเรื่องเก่าไว้ในภาพถ่าย',
            scenario: 'คุณพบเขาในห้องล้างรูป',
            systemPrompt: 'คุณคือเรย์ ตอบเป็นภาษาไทยและไม่เขียนแทนผู้เล่น',
            compactPrompt: 'เรย์: memory slow-burn',
            characterAnchor: 'ช่างสังเกตและระวังคำพูด',
            constraints: 'อย่าเขียนแทนผู้เล่น',
            greeting: 'รูปใบนี้... เธอจำได้ไหม',
            tags: 'roleplay, thai, slow-burn',
          }),
        ),
      )

      const returnedText = `${result.image.note}\n${result.warnings.join('\n')}`
      expect(result.image.provider).toBe('placeholder')
      expect(returnedText).toContain('[REDACTED_SECRET]')
      expect(returnedText).not.toContain(leakedImageKey)
    } finally {
      restoreOpenRouterKey(previousOpenRouterKey)
      restoreEnvValue('IMAGE_GENERATION_API_KEY', previousImageKey)
      restoreEnvValue('OPENAI_API_KEY', previousOpenAiKey)
      globalThis.fetch = previousFetch
    }
  })

  test('reports image provider billing limits with an actionable message', async () => {
    const previousOpenRouterKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousFetch = globalThis.fetch

    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.IMAGE_GENERATION_API_KEY = 'image-key'
    globalThis.fetch = (async (_url, _init) =>
      new Response(
        JSON.stringify({
          error: {
            message: 'Billing hard limit has been reached.',
            code: 'billing_hard_limit_reached',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        },
      )) as typeof fetch

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'billing limit smoke character',
          imagePrompt: 'cinematic portrait',
        },
        completionWith(
          JSON.stringify({
            name: 'MIRA',
            tagline: 'billing smoke',
            description: 'A smoke-test character.',
            biography: 'Created for provider failure tests.',
            scenario: 'A quiet studio.',
            systemPrompt: 'You are MIRA. Stay in character.',
            compactPrompt: 'MIRA: smoke test.',
            characterAnchor: 'Calm and observant.',
            constraints: 'Do not write for the player.',
            greeting: 'Hello.',
            tags: 'roleplay, thai, slow-burn',
          }),
        ),
      )

      expect(result.image.provider).toBe('placeholder')
      expect(result.image.note).toContain('ระบบสร้างรูปจริงติดเพดานวงเงิน')
      expect(result.warnings.some((warning) => warning.includes('ระบบสร้างรูปจริงติดเพดานวงเงิน'))).toBe(true)
      expect(result.warnings.some((warning) => warning.includes('smoke:image:live'))).toBe(true)
    } finally {
      restoreOpenRouterKey(previousOpenRouterKey)
      if (previousImageKey === undefined) delete process.env.IMAGE_GENERATION_API_KEY
      else process.env.IMAGE_GENERATION_API_KEY = previousImageKey
      globalThis.fetch = previousFetch
    }
  })

  test('keeps non-Error provider failure reasons Thai-first', async () => {
    const previousOpenRouterKey = process.env.OPENROUTER_API_KEY
    const previousImageKey = process.env.IMAGE_GENERATION_API_KEY
    const previousFetch = globalThis.fetch

    process.env.OPENROUTER_API_KEY = 'test-key'
    process.env.IMAGE_GENERATION_API_KEY = 'image-key'
    globalThis.fetch = (async () => {
      throw 'raw provider failure'
    }) as unknown as typeof fetch

    try {
      const result = await generateCreatorDraft(
        {
          brief: 'ตัวละครทดสอบ provider raw failure',
          imagePrompt: 'cinematic portrait',
        },
        completionWith(
          JSON.stringify({
            name: 'ริน | RIN',
            tagline: 'คนที่เก็บความจริงไว้ใต้รอยยิ้ม',
            description: 'ตัวละครทดสอบ provider raw failure',
            biography: 'รินเคยเสียบางอย่างไปและยังไม่พร้อมเล่า',
            scenario: 'คุณพบเธอในสถานีรถไฟตอนฝนตก',
            systemPrompt: 'คุณคือริน ตอบเป็นภาษาไทยและไม่เขียนแทนผู้เล่น',
            compactPrompt: 'ริน: slow-burn mystery',
            characterAnchor: 'นิ่งแต่ใส่ใจ',
            constraints: 'อย่าเขียนแทนผู้เล่น',
            greeting: 'ฝนตกหนักนะ เธอจะไปทางเดียวกันไหม',
            tags: 'roleplay, thai, slow-burn',
          }),
        ),
      )

      expect(result.image.provider).toBe('placeholder')
      expect(result.image.note).toContain('ไม่ทราบสาเหตุ')
      expect(result.warnings.some((warning) => warning.includes('unknown error'))).toBe(false)
    } finally {
      restoreOpenRouterKey(previousOpenRouterKey)
      if (previousImageKey === undefined) delete process.env.IMAGE_GENERATION_API_KEY
      else process.env.IMAGE_GENERATION_API_KEY = previousImageKey
      globalThis.fetch = previousFetch
    }
  })
})
