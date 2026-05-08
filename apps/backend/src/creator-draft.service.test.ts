import { describe, expect, test } from 'bun:test'
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
    expect(result.image.note).toContain('ยังไม่ได้ตั้งค่า image provider')
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
    globalThis.fetch = (async (_url, init) => {
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
      expect(result.image.note).toContain('ตั้งค่า image provider แล้ว')
      expect(result.warnings.some((warning) => warning.includes('image provider') && warning.includes('400'))).toBe(true)
    } finally {
      restoreOpenRouterKey(previousOpenRouterKey)
      if (previousImageKey === undefined) delete process.env.IMAGE_GENERATION_API_KEY
      else process.env.IMAGE_GENERATION_API_KEY = previousImageKey
      globalThis.fetch = previousFetch
    }
  })
})
