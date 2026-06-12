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
import { buildDeployPhaseSteps, type DeployCheck } from '../src/lib/adminHealthDeploy'
import type { Character, ChatMessage, ChatSummary, HealthStatus } from '../src/lib/api'
import type { TagAnalysis } from '../src/lib/tagAnalysis'
import { selectPendingSceneCount, selectPendingSceneSummaries } from '../src/store/slices/chatsSlice'
import type { RootState } from '../src/store/types'

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

function chatSummaryWithPendingScene(overrides: Partial<ChatSummary> = {}): ChatSummary {
  return {
    id: 'chat-visible-1',
    title: 'มิกะรอคำตอบ',
    characterId: 'character-visible-1',
    characterName: 'มิกะ | MIKA',
    lastMessageAt: '2026-06-11T00:00:00.000Z',
    preview: 'ฉากเปิดใจพร้อมแล้ว',
    sceneState: {
      currentScene: '',
      lastUserIntent: 'slow-burn',
      mode: 'sandbox',
      pendingEvents: [
        {
          code: 'soft_confession_available',
          title: 'จังหวะเปิดใจครั้งแรก',
          prompt: 'ชวนเธอเล่าความรู้สึกโดยไม่บังคับ',
          priority: 30,
          cooldownTurns: 8,
          repeatable: false,
          expiresAtTurn: 9,
          status: 'pending',
        },
        {
          code: 'held_scene',
          title: 'ฉากที่เก็บไว้ก่อน',
          prompt: 'ไม่ควรถูกนับใน inbox',
          priority: 10,
          expiresAtTurn: 12,
          status: 'held',
        },
      ],
      activeScene: null,
      sceneOutcomes: [],
      eventCooldowns: {},
      consumedEvents: [],
      declinedEvents: [],
      updatedAt: '2026-06-11T00:00:00.000Z',
    },
    relationshipState: {
      status: 'SOULMATE',
    } as ChatSummary['relationshipState'],
    ...overrides,
  }
}

function rootStateWithChats(items: ChatSummary[]): RootState {
  return {
    characters: { items: [], isLoading: false, error: null },
    chats: { items, isLoading: false, error: null },
    content: { isAdult: true, ageGateAnswered: true, maxRating: 'restricted_18' },
    drafts: { composerByKey: {}, personaDraft: '', personaUpdatedAt: null },
    wallet: { tokenBalance: 1200, lowTokenThreshold: 100, isLoading: false },
  }
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

  test('creator studio image draft copy stays product-facing', async () => {
    const formSource = await Bun.file('apps/frontend/src/components/CharacterCreateForm.tsx').text()
    const pageSource = await Bun.file('apps/frontend/src/pages/CreatorStudioPage.tsx').text()
    const routeAuditSource = await Bun.file('apps/frontend/src/lib/routeMenuAudit.ts').text()
    const workspaceSource = await Bun.file('apps/frontend/src/pages/WorkspacePage.tsx').text()
    const systemStatusSource = await Bun.file('apps/frontend/src/components/SystemStatus.tsx').text()
    const combinedSource = `${formSource}\n${pageSource}\n${routeAuditSource}\n${workspaceSource}\n${systemStatusSource}`

    expect(formSource).toContain('ภาพร่างสำหรับจัดฟอร์ม')
    expect(formSource).toContain('ระบบช่วยร่างเนื้อหาในเครื่องให้ก่อน')
    expect(pageSource).toContain('ภาพร่างพร้อม')
    expect(routeAuditSource).toContain('ภาพร่างระบบแทนพร้อมบอกสถานะ')
    expect(workspaceSource).toContain('ระบบสร้างรูปจริงยังไม่พร้อม')
    expect(systemStatusSource).toContain('ใช้ภาพร่างระบบ')
    expect(combinedSource).not.toContain('ภาพตัวอย่าง')
    expect(combinedSource).not.toContain('ภาพตัวอย่างชั่วคราว')
    expect(combinedSource).not.toContain('ยังไม่ใช่รูป AI จริง')
    expect(combinedSource).not.toContain('ผู้ให้บริการสร้างรูปจริง')
    expect(combinedSource).not.toContain('ดราฟต์สำรองเพราะโมเดลเนื้อหาไม่พร้อม')
    expect(combinedSource).not.toContain('เรียก AI ไม่สำเร็จ')
  })

  test('system status presents local runtime without debug provider wording', () => {
    const html = render(
      createElement(SystemStatus, {
        healthStatus: localHealthStatus,
        onRefresh: async () => undefined,
      }),
    )

    expect(html).toContain('โหมดในเครื่องพร้อมเล่น')
    expect(html).toContain('แชทในเครื่องพร้อมใช้')
    expect(html).not.toContain('local QA')
    expect(html).not.toContain('local/mock-roleplay')
    expect(html).not.toContain('local mock')
  })

  test('admin health deploy phases keep local, staging, live provider, and production gates separate', () => {
    const checks: DeployCheck[] = [
      {
        label: 'ฐานข้อมูล local',
        ok: false,
        detail: 'local database is unavailable',
        action: 'run local database',
        scope: 'local',
      },
      {
        label: 'URL หลังบ้านของหน้าเว็บ',
        ok: false,
        detail: 'frontend still points at localhost',
        action: 'set VITE_API_BASE_URL to the deployed backend origin',
        scope: 'frontend',
      },
      {
        label: 'ทดสอบแชทจริง',
        ok: false,
        detail: 'live chat smoke has not passed',
        action: 'run smoke and set CHAT_PROVIDER_LIVE_VERIFIED=1',
        scope: 'production',
      },
      {
        label: 'ทดสอบสร้างรูปจริง',
        ok: false,
        detail: 'live image smoke has not passed',
        action: 'run smoke and set IMAGE_GENERATION_LIVE_VERIFIED=1',
        scope: 'production',
      },
      {
        label: 'คลังรูป signed URL',
        ok: true,
        detail: 'storage is signed',
        action: 'rerun storage smoke',
        scope: 'production',
      },
    ]

    const [staging, liveProvider, production] = buildDeployPhaseSteps(checks)

    expect(staging.command).toBe('bun run staging:verify + bun run e2e:smoke')
    expect(staging.ok).toBe(false)
    expect(staging.detail).toContain('URL หลังบ้านของหน้าเว็บ')
    expect(staging.detail).not.toContain('ฐานข้อมูล local')
    expect(staging.detail).not.toContain('ทดสอบแชทจริง')

    expect(liveProvider.command).toBe('bun run api:smoke:live')
    expect(liveProvider.ok).toBe(false)
    expect(liveProvider.detail).toContain('ทดสอบแชทจริง')
    expect(liveProvider.detail).toContain('ทดสอบสร้างรูปจริง')
    expect(liveProvider.detail).not.toContain('URL หลังบ้านของหน้าเว็บ')

    expect(production.command).toBe('bun run production:check')
    expect(production.ok).toBe(false)
    expect(production.detail).toContain('URL หลังบ้านของหน้าเว็บ')
    expect(production.detail).toContain('ทดสอบแชทจริง')
    expect(production.detail).toContain('ทดสอบสร้างรูปจริง')
    expect(production.detail).not.toContain('ฐานข้อมูล local')
  })

  test('admin health page uses the shared deploy phase helper instead of a local duplicate', async () => {
    const source = await Bun.file('apps/frontend/src/pages/AdminHealthPage.tsx').text()

    expect(source).toContain("import { buildDeployPhaseSteps, type DeployCheck } from '../lib/adminHealthDeploy'")
    expect(source).not.toContain('function buildDeployPhaseSteps(')
    expect(source).not.toContain('function blockerSummary(')
    expect(source).toContain('โดเมนหน้าบ้านสเตจจิง')
    expect(source).not.toContain('โดเมนหน้าบ้านทดลอง')
    expect(source).not.toContain('ทดสอบ flow')
  })

  test('app shell keeps immersive routes out of the global navigation wrapper', async () => {
    const source = await Bun.file('apps/frontend/src/App.tsx').text()
    const immersiveRouteIndex = source.indexOf("const isImmersiveRoute = location.pathname === '/' || location.pathname.startsWith('/chat')")
    const immersiveBranchIndex = source.indexOf('if (isImmersiveRoute)')
    const globalHeaderIndex = source.indexOf('<header className="sticky top-0')

    expect(immersiveRouteIndex).toBeGreaterThan(0)
    expect(immersiveBranchIndex).toBeGreaterThan(immersiveRouteIndex)
    expect(globalHeaderIndex).toBeGreaterThan(immersiveBranchIndex)
    expect(source).toContain('{appRoutes}')
    expect(source).not.toContain('maprang:theme:v2')
    expect(source).not.toContain('โหมดสว่างยังไม่รองรับ')
    expect(source).not.toContain('setIsDarkMode')
    expect(source).not.toContain('initialDarkMode')
  })

  test('workspace chat does not substitute a client-side character when backend data is empty', async () => {
    const workspaceSource = await Bun.file('apps/frontend/src/pages/WorkspacePage.tsx').text()
    const chatHelperSource = await Bun.file('apps/frontend/src/lib/chat.ts').text()

    expect(workspaceSource).not.toContain('fallbackCharacter')
    expect(chatHelperSource).not.toContain('fallbackCharacter')
    expect(workspaceSource).toContain('data-testid="chat-empty-character-state"')
    expect(workspaceSource).toContain('หน้าแชทจะไม่ใช้ตัวละครที่ไม่ได้มาจากระบบหลังบ้านแทนข้อมูลจริง')
    expect(workspaceSource).toContain("setCharacters(visibleCharacters)")
    expect(workspaceSource).not.toContain('visibleCharacters.length ? visibleCharacters')
    expect(workspaceSource).not.toContain('เปิด QA seed')
    expect(workspaceSource).not.toContain('แชท QA สำหรับทดสอบ')
  })

  test('wallet admin token adjustments keep production-facing ledger reasons', async () => {
    const walletSource = await Bun.file('apps/frontend/src/pages/WalletPage.tsx').text()

    expect(walletSource).toContain('ผู้ดูแลเพิ่มโทเคน')
    expect(walletSource).toContain('ผู้ดูแลหักโทเคน')
    expect(walletSource).not.toContain('manual_beta_grant')
    expect(walletSource).not.toContain('manual_admin_debit')
    expect(walletSource).not.toContain('ช่วงทดสอบก่อนเชื่อมระบบชำระเงินจริง')
  })

  test('character lobby hides unavailable characters with product-facing copy', async () => {
    const lobbySource = await Bun.file('apps/frontend/src/pages/CharacterLobbyPage.tsx').text()

    expect(lobbySource).toContain('ตัวละครนี้ไม่พร้อมแสดงในโหมดใช้งานจริง')
    expect(lobbySource).not.toContain('ตัวละคร QA สำหรับทดสอบ')
  })

  test('moderation empty state uses product-facing report guidance', async () => {
    const moderationSource = await Bun.file('apps/frontend/src/pages/AdminModerationPage.tsx').text()
    const routeAuditSource = await Bun.file('apps/frontend/src/lib/routeMenuAudit.ts').text()

    expect(moderationSource).toContain('เมื่อมีรายงานจากห้องแชทหรือหน้าโปรไฟล์ตัวละคร')
    expect(moderationSource).toContain('ไปสร้างรายงานจากแชท')
    expect(routeAuditSource).toContain('ถ้าไม่มีรายงานจะบอกวิธีสร้างรายงานจากหน้าแชทหรือหน้าโปรไฟล์ตัวละคร')
    expect(moderationSource).not.toContain('ทดสอบ flow')
    expect(moderationSource).not.toContain('ไปทดสอบรายงาน')
    expect(routeAuditSource).not.toContain('ทดสอบ flow')
  })

  test('events inbox selector exposes only playable pending scene summaries', () => {
    const visibleChat = chatSummaryWithPendingScene()
    const heldOnlyChat = chatSummaryWithPendingScene({
      id: 'chat-held-only',
      sceneState: {
        ...visibleChat.sceneState!,
        pendingEvents: [
          {
            code: 'held_scene',
            title: 'ฉากที่ยังไม่พร้อม',
            prompt: 'ผู้ใช้เก็บไว้ก่อน',
            priority: 10,
            expiresAtTurn: 12,
            status: 'held',
          },
        ],
      },
    })
    const hiddenQaChat = chatSummaryWithPendingScene({
      id: 'aaaaaaaa-1111-4111-8111-aaaaaaaa1111',
      title: 'QA Smoke hidden',
      characterName: 'QA Smoke Bot',
    })
    const state = rootStateWithChats([visibleChat, heldOnlyChat, hiddenQaChat])

    expect(selectPendingSceneCount(state)).toBe(1)
    expect(selectPendingSceneSummaries(state)).toEqual([
      {
        id: 'chat-visible-1:soft_confession_available',
        chatId: 'chat-visible-1',
        chatTitle: 'มิกะรอคำตอบ',
        characterName: 'มิกะ | MIKA',
        title: 'จังหวะเปิดใจครั้งแรก',
        prompt: 'ชวนเธอเล่าความรู้สึกโดยไม่บังคับ',
        relationshipStatus: 'SOULMATE',
        expiresAtTurn: 9,
      },
    ])
  })

  test('events inbox page keeps grouping hooks, chat links, and empty-state exits', async () => {
    const source = await Bun.file('apps/frontend/src/pages/EventsInboxPage.tsx').text()

    expect(source).toContain('selectPendingSceneSummaries')
    expect(source).toContain('data-testid="events-scene-list"')
    expect(source).toContain('data-testid="events-scene-group"')
    expect(source).toContain('data-testid="events-scene-row"')
    expect(source).toContain('to={`/chat/${event.chatId}`}')
    expect(source).toContain('to="/chat"')
    expect(source).toContain('to="/"')
    expect(source).toContain('ไม่พบฉากที่ตรงกับคำค้นหาตอนนี้')
  })
})
