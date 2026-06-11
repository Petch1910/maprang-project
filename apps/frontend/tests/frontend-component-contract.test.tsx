import { describe, expect, test } from 'bun:test'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { CharacterCard } from '../src/components/character/CharacterCard'
import { CharacterCreateForm } from '../src/components/CharacterCreateForm'
import { Composer } from '../src/components/Composer'
import { CreatorReadinessPanel } from '../src/components/CreatorReadinessPanel'
import { MessageBubble } from '../src/components/MessageBubble'
import { RelationshipPresetPicker } from '../src/components/RelationshipPresetPicker'
import { ReportDialog } from '../src/components/ReportDialog'
import { SystemStatus } from '../src/components/SystemStatus'
import type { Character, ChatMessage, HealthStatus } from '../src/lib/api'
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

const localHealthStatus: HealthStatus = {
  ok: true,
  service: 'maprang-backend',
  checks: {
    databaseConfigured: true,
    databaseConnected: true,
    openRouterConfigured: false,
    imageGenerationConfigured: false,
    adminAuthConfigured: true,
    supabaseAuthConfigured: false,
  },
  security: {
    corsOrigins: ['http://127.0.0.1:5173'],
    authMode: 'local-dev-header',
    adminGuard: 'api-key',
    avatarStorage: 'local',
    avatarStorageAccess: 'local',
    signedUrlExpiresIn: null,
  },
  knowledge: {
    structured: {
      ok: true,
      fileCount: 5,
      missing: [],
      errors: [],
      files: [],
    },
  },
  env: {
    mode: 'development',
    missingRequired: [],
    missingRecommended: [],
    invalid: [],
  },
  databaseError: null,
  timestamp: '2026-06-11T00:00:00.000Z',
  model: {
    name: 'local runtime',
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    maxInputChars: 4000,
    minTokenBalanceForChat: 1,
    chatProvider: {
      configured: false,
      liveVerified: false,
      productionReady: false,
      status: 'missing_provider',
      localFallbackEnabled: true,
      forcedLocal: true,
      activeRuntimeProvider: 'local',
      localModel: 'local/mock-roleplay',
    },
    imageGeneration: {
      configured: false,
      liveVerified: false,
      productionReady: false,
      status: 'missing_provider',
      model: 'fallback',
    },
  },
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

  test('creator form exposes core fields and disabled submit reason before required data exists', () => {
    const closed = render(
      createElement(CharacterCreateForm, {
        isSaving: false,
        onCreate: async () => true,
      }),
    )
    const open = render(
      createElement(CharacterCreateForm, {
        defaultOpen: true,
        isSaving: false,
        onCreate: async () => true,
        onDraftStatusChange: () => undefined,
      }),
    )

    expect(closed).toContain('data-testid="creator-form-toggle"')
    expect(closed).toContain('aria-expanded="false"')
    expect(closed).not.toContain('data-testid="creator-submit"')
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('data-testid="creator-name"')
    expect(open).toContain('data-testid="creator-system-prompt"')
    expect(open).toContain('data-testid="creator-tags"')
    expect(open).toContain('data-testid="creator-submit"')
    expect(open).toContain('aria-disabled="true"')
    expect(open).toContain('disabled=""')
  })

  test('system status presents local runtime as local QA without mock wording', () => {
    const html = render(
      createElement(SystemStatus, {
        healthStatus: localHealthStatus,
        onRefresh: async () => undefined,
      }),
    )

    expect(html).toContain('โหมด local QA พร้อมเล่น')
    expect(html).toContain('แชท local QA')
    expect(html).toContain('local/mock-roleplay')
    expect(html).not.toContain('local mock')
  })
})
