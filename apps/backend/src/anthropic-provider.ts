// Adapter for the Anthropic Messages API (POST /v1/messages).
// Used when CHAT_API_FORMAT=anthropic, e.g. MaxPlus AI "AWS Lite" Claude pools that do
// not serve the OpenAI Chat Completions API. Translates the internal OpenAI-style message
// list into Anthropic's { system, messages } shape and normalizes responses/usage back.
import { redactSensitiveText } from './redaction'

function safeDiagnostic(value: string, maxLength = 500): string {
  return redactSensitiveText(value).text.slice(0, maxLength)
}

export type AnthropicRole = 'system' | 'user' | 'assistant'
export type AnthropicInputMessage = { role: AnthropicRole; content: string }

export type AnthropicUsageTokens = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type AnthropicCompletionResult = {
  content: string
  usage: AnthropicUsageTokens
}

export type AnthropicStreamChunk = {
  delta: string
  usage: AnthropicUsageTokens | null
}

export type AnthropicRequest = {
  model: string
  messages: AnthropicInputMessage[]
  maxTokens: number
  temperature: number
}

type AnthropicWireMessage = { role: 'user' | 'assistant'; content: string }

// Anthropic requires the system prompt as a top-level field and the remaining messages to
// alternate user/assistant starting with user. We concatenate all system messages, drop
// empty turns, and merge consecutive same-role turns so the wire payload always alternates.
export function buildAnthropicPayload(request: AnthropicRequest): {
  system: string
  messages: AnthropicWireMessage[]
} {
  const systemParts: string[] = []
  const conversation: AnthropicWireMessage[] = []

  for (const message of request.messages) {
    const content = message.content?.trim()
    if (!content) continue
    if (message.role === 'system') {
      systemParts.push(content)
      continue
    }
    const role: 'user' | 'assistant' = message.role === 'assistant' ? 'assistant' : 'user'
    const previous = conversation[conversation.length - 1]
    if (previous && previous.role === role) {
      previous.content = `${previous.content}\n\n${content}`
      continue
    }
    conversation.push({ role, content })
  }

  return { system: systemParts.join('\n\n'), messages: conversation }
}

// Anthropic clamps temperature to [0, 1]; the OpenAI scale allows up to 2.
export function clampAnthropicTemperature(temperature: number): number {
  if (!Number.isFinite(temperature)) return 1
  return Math.min(Math.max(temperature, 0), 1)
}

function anthropicHeaders(apiKey: string, anthropicVersion: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': anthropicVersion,
  }
}

function buildRequestBody(request: AnthropicRequest, stream: boolean): string {
  const { system, messages } = buildAnthropicPayload(request)
  return JSON.stringify({
    model: request.model,
    max_tokens: request.maxTokens,
    temperature: clampAnthropicTemperature(request.temperature),
    ...(system ? { system } : {}),
    messages,
    ...(stream ? { stream: true } : {}),
  })
}

function messagesUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/messages`
}

type AnthropicUsagePayload = {
  input_tokens?: number
  output_tokens?: number
}

export function usageFromAnthropic(usage: AnthropicUsagePayload | undefined): AnthropicUsageTokens {
  const promptTokens = usage?.input_tokens ?? 0
  const completionTokens = usage?.output_tokens ?? 0
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }
}

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>
  usage?: AnthropicUsagePayload
  error?: { type?: string; message?: string }
}

export function extractAnthropicText(response: AnthropicMessageResponse): string {
  return (response.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text ?? '')
    .join('')
}

// Allowlisted raw-JSON reader (see backend-security-audit allowedRawResponseJsonReaders):
// wraps a JSON parse failure in a Thai diagnostic so callers never parse the raw body directly.
async function readAnthropicMessagePayload(response: Response): Promise<AnthropicMessageResponse> {
  try {
    return (await response.json()) as AnthropicMessageResponse
  } catch {
    throw new Error('Anthropic Messages API คืนค่าที่ไม่ใช่ JSON')
  }
}

export async function createAnthropicCompletion(
  request: AnthropicRequest,
  apiKey: string,
  baseUrl: string,
  anthropicVersion: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AnthropicCompletionResult> {
  const response = await fetchImpl(messagesUrl(baseUrl), {
    method: 'POST',
    headers: anthropicHeaders(apiKey, anthropicVersion),
    body: buildRequestBody(request, false),
  })

  if (!response.ok) {
    const detail = redactSensitiveText(await response.text()).text.slice(0, 500)
    throw new Error(`Anthropic Messages API ตอบกลับสถานะ ${response.status}: ${detail}`)
  }

  const parsed = await readAnthropicMessagePayload(response)

  if (parsed.error) {
    const detail = safeDiagnostic(parsed.error.message ?? '', 300)
    throw new Error(`Anthropic Messages API error ${parsed.error.type ?? ''}: ${detail}`)
  }

  return { content: extractAnthropicText(parsed), usage: usageFromAnthropic(parsed.usage) }
}

type AnthropicStreamEvent = {
  type?: string
  delta?: { type?: string; text?: string }
  message?: { usage?: AnthropicUsagePayload }
  usage?: AnthropicUsagePayload
}

// Parse one Anthropic SSE `data:` payload into a normalized chunk.
// message_start carries input tokens; content_block_delta carries text; message_delta carries
// the final output token count. Returns null for events with nothing useful (ping, *_stop, etc.).
export function parseAnthropicStreamData(
  data: string,
  tokenState: { promptTokens: number; completionTokens: number },
): AnthropicStreamChunk | null {
  const trimmed = data.trim()
  if (!trimmed || trimmed === '[DONE]') return null

  let event: AnthropicStreamEvent
  try {
    event = JSON.parse(trimmed) as AnthropicStreamEvent
  } catch {
    return null
  }

  if (event.type === 'message_start' && event.message?.usage) {
    const usage = usageFromAnthropic(event.message.usage)
    tokenState.promptTokens = usage.promptTokens
    if (usage.completionTokens) tokenState.completionTokens = usage.completionTokens
    return null
  }

  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
    return { delta: event.delta.text, usage: null }
  }

  if (event.type === 'message_delta' && event.usage) {
    const usage = usageFromAnthropic(event.usage)
    if (usage.completionTokens) tokenState.completionTokens = usage.completionTokens
    return {
      delta: '',
      usage: {
        promptTokens: tokenState.promptTokens,
        completionTokens: tokenState.completionTokens,
        totalTokens: tokenState.promptTokens + tokenState.completionTokens,
      },
    }
  }

  return null
}

// Split a raw SSE buffer into the `data:` payloads of each event block.
export function extractAnthropicSseDataLines(buffer: string): string[] {
  const dataLines: string[] = []
  for (const block of buffer.split(/\n\n/)) {
    const lines = block.split(/\n/)
    const dataParts = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim())
    if (dataParts.length > 0) dataLines.push(dataParts.join('\n'))
  }
  return dataLines
}

export async function* createAnthropicCompletionStream(
  request: AnthropicRequest,
  apiKey: string,
  baseUrl: string,
  anthropicVersion: string,
  fetchImpl: typeof fetch = fetch,
): AsyncGenerator<AnthropicStreamChunk> {
  const response = await fetchImpl(messagesUrl(baseUrl), {
    method: 'POST',
    headers: anthropicHeaders(apiKey, anthropicVersion),
    body: buildRequestBody(request, true),
  })

  if (!response.ok) {
    const detail = redactSensitiveText(await response.text()).text.slice(0, 500)
    throw new Error(`Anthropic Messages API (stream) ตอบกลับสถานะ ${response.status}: ${detail}`)
  }
  if (!response.body) {
    throw new Error('Anthropic Messages API (stream) ไม่คืน response body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const tokenState = { promptTokens: 0, completionTokens: 0 }
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lastSeparator = buffer.lastIndexOf('\n\n')
    if (lastSeparator === -1) continue
    const ready = buffer.slice(0, lastSeparator)
    buffer = buffer.slice(lastSeparator + 2)

    for (const data of extractAnthropicSseDataLines(ready)) {
      const chunk = parseAnthropicStreamData(data, tokenState)
      if (chunk) yield chunk
    }
  }

  for (const data of extractAnthropicSseDataLines(buffer)) {
    const chunk = parseAnthropicStreamData(data, tokenState)
    if (chunk) yield chunk
  }
}
