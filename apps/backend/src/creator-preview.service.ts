import { MessageRole } from '@prisma/client'
import OpenAI from 'openai'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import { modelName, modelMaxOutputTokens, modelTemperature, chatProviderRetryAttempts, chatProviderRetryDelayMs } from './config'
import { buildContextPrompt, loadRelevantLore, promptControlPolicy, type LoreForContext } from './context.service'
import { estimatePromptTokens } from './prompt-inspector.service'
import { redactSensitiveText } from './redaction'

const openRouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'missing-openrouter-key',
})

export type PreviewChatInput = {
  // Character draft data
  name: string
  description?: string
  biography?: string
  scenario?: string
  systemPrompt: string
  compactPrompt?: string
  characterAnchor?: string
  constraints?: string
  greeting?: string

  // Test message
  userMessage: string

  // Optional context
  userPersona?: string
  relationshipSeed?: string
  loreEntries?: LoreForContext[]

  // Preview options
  skipProvider?: boolean
}

export type PreviewChatResult = {
  reply: string
  source: 'ai' | 'mock'
  modelName: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  prompt: {
    system: string
    user: string
    estimatedTokens: number
  }
  warnings: string[]
  timestamp: string
}

/**
 * ทดสอบตัวละครด้วยข้อความ preview โดยไม่ต้องสร้าง chat จริง
 */
export async function previewCharacterChat(input: PreviewChatInput): Promise<PreviewChatResult> {
  const warnings: string[] = []
  const timestamp = new Date().toISOString()

  // Validate inputs
  if (!input.name?.trim()) {
    warnings.push('ชื่อตัวละครว่างเปล่า')
  }
  if (!input.systemPrompt?.trim()) {
    warnings.push('System prompt ว่างเปล่า')
  }
  if (!input.userMessage?.trim()) {
    warnings.push('ข้อความทดสอบว่างเปล่า')
  }

  // Build character context
  const character = {
    name: input.name || 'ตัวละครทดสอบ',
    tagline: null,
    description: input.description || null,
    biography: input.biography || null,
    scenario: input.scenario || null,
    systemPrompt: input.systemPrompt || promptControlPolicy,
    compactPrompt: input.compactPrompt || null,
    characterAnchor: input.characterAnchor || null,
    constraints: input.constraints || null,
  }

  const loreEntries = input.loreEntries || []
  const contextPrompt = buildContextPrompt(character, loreEntries)

  // Build relationship context if provided
  let relationshipContext = ''
  if (input.relationshipSeed) {
    relationshipContext = `\n\nความสัมพันธ์: ${input.relationshipSeed}`
  }

  // Build user persona context
  const personaContext = input.userPersona?.trim()
    ? `\n\nบุคลิกของผู้ใช้:\n${input.userPersona.trim()}`
    : ''

  // Assemble system prompt
  const systemPrompt = [
    contextPrompt,
    relationshipContext,
    personaContext,
  ].filter(Boolean).join('\n\n')

  // Assemble user message
  const userPrompt = input.userMessage.trim()

  // Estimate tokens
  const estimatedTokens = estimatePromptTokens(systemPrompt + '\n\n' + userPrompt)

  // Local preview reply if provider is skipped
  if (input.skipProvider || !process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'missing-openrouter-key') {
    const mockReply = generateLocalPreviewReply(input.name, input.userMessage)
    return {
      reply: mockReply,
      source: 'mock',
      modelName: 'local/preview-mock',
      usage: {
        promptTokens: estimatedTokens,
        completionTokens: mockReply.length,
        totalTokens: estimatedTokens + mockReply.length,
      },
      prompt: {
        system: redactSensitiveText(systemPrompt).text,
        user: userPrompt,
        estimatedTokens,
      },
      warnings: [...warnings, 'ใช้คำตอบพรีวิวในเครื่อง เพราะยังไม่ได้ตั้งค่า API key สำหรับผู้ให้บริการแชท'],
      timestamp,
    }
  }

  // Call AI provider
  try {
    const completion = await callProviderWithRetry([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    const reply = completion.choices[0]?.message?.content || ''
    const usage = completion.usage

    if (!reply.trim()) {
      warnings.push('AI ตอบกลับเป็นข้อความว่าง')
    }

    return {
      reply,
      source: 'ai',
      modelName: completion.model || modelName,
      usage: {
        promptTokens: usage?.prompt_tokens || estimatedTokens,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || estimatedTokens,
      },
      prompt: {
        system: redactSensitiveText(systemPrompt).text,
        user: userPrompt,
        estimatedTokens,
      },
      warnings,
      timestamp,
    }
  } catch (error) {
    warnings.push(providerFailureWarning(error))

    const mockReply = generateLocalPreviewReply(input.name, input.userMessage)
    return {
      reply: mockReply,
      source: 'mock',
      modelName: 'local/preview-fallback',
      usage: {
        promptTokens: estimatedTokens,
        completionTokens: mockReply.length,
        totalTokens: estimatedTokens + mockReply.length,
      },
      prompt: {
        system: redactSensitiveText(systemPrompt).text,
        user: userPrompt,
        estimatedTokens,
      },
      warnings,
      timestamp,
    }
  }
}

async function callProviderWithRetry(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
): Promise<ChatCompletion> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < chatProviderRetryAttempts; attempt++) {
    try {
      const completion = await openRouter.chat.completions.create({
        model: modelName,
        messages,
        temperature: modelTemperature,
        max_tokens: modelMaxOutputTokens,
      })
      return completion
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < chatProviderRetryAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, chatProviderRetryDelayMs))
      }
    }
  }

  throw lastError || new Error('Provider call failed')
}

function generateLocalPreviewReply(characterName: string, userMessage: string): string {
  const greetings = [
    `สวัสดีค่ะ! ฉันคือ ${characterName} ยินดีที่ได้รู้จักนะคะ`,
    `ว้าว เรื่องที่คุณเล่ามาน่าสนใจมากเลยนะ`,
    `ขอบคุณที่คุยกับฉันนะคะ ฉันรู้สึกดีใจมาก ๆ`,
    `อืม... นี่มันน่าสนใจจังเลย คุณคิดยังไงกับเรื่องนี้คะ?`,
  ]

  const messageLength = userMessage.length
  const selectedGreeting = greetings[messageLength % greetings.length]

  return `${selectedGreeting}\n\n[คำตอบพรีวิวในเครื่องสำหรับลองบทก่อนเผยแพร่]\n\nเมื่อเชื่อมต่อผู้ให้บริการแชทจริง ระบบจะตอบตามบุคลิก สถานการณ์ และพรอมป์ที่คุณกำหนดไว้ละเอียดขึ้นค่ะ\n\nข้อความของคุณ: "${userMessage}"`
}

export function providerFailureWarning(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || 'provider unavailable')
  const safe = redactSensitiveText(raw).text.trim()
  return `เรียกผู้ให้บริการแชทไม่สำเร็จ จึงใช้คำตอบพรีวิวในเครื่องแทน${safe ? ` (${safe.slice(0, 160)})` : ''}`
}

/**
 * ทดสอบหลายสถานการณ์พร้อมกัน
 */
export async function previewCharacterScenarios(
  characterData: Omit<PreviewChatInput, 'userMessage'>,
  scenarios: Array<{ label: string; message: string; persona?: string }>,
): Promise<Array<{ label: string; result: PreviewChatResult }>> {
  const results = await Promise.all(
    scenarios.map(async (scenario) => ({
      label: scenario.label,
      result: await previewCharacterChat({
        ...characterData,
        userMessage: scenario.message,
        userPersona: scenario.persona || characterData.userPersona,
      }),
    })),
  )

  return results
}
