import { describe, expect, test } from 'bun:test'
import {
  buildAnthropicPayload,
  clampAnthropicTemperature,
  extractAnthropicSseDataLines,
  extractAnthropicText,
  parseAnthropicStreamData,
  usageFromAnthropic,
} from './anthropic-provider'

describe('buildAnthropicPayload', () => {
  test('hoists system messages into the system field', () => {
    const { system, messages } = buildAnthropicPayload({
      model: 'aws-lite/claude-sonnet-4-6',
      maxTokens: 100,
      temperature: 0.8,
      messages: [
        { role: 'system', content: 'คุณคือมิกะ' },
        { role: 'system', content: 'ตอบเป็นภาษาไทย' },
        { role: 'user', content: 'สวัสดี' },
      ],
    })
    expect(system).toBe('คุณคือมิกะ\n\nตอบเป็นภาษาไทย')
    expect(messages).toEqual([{ role: 'user', content: 'สวัสดี' }])
  })

  test('merges consecutive same-role turns so the wire payload alternates', () => {
    const { messages } = buildAnthropicPayload({
      model: 'm',
      maxTokens: 10,
      temperature: 0,
      messages: [
        { role: 'user', content: 'a' },
        { role: 'user', content: 'b' },
        { role: 'assistant', content: 'c' },
        { role: 'user', content: 'd' },
      ],
    })
    expect(messages).toEqual([
      { role: 'user', content: 'a\n\nb' },
      { role: 'assistant', content: 'c' },
      { role: 'user', content: 'd' },
    ])
  })

  test('drops empty or whitespace-only messages', () => {
    const { system, messages } = buildAnthropicPayload({
      model: 'm',
      maxTokens: 10,
      temperature: 0,
      messages: [
        { role: 'system', content: '   ' },
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: '' },
      ],
    })
    expect(system).toBe('')
    expect(messages).toEqual([{ role: 'user', content: 'hi' }])
  })
})

describe('clampAnthropicTemperature', () => {
  test('clamps to the [0, 1] range Anthropic accepts', () => {
    expect(clampAnthropicTemperature(1.9)).toBe(1)
    expect(clampAnthropicTemperature(-0.5)).toBe(0)
    expect(clampAnthropicTemperature(0.7)).toBe(0.7)
    expect(clampAnthropicTemperature(Number.NaN)).toBe(1)
  })
})

describe('usageFromAnthropic', () => {
  test('maps input/output tokens onto the internal usage shape', () => {
    expect(usageFromAnthropic({ input_tokens: 120, output_tokens: 30 })).toEqual({
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
    })
    expect(usageFromAnthropic(undefined)).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 })
  })
})

describe('extractAnthropicText', () => {
  test('joins text content blocks and ignores non-text blocks', () => {
    expect(
      extractAnthropicText({
        content: [
          { type: 'text', text: 'สวัสดี' },
          { type: 'thinking', text: 'ignored' },
          { type: 'text', text: 'ครับ' },
        ],
      }),
    ).toBe('สวัสดีครับ')
    expect(extractAnthropicText({})).toBe('')
  })
})

describe('extractAnthropicSseDataLines', () => {
  test('splits SSE blocks into their data payloads', () => {
    const buffer = 'event: ping\ndata: {"type":"ping"}\n\nevent: delta\ndata: {"type":"content_block_delta"}\n\n'
    expect(extractAnthropicSseDataLines(buffer)).toEqual(['{"type":"ping"}', '{"type":"content_block_delta"}'])
  })
})

describe('parseAnthropicStreamData', () => {
  test('captures prompt tokens from message_start without emitting a chunk', () => {
    const state = { promptTokens: 0, completionTokens: 0 }
    const result = parseAnthropicStreamData(
      JSON.stringify({ type: 'message_start', message: { usage: { input_tokens: 1600, output_tokens: 1 } } }),
      state,
    )
    expect(result).toBeNull()
    expect(state.promptTokens).toBe(1600)
  })

  test('emits text deltas', () => {
    const state = { promptTokens: 0, completionTokens: 0 }
    const result = parseAnthropicStreamData(
      JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'สวัสดี' } }),
      state,
    )
    expect(result).toEqual({ delta: 'สวัสดี', usage: null })
  })

  test('emits final usage from message_delta combining prompt and completion tokens', () => {
    const state = { promptTokens: 1600, completionTokens: 0 }
    const result = parseAnthropicStreamData(
      JSON.stringify({ type: 'message_delta', usage: { output_tokens: 240 } }),
      state,
    )
    expect(result).toEqual({ delta: '', usage: { promptTokens: 1600, completionTokens: 240, totalTokens: 1840 } })
  })

  test('ignores ping, content_block_stop, and malformed JSON', () => {
    const state = { promptTokens: 0, completionTokens: 0 }
    expect(parseAnthropicStreamData(JSON.stringify({ type: 'ping' }), state)).toBeNull()
    expect(parseAnthropicStreamData(JSON.stringify({ type: 'content_block_stop' }), state)).toBeNull()
    expect(parseAnthropicStreamData('not json', state)).toBeNull()
    expect(parseAnthropicStreamData('[DONE]', state)).toBeNull()
  })
})
