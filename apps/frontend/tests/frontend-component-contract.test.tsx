import { describe, expect, test } from 'bun:test'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { CharacterCard } from '../src/components/character/CharacterCard'
import { Composer } from '../src/components/Composer'
import { CreatorReadinessPanel } from '../src/components/CreatorReadinessPanel'
import { MessageBubble } from '../src/components/MessageBubble'
import { RelationshipPresetPicker } from '../src/components/RelationshipPresetPicker'
import { ReportDialog } from '../src/components/ReportDialog'
import type { Character, ChatMessage } from '../src/lib/api'
import type { TagAnalysis } from '../src/lib/tagAnalysis'

function render(element: ReactElement) {
  return renderToStaticMarkup(element)
}

const character: Character = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mika',
  avatarUrl: null,
  tagline: 'slow burn relationship',
  description: 'A character with relationship-ready tags.',
  greeting: 'Hello',
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  tags: ['slow-burn', 'mentor', 'green-flag'],
  chatCount: 1280,
  favoriteCount: 7,
  viewCount: 4500,
  contentRating: 'general',
}

const assistantMessage: ChatMessage = {
  id: 'msg-assistant',
  chatId: 'chat-1',
  role: 'assistant',
  content: '**Mika** answers with a useful roleplay beat.',
  createdAt: '2026-06-11T00:00:00.000Z',
}

const readyAnalysis: TagAnalysis = {
  discovery: ['thai', 'roleplay'],
  engine: ['slow-burn', 'mentor'],
  safety: ['green-flag'],
  unknown: [],
  issues: [],
}

describe('frontend component contracts', () => {
  test('chat composer exposes input, tool, and submit states', () => {
    const html = render(
      createElement(Composer, {
        disabled: false,
        message: 'hello',
        onMessageChange: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(html).toContain('data-testid="chat-composer-input"')
    expect(html).toContain('data-testid="chat-composer-tools"')
    expect(html).toContain('data-testid="chat-composer-submit"')
    expect(html).toContain('type="submit"')
  })

  test('chat composer keeps a disabled reason when send cannot run', () => {
    const html = render(
      createElement(Composer, {
        canSubmit: false,
        disabled: false,
        message: 'hello',
        onMessageChange: () => undefined,
        onSubmit: () => undefined,
        sendDisabledReason: 'token balance is too low',
      }),
    )

    expect(html).toContain('data-testid="chat-composer-submit"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('token balance is too low')
  })

  test('message bubble renders assistant markdown and report affordance', () => {
    const html = render(
      createElement(MessageBubble, {
        assistantName: 'Mika',
        chat: assistantMessage,
        onReport: () => undefined,
      }),
    )

    expect(html).toContain('<strong>Mika</strong>')
    expect(html).toContain('data-testid="message-report-msg-assistant"')
  })

  test('character card renders identity, stats, favorite control, and lobby navigation context', () => {
    const html = render(
      createElement(
        MemoryRouter,
        null,
        createElement(CharacterCard, {
          character,
          showStats: true,
        }),
      ),
    )

    expect(html).toContain('Mika')
    expect(html).toContain('slow burn relationship')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('1.3K')
  })

  test('relationship preset picker starts with a safe loading-disabled state', () => {
    const html = render(
      createElement(RelationshipPresetPicker, {
        tags: 'thai, roleplay',
        onApply: () => undefined,
      }),
    )

    expect(html).toContain('data-testid="relationship-preset-picker-select"')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-disabled="true"')
  })

  test('report dialog renders target preview and submit/cancel controls only when open', () => {
    const closed = render(
      createElement(ReportDialog, {
        isOpen: false,
        target: null,
        onClose: () => undefined,
        onSubmit: () => undefined,
      }),
    )
    const open = render(
      createElement(ReportDialog, {
        isOpen: true,
        target: {
          targetType: 'CHARACTER',
          title: 'Mika',
          preview: 'Preview text for moderation review.',
        },
        onClose: () => undefined,
        onSubmit: () => undefined,
      }),
    )

    expect(closed).toBe('')
    expect(open).toContain('data-testid="report-dialog"')
    expect(open).toContain('data-testid="report-cancel"')
    expect(open).toContain('data-testid="report-submit"')
    expect(open).toContain('Preview text for moderation review.')
  })

  test('creator readiness panel exposes score and tag group counts', () => {
    const html = render(createElement(CreatorReadinessPanel, { analysis: readyAnalysis }))

    expect(html).toContain('92%')
    expect(html).toContain('2')
    expect(html).toContain('1')
  })
})
