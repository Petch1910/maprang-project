import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
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
import { buildDeployPhaseSteps, type DeployCheck } from '../src/lib/adminHealthDeploy'
import type { Character, ChatMessage, ChatSummary } from '../src/lib/api'
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

  test('chat panel bypasses token send lock only for local runtime', () => {
    const source = readFileSync(new URL('../src/components/ChatPanel.tsx', import.meta.url), 'utf8')
    const workspaceSource = readFileSync(new URL('../src/pages/WorkspacePage.tsx', import.meta.url), 'utf8')

    expect(source).toContain('isLocalChatRuntime?: boolean')
    expect(source).toContain('const isTokenGated = !isLocalChatRuntime')
    expect(source).toContain('canSubmit={!isOutOfTokens}')
    expect(source).toContain('กำลังตอบอยู่ กรุณารอคำตอบก่อนส่งต่อ')
    expect(workspaceSource).toContain("activeRuntimeProvider === 'local'")
    expect(workspaceSource).toContain('isLocalChatRuntime={isLocalChatRuntime}')
  })

  test('chat opening uses a structured intro card instead of duplicating the greeting bubble', () => {
    const source = readFileSync(new URL('../src/components/ChatPanel.tsx', import.meta.url), 'utf8')

    expect(source).toContain('data-testid="chat-opening-scene-card"')
    expect(source).toContain('OpeningSceneCard')
    expect(source).toContain('const openingMessage = showIntro')
    expect(source).toContain('const timelineMessages = showIntro && openingMessage')
    expect(source).toContain("visibleMessages.filter((chat) => chat.id !== openingMessage.id)")
    expect(source).toContain('เลือกจังหวะเริ่มบทสนทนา')
  })

  test('chat composer routes button and enter submit through a local duplicate-send guard', () => {
    const source = readFileSync(new URL('../src/components/Composer.tsx', import.meta.url), 'utf8')

    expect(source).toContain('submitLockRef')
    expect(source).toContain('handleSubmitRequest')
    expect(source).toContain('if (!canSend || submitLockRef.current) return')
    expect(source.match(/handleSubmitRequest\(\)/g)?.length).toBeGreaterThanOrEqual(2)
    expect(source).not.toContain('if (canSend) onSubmit()')
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
    expect(html).toContain('data-testid="message-actions-msg-assistant"')
    const source = readFileSync(new URL('../src/components/MessageBubble.tsx', import.meta.url), 'utf8')
    expect(source).toContain('data-testid={`message-copy-${chat.id}`}')
    expect(source).toContain('data-testid={`message-report-${chat.id}`}')
    expect(source).toContain('data-testid={`message-edit-disabled-${chat.id}`}')
    expect(source).toContain('data-testid={`message-regenerate-disabled-${chat.id}`}')
    expect(source).toContain('data-testid={`message-delete-disabled-${chat.id}`}')
    expect(source).toContain('ยังไม่มีระบบแก้ไข ลบ หรือสร้างคำตอบใหม่เฉพาะข้อความนี้ใน API ปัจจุบัน')
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
    const creatorStateSource = await Bun.file('apps/frontend/src/lib/creatorFormState.ts').text()
    const creatorPersistenceHookSource = await Bun.file('apps/frontend/src/hooks/useCreatorDraftPersistence.ts').text()
    const creatorGenerationHookSource = await Bun.file('apps/frontend/src/hooks/useCreatorDraftGeneration.ts').text()
    const creatorFormActionsHookSource = await Bun.file('apps/frontend/src/hooks/useCreatorFormActions.ts').text()
    const pageSource = await Bun.file('apps/frontend/src/pages/CreatorStudioPage.tsx').text()
    const routeAuditSource = await Bun.file('apps/frontend/src/lib/routeMenuAudit.ts').text()
    const workspaceSource = await Bun.file('apps/frontend/src/pages/WorkspacePage.tsx').text()
    const adminHealthSource = await Bun.file('apps/frontend/src/pages/AdminHealthPage.tsx').text()
    const combinedSource = `${formSource}\n${creatorStateSource}\n${creatorGenerationHookSource}\n${creatorFormActionsHookSource}\n${pageSource}\n${routeAuditSource}\n${workspaceSource}\n${adminHealthSource}`

    expect(formSource).toContain('ภาพร่างสำหรับจัดฟอร์ม')
    expect(creatorGenerationHookSource).toContain('ระบบช่วยร่างเนื้อหาในเครื่องให้ก่อน')
    expect(formSource).toContain('useCreatorDraftPersistence({')
    expect(formSource).toContain('useCreatorDraftGeneration({')
    expect(formSource).toContain('useCreatorFormActions({')
    expect(formSource).toContain('onClick={useCoverAsMainImage}')
    expect(formSource).toContain('onClick={clearCoverDraft}')
    expect(formSource).toContain('clearGeneratedAvatar()')
    expect(formSource).toContain('onClick={clearGeneratedAvatar}')
    expect(formSource).toContain('onClick={() => resetCreatorForm()}')
    expect(formSource).not.toContain('fetchCreatorDraft()')
    expect(formSource).not.toContain('updateCreatorDraft(payload)')
    expect(formSource).not.toContain('generateCreatorAiDraft')
    expect(formSource).not.toContain('uploadAvatar')
    expect(formSource).not.toContain('buildGeneratedAvatarDataUrl')
    expect(formSource).not.toContain("setCoverImageUrl('')")
    expect(formSource).not.toContain("setCoverImageSource('none')")
    expect(formSource).not.toContain('setForm(emptyCharacter)')
    expect(formSource).not.toContain("update('avatarUrl', coverImageUrl)")
    expect(formSource).not.toContain("update('avatarUrl', '')")
    expect(formSource).not.toContain('withCreatorUiTimeout')
    expect(formSource).not.toContain('trackFrontendEventSafe')
    expect(formSource).not.toContain('persistLocalCreatorDraft(dbDraft)')
    expect(formSource).not.toContain('persistLocalCreatorDraft(payload)')
    expect(formSource).not.toContain('writeStoredCreatorDraft(window.localStorage')
    expect(formSource).not.toContain('readStoredCreatorDraft(window.localStorage')
    expect(formSource).not.toContain('clearStoredCreatorDraft(window.localStorage')
    expect(creatorPersistenceHookSource).toContain('fetchCreatorDraft()')
    expect(creatorPersistenceHookSource).toContain('persistLocalCreatorDraft(dbDraft)')
    expect(creatorPersistenceHookSource).toContain('persistLocalCreatorDraft(payload)')
    expect(creatorPersistenceHookSource).toContain('updateCreatorDraft(payload).catch(() => {})')
    expect(creatorPersistenceHookSource).toContain('updateCreatorDraft(null).catch(() => {})')
    expect(creatorGenerationHookSource).toContain('generateCreatorAiDraft')
    expect(creatorGenerationHookSource).toContain('uploadAvatar')
    expect(creatorGenerationHookSource).toContain('buildGeneratedAvatarDataUrl')
    expect(creatorGenerationHookSource).toContain('withCreatorUiTimeout')
    expect(creatorGenerationHookSource).toContain('trackFrontendEventSafe')
    expect(creatorGenerationHookSource).toContain('applyImageDraft')
    expect(creatorFormActionsHookSource).toContain('useCoverAsMainImage')
    expect(creatorFormActionsHookSource).toContain('clearCoverDraft')
    expect(creatorFormActionsHookSource).toContain('clearGeneratedAvatar')
    expect(creatorFormActionsHookSource).toContain('resetCreatorForm')
    expect(creatorFormActionsHookSource).toContain('clearPersistedCreatorDraft()')
    expect(creatorFormActionsHookSource).toContain("setCoverImageUrl('')")
    expect(creatorFormActionsHookSource).toContain("setCoverImageSource('none')")
    expect(creatorFormActionsHookSource).toContain('setForm(emptyCharacter)')
    expect(creatorStateSource).toContain('function avatarSourceLabel')
    expect(creatorStateSource).toContain('ระบบสร้างรูป')
    expect(creatorStateSource).toContain('ภาพร่างระบบ')
    expect(creatorStateSource).toContain('ผู้ใช้เลือกเอง')
    expect(creatorStateSource).toContain('function buildReadinessSummary')
    expect(creatorStateSource).toContain('function buildCreatorCharacterInput')
    expect(creatorStateSource).toContain("visibility: 'PRIVATE'")
    expect(creatorStateSource).toContain("status: 'DRAFT'")
    expect(formSource).toContain('onCreate(buildCreatorCharacterInput({ form, coverImageUrl }))')
    expect(formSource).toContain('ภาพยนตร์สมจริง')
    expect(formSource).toContain('ภาพสามมิติ')
    expect(pageSource).toContain('ภาพร่างพร้อม')
    expect(routeAuditSource).toContain('ภาพร่างระบบแทนพร้อมบอกสถานะ')
    expect(workspaceSource).toContain('ระบบสร้างรูปจริงยังไม่พร้อม')
    expect(routeAuditSource).toContain('ภาพร่างระบบแทนพร้อมบอกสถานะ')
    expect(combinedSource).not.toContain('ภาพตัวอย่าง')
    expect(combinedSource).not.toContain('ภาพตัวอย่างชั่วคราว')
    expect(combinedSource).not.toContain('ยังไม่ใช่รูป AI จริง')
    expect(combinedSource).not.toContain('ผู้ให้บริการสร้างรูปจริง')
    expect(combinedSource).not.toContain('ดราฟต์สำรองเพราะโมเดลเนื้อหาไม่พร้อม')
    expect(combinedSource).not.toContain('เรียก AI ไม่สำเร็จ')
    expect(formSource).not.toContain('Cinematic Realistic')
    expect(formSource).not.toContain('3D Render')
    expect(formSource).not.toContain('Digital Art)')
  })

  test('admin health presents local runtime without old component dependency', async () => {
    const source = await Bun.file('apps/frontend/src/pages/AdminHealthPage.tsx').text()

    expect(source).toContain('โหมดจำลองในเครื่องพร้อมเล่นโดยไม่ใช้เครดิตผู้ให้บริการ')
    expect(source).toContain('แชทในเครื่องพร้อมใช้')
    expect(source).not.toContain('SystemStatus')
    expect(source).not.toContain('local QA')
    expect(source).not.toContain('local mock')
  })

  test('prompt inspector exposes narrative-engine planning evidence', async () => {
    const pageSource = await Bun.file('apps/frontend/src/pages/AdminPromptInspectorPage.tsx').text()
    const apiSource = await Bun.file('apps/frontend/src/lib/api.ts').text()

    expect(pageSource).toContain('data-testid="prompt-inspector-narrative-plan"')
    expect(pageSource).toContain('NarrativePlanPanel narrative={result.snapshot.narrative}')
    expect(pageSource).toContain('Coordinator -&gt; Architect -&gt; Writer -&gt; Editor')
    expect(pageSource).toContain('narrative.promptBlock')
    expect(apiSource).toContain('export type PromptInspectorNarrativePlan')
    expect(apiSource).toContain('narrative: {')
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

    const [localServer, staging, liveProvider, production] = buildDeployPhaseSteps(checks)

    expect(localServer.title).toBe('1. เซิร์ฟเวอร์ในเครื่อง')
    expect(localServer.command).toBe('bun run local:doctor + bun run qa:full')
    expect(localServer.ok).toBe(false)
    expect(localServer.detail).toContain('local')
    expect(localServer.detail).not.toContain('URL')

    expect(staging.title).toBe('2. พรีวิวผ่าน Ngrok / สเตจจิง')
    expect(staging.command).toBe('bun run ngrok:proxy + bun run staging:verify + bun run e2e:smoke')
    expect(staging.ok).toBe(false)
    expect(staging.detail).toContain('URL หลังบ้านของหน้าเว็บ')
    expect(staging.detail).not.toContain('ฐานข้อมูล local')
    expect(staging.detail).not.toContain('ทดสอบแชทจริง')

    expect(liveProvider.title).toBe('3. ทดสอบผู้ให้บริการจริง')
    expect(liveProvider.command).toBe('bun run api:smoke:live')
    expect(liveProvider.ok).toBe(false)
    expect(liveProvider.detail).toContain('ทดสอบแชทจริง')
    expect(liveProvider.detail).toContain('ทดสอบสร้างรูปจริง')
    expect(liveProvider.detail).not.toContain('URL หลังบ้านของหน้าเว็บ')

    expect(production.title).toBe('4. โปรดักชันบนคลาวด์')
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
    expect(source).toContain('แชทในเครื่องพร้อมใช้')
    expect(source).not.toContain('โดเมนหน้าบ้านทดลอง')
    expect(source).not.toContain('ทดสอบ flow')
    expect(source).toContain('ลำดับงานก่อนปล่อยจริง')
    expect(source).toContain('buildDeployPhaseSteps(checks)')
    expect(source).toContain('ยังใช้ภาพร่างของระบบ')
    expect(source).not.toContain("'provider'} แล้ว")
    expect(source).not.toContain('ยังใช้ภาพ fallback ของระบบ')
    expect(source).not.toContain('ยังไม่พร้อมเต็ม')
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

  test('navigation disabled reasons stay Thai and local-server friendly', async () => {
    const source = await Bun.file('apps/frontend/src/lib/missaiNavigation.ts').text()

    expect(source).toContain('เซิร์ฟเวอร์ในเครื่องยังไม่มีแพ็กเกจแอปให้ดาวน์โหลด')
    expect(source).not.toContain('Local server ยังไม่มีแพ็กเกจแอปให้ดาวน์โหลด')
  })

  test('frontend event capture is wired through the shared api helper', async () => {
    const apiSource = await Bun.file('apps/frontend/src/lib/api.ts').text()
    const analyticsSource = await Bun.file('apps/frontend/src/lib/analytics.ts').text()
    const exploreSource = await Bun.file('apps/frontend/src/pages/ExplorePage.tsx').text()
    const lobbySource = await Bun.file('apps/frontend/src/pages/CharacterLobbyPage.tsx').text()
    const walletSource = await Bun.file('apps/frontend/src/pages/WalletPage.tsx').text()
    const creatorSource = await Bun.file('apps/frontend/src/pages/CreatorStudioPage.tsx').text()
    const aiCreatorSource = await Bun.file('apps/frontend/src/pages/AICreatorPage.tsx').text()
    const aiCreatorGenerationHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorGeneration.ts').text()
    const reportSource = await Bun.file('apps/frontend/src/components/ReportDialog.tsx').text()

    expect(apiSource).toContain("requestJson<{ ok: boolean; eventId: string }>('/analytics/events'")
    expect(analyticsSource).toContain('trackFrontendEventSafe')
    expect(analyticsSource).not.toContain('fetch(')
    expect(exploreSource).toContain("eventName: 'marketplace_view'")
    expect(exploreSource).toContain("eventName: 'character_impression'")
    expect(lobbySource).toContain("eventName: 'character_detail_view'")
    expect(walletSource).toContain("eventName: 'wallet_view'")
    expect(creatorSource).toContain("eventName: 'creator_opened'")
    expect(creatorSource).toContain("eventName: 'creator_publish'")
    expect(aiCreatorSource).toContain("eventName: 'ai_creator_opened'")
    expect(aiCreatorGenerationHookSource).toContain("eventName: 'ai_creator_generate_started'")
    expect(reportSource).toContain("eventName: 'report_opened'")
  })

  test('ai creator detail dialog keeps product labels Thai-first', async () => {
    const source = await Bun.file('apps/frontend/src/components/ai-creator/AiCreatorHistoryDetailDialog.tsx').text()

    for (const label of ['สถานะ', 'ประเภท', 'ค่าใช้จ่าย', 'พรอมป์', 'บรีฟ', 'ร่างตัวละคร', 'พรอมป์ระบบ']) {
      expect(source).toContain(label)
    }
    for (const staleLabel of ['>Status<', '>Type<', '>Cost<', '>Prompt<', '>Brief<', '>Character Draft<', '>System Prompt<', 'Video Preview', 'Image Draft', 'local-safe']) {
      expect(source).not.toContain(staleLabel)
    }
  })

  test('ai creator page keeps character loading and local history in focused hooks', async () => {
    const pageSource = await Bun.file('apps/frontend/src/pages/AICreatorPage.tsx').text()
    const characterHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorCharacterOptions.ts').text()
    const historyHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorLocalHistory.ts').text()

    expect(pageSource).toContain("import { useAiCreatorCharacterOptions } from '../hooks/useAiCreatorCharacterOptions'")
    expect(pageSource).toContain("import { useAiCreatorDownloads } from '../hooks/useAiCreatorDownloads'")
    expect(pageSource).toContain("import { useAiCreatorGeneration } from '../hooks/useAiCreatorGeneration'")
    expect(pageSource).toContain("import { useAiCreatorLocalHistory } from '../hooks/useAiCreatorLocalHistory'")
    expect(pageSource).toContain("import { useAiCreatorUploadReferences } from '../hooks/useAiCreatorUploadReferences'")
    expect(pageSource).toContain('const characters = useAiCreatorCharacterOptions(40)')
    expect(pageSource).toContain('useAiCreatorDownloads(setStatusMessage)')
    expect(pageSource).toContain('useAiCreatorGeneration({')
    expect(pageSource).toContain('prependHistoryItem,')
    expect(pageSource).toContain('removeHistoryItem,')
    expect(pageSource).toContain('toggleLocalHistoryFavorite,')
    expect(pageSource).toContain('useAiCreatorUploadReferences(videoDuration, setStatusMessage)')
    expect(pageSource).not.toContain('fetchCharacters')
    expect(pageSource).not.toContain('generateCreatorAiDraft')
    expect(pageSource).not.toContain('createAiCreatorImageItem')
    expect(pageSource).not.toContain('createAiCreatorVideoItem')
    expect(pageSource).not.toContain('readAiCreatorHistory')
    expect(pageSource).not.toContain('writeAiCreatorHistory')
    expect(pageSource).not.toContain('validateAiCreatorUploadSlot')
    expect(pageSource).not.toContain('new FileReader')
    expect(pageSource).not.toContain('fetchGenerationOutputDownload')
    expect(pageSource).not.toContain('buildAiCreatorDownloadFilename')
    expect(pageSource).not.toContain('getAiCreatorDownloadActionState')
    expect(pageSource).not.toContain("document.createElement('a')")

    expect(characterHookSource).toContain("fetchCharacters({ view: 'public', limit })")
    expect(characterHookSource).toContain('active = false')
    expect(historyHookSource).toContain('readAiCreatorHistory(window.localStorage)')
    expect(historyHookSource).toContain('writeAiCreatorHistory(window.localStorage, nextHistory)')
    expect(historyHookSource).toContain('prependAiCreatorHistory(currentHistory, item)')

    const uploadHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorUploadReferences.ts').text()
    expect(uploadHookSource).toContain('validateAiCreatorUploadSlot')
    expect(uploadHookSource).toContain('AI_CREATOR_UPLOAD_SLOT_RULES.imageToImage[0]')
    expect(uploadHookSource).toContain('AI_CREATOR_UPLOAD_SLOT_RULES.advancedVideo[0]')
    expect(uploadHookSource).toContain('new FileReader')

    const generationHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorGeneration.ts').text()
    expect(generationHookSource).toContain('generateCreatorAiDraft')
    expect(generationHookSource).toContain('createAiCreatorImageItem')
    expect(generationHookSource).toContain('createAiCreatorVideoItem')
    expect(generationHookSource).toContain("eventName: 'ai_creator_generate_started'")

    const downloadHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorDownloads.ts').text()
    expect(downloadHookSource).toContain('fetchGenerationOutputDownload')
    expect(downloadHookSource).toContain('buildAiCreatorDownloadFilename')
    expect(downloadHookSource).toContain('getAiCreatorDownloadActionState')
    expect(downloadHookSource).toContain("document.createElement('a')")

    const libraryActionsHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorLibraryActions.ts').text()
    expect(libraryActionsHookSource).toContain('toggleLocalHistoryFavorite(itemId)')
    expect(libraryActionsHookSource).toContain('removeHistoryItem(itemId)')
  })

  test('workspace chat does not substitute a client-side character when backend data is empty', async () => {
    const workspaceSource = await Bun.file('apps/frontend/src/pages/WorkspacePage.tsx').text()
    const workspaceRuntimeSource = await Bun.file('apps/frontend/src/lib/workspaceRuntime.ts').text()
    const workspaceChatHistoryHookSource = await Bun.file('apps/frontend/src/hooks/useWorkspaceChatHistory.ts').text()
    const workspaceReportsHookSource = await Bun.file('apps/frontend/src/hooks/useWorkspaceReports.ts').text()
    const workspaceWorldStateHookSource = await Bun.file('apps/frontend/src/hooks/useWorkspaceWorldState.ts').text()
    const chatHelperSource = await Bun.file('apps/frontend/src/lib/chat.ts').text()

    expect(workspaceSource).not.toContain('fallbackCharacter')
    expect(chatHelperSource).not.toContain('fallbackCharacter')
    expect(workspaceSource).toContain('data-testid="chat-empty-character-state"')
    expect(workspaceSource).toContain("setCharacters(visibleCharacters)")
    expect(workspaceSource).toContain("from '../lib/workspaceRuntime'")
    expect(workspaceSource).toContain("from '../hooks/useWorkspaceChatHistory'")
    expect(workspaceSource).toContain("from '../hooks/useWorkspaceReports'")
    expect(workspaceSource).toContain("from '../hooks/useWorkspaceWorldState'")
    expect(workspaceSource).toContain('useWorkspaceChatHistory()')
    expect(workspaceSource).toContain('useWorkspaceReports({')
    expect(workspaceSource).toContain('useWorkspaceWorldState({')
    expect(workspaceSource).not.toContain('function apiErrorMessage')
    expect(workspaceSource).not.toContain('function defaultSceneState')
    expect(workspaceSource).not.toContain('const openMessageReport =')
    expect(workspaceSource).not.toContain('const openCharacterReport =')
    expect(workspaceSource).not.toContain('const reportMessage = async')
    expect(workspaceSource).not.toContain('const saveWorldState = async')
    expect(workspaceSource).not.toContain('const loadChatHistory = useCallback')
    expect(workspaceSource).not.toContain('defaultMemoryState')
    expect(workspaceSource).not.toContain('defaultSceneState')
    expect(workspaceSource).not.toContain('defaultRelationshipState')
    expect(workspaceSource).not.toContain('????????')
    expect(workspaceSource).not.toContain('setIsLoading(false)\n      try {\n        setIsLoading(false)')
    expect(workspaceRuntimeSource).toContain('function apiErrorMessage')
    expect(workspaceRuntimeSource).toContain('function defaultSceneState')
    expect(workspaceRuntimeSource).toContain('function logUnexpectedWorkspaceError')
    expect(workspaceRuntimeSource).toContain('function savedChatRuntimeState')
    expect(workspaceRuntimeSource).toContain('export const savedChatMessageWindowLimit = 120')
    expect(workspaceChatHistoryHookSource).toContain('fetchChats')
    expect(workspaceChatHistoryHookSource).toContain('isPlayableChatSummary')
    expect(workspaceChatHistoryHookSource).toContain('loadChatHistory')
    expect(workspaceReportsHookSource).toContain('createReport')
    expect(workspaceReportsHookSource).toContain('openMessageReport')
    expect(workspaceReportsHookSource).toContain('openCharacterReport')
    expect(workspaceReportsHookSource).toContain('reportMessage')
    expect(workspaceWorldStateHookSource).toContain('updateChatWorldState')
    expect(workspaceWorldStateHookSource).toContain('saveWorldState')
    expect(workspaceWorldStateHookSource).toContain('setRuntimeState')
    expect(workspaceSource).not.toContain('visibleCharacters.length ? visibleCharacters')
    expect(workspaceSource).not.toContain('QA seed')
  })

  test('wallet admin token adjustments keep production-facing ledger reasons', async () => {
    const walletSource = await Bun.file('apps/frontend/src/pages/WalletPage.tsx').text()

    expect(walletSource).toContain('ผู้ดูแลเพิ่มเครดิตการใช้งาน')
    expect(walletSource).toContain('ผู้ดูแลหักเครดิตการใช้งาน')
    expect(walletSource).toContain('IMAGE_GENERATION')
    expect(walletSource).toContain('สร้างรูป AI')
    expect(walletSource).not.toContain('manual_beta_grant')
    expect(walletSource).not.toContain('manual_admin_debit')
    expect(walletSource).not.toContain('ช่วงทดสอบก่อนเชื่อมระบบชำระเงินจริง')
  })

  test('profile BYOK mode keeps raw user API keys session-only', async () => {
    const profileSource = await Bun.file('apps/frontend/src/pages/ProfilePage.tsx').text()
    const apiSource = await Bun.file('apps/frontend/src/lib/api.ts').text()

    expect(profileSource).toContain("safeSetStorageItem(window.sessionStorage, 'maprang:customApiKey:session'")
    expect(profileSource).toContain("safeRemoveStorageItem(window.sessionStorage, 'maprang:customApiKey:session')")
    expect(profileSource).toContain("safeRemoveStorageItem(window.localStorage, 'maprang:customApiKey')")
    expect(profileSource).not.toContain("safeSetStorageItem(window.localStorage, 'maprang:customApiKey'")
    expect(apiSource).toContain("sessionValue('maprang:customApiKey:session')")
    expect(apiSource).not.toContain("localValue('maprang:customApiKey')")
  })

  test('character lobby hides unavailable characters with product-facing copy', async () => {
    const lobbySource = await Bun.file('apps/frontend/src/pages/CharacterLobbyPage.tsx').text()

    expect(lobbySource).toContain('ตัวละครนี้ไม่พร้อมแสดงในโหมดใช้งานจริง')
    expect(lobbySource).toContain('โทนอารมณ์เริ่มต้น')
    expect(lobbySource).not.toContain('ตัวละคร QA สำหรับทดสอบ')
    expect(lobbySource).not.toContain('ตัวอย่างโทนอารมณ์')
  })

  test('saved chat cards avoid demo-like empty preview copy', async () => {
    const myChatsSource = await Bun.file('apps/frontend/src/pages/MyChatsPage.tsx').text()
    const characterVisualSource = await Bun.file('apps/frontend/src/lib/characterVisual.ts').text()

    expect(myChatsSource).toContain('ยังไม่มีข้อความล่าสุด')
    expect(myChatsSource).toContain('characterImageUrl({ id: chat.characterId, name: chat.characterName, src: chat.characterAvatarUrl })')
    expect(characterVisualSource).toContain('export function generatedCharacterImageUrl')
    expect(characterVisualSource).toContain('<ellipse cx="260" cy="254"')
    expect(myChatsSource).not.toContain('ยังไม่มีตัวอย่างข้อความ')
    expect(characterVisualSource).not.toContain('<text')
  })

  test('moderation empty state uses product-facing report guidance', async () => {
    const moderationSource = await Bun.file('apps/frontend/src/pages/AdminModerationPage.tsx').text()
    const routeAuditSource = await Bun.file('apps/frontend/src/lib/routeMenuAudit.ts').text()
    const apiSource = await Bun.file('apps/frontend/src/lib/api.ts').text()

    expect(moderationSource).toContain('ไม่พบรายงานในเงื่อนไขนี้')
    expect(moderationSource).toContain('ตรวจรายงานจากตัวละคร ข้อความ และผลงานสร้าง')
    expect(moderationSource).toContain("'GENERATION_OUTPUT'")
    expect(moderationSource).toContain("'HIDE_GENERATION_OUTPUT'")
    expect(moderationSource).toContain('ซ่อนผลงานสร้าง')
    expect(apiSource).toContain("ReportAdminAction = 'HIDE_CHARACTER' | 'ARCHIVE_MESSAGE' | 'HIDE_GENERATION_OUTPUT'")
    expect(apiSource).toContain("AdminAuditAction =")
    expect(apiSource).toContain("'HIDE_GENERATION_OUTPUT'")
    expect(apiSource).toContain('generationOutput?:')
    expect(routeAuditSource).toContain('ถ้าไม่มีรายงานจะบอกวิธีสร้างรายงานจากหน้าแชทหรือหน้าโปรไฟล์ตัวละคร')
    expect(moderationSource).not.toContain('ทดสอบ flow')
    expect(moderationSource).not.toContain('ไปทดสอบรายงาน')
    expect(routeAuditSource).not.toContain('ทดสอบ flow')
  })

  test('content mode flows from age/profile settings into explore, lobby, and chat requests', async () => {
    const contentSliceSource = await Bun.file('apps/frontend/src/store/slices/contentSlice.ts').text()
    const ageGateSource = await Bun.file('apps/frontend/src/components/AgeGate.tsx').text()
    const profileSource = await Bun.file('apps/frontend/src/pages/ProfilePage.tsx').text()
    const exploreSource = await Bun.file('apps/frontend/src/pages/ExplorePage.tsx').text()
    const lobbySource = await Bun.file('apps/frontend/src/pages/CharacterLobbyPage.tsx').text()
    const workspaceSource = await Bun.file('apps/frontend/src/pages/WorkspacePage.tsx').text()
    const apiSource = await Bun.file('apps/frontend/src/lib/api.ts').text()

    expect(contentSliceSource).toContain("maxRating: 'teen_romance'")
    expect(contentSliceSource).toContain("state.maxRating = action.payload ? 'restricted_18' : 'teen_romance'")
    expect(ageGateSource).toContain("dispatch(saveContentSettings({ isAdult, maxRating: isAdult ? 'restricted_18' : 'teen_romance' }))")
    expect(profileSource).toContain('dispatch(saveContentSettings({ isAdult: mode.isAdult, maxRating: mode.maxRating }))')
    expect(profileSource).toContain('data-testid={`profile-content-mode-${mode.maxRating}`}')
    expect(exploreSource).toContain('maxRating: content.maxRating')
    expect(exploreSource).toContain('canViewRating(characterRating(character), content.maxRating)')
    expect(lobbySource).toContain('const canView = canViewRating(rating, content.maxRating)')
    expect(lobbySource).toContain("dispatch(saveContentSettings({ isAdult: true, maxRating: 'restricted_18' }))")
    expect(workspaceSource).toContain('maxRating: contentSettings.maxRating')
    expect(apiSource).toContain("maxRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'")
  })

  test('ai creator generation API helpers cover cancel and creator reference endpoints', async () => {
    const apiSource = await Bun.file('apps/frontend/src/lib/api.ts').text()
    const aiCreatorSource = await Bun.file('apps/frontend/src/lib/aiCreator.ts').text()
    const detailSource = await Bun.file('apps/frontend/src/components/ai-creator/AiCreatorHistoryDetailDialog.tsx').text()
    const pageSource = await Bun.file('apps/frontend/src/pages/AICreatorPage.tsx').text()
    const historyViewHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorHistoryView.ts').text()
    const libraryActionsHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorLibraryActions.ts').text()
    const studioActionsHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorStudioActions.ts').text()
    const studioBridgeHookSource = await Bun.file('apps/frontend/src/hooks/useAiCreatorStudioBridge.ts').text()

    expect(apiSource).toContain('cancelGenerationJob')
    expect(apiSource).toContain('/generation/jobs/${jobId}/cancel')
    expect(apiSource).toContain('GenerationOutputCreatorReference')
    expect(apiSource).toContain('useGenerationOutputAsCharacterImage')
    expect(apiSource).toContain('/generation/outputs/${outputId}/use-as-character-image')
    expect(apiSource).toContain('useGenerationOutputAsCover')
    expect(apiSource).toContain('/generation/outputs/${outputId}/use-as-cover')
    expect(aiCreatorSource).toContain('AI_CREATOR_VIDEO_PROVIDER_STATUS')
    expect(aiCreatorSource).toContain('AI_CREATOR_VIDEO_PROVIDER_NOTICE')
    expect(aiCreatorSource).toContain('getAiCreatorCancelActionState')
    expect(aiCreatorSource).toContain("backendJobStatus === 'queued'")
    expect(aiCreatorSource).toContain("backendJobStatus === 'running'")
    expect(detailSource).toContain('ai-creator-library-detail-cancel-')
    expect(detailSource).toContain('cancelState.title')
    expect(detailSource).toContain('creatorReferenceAction')
    expect(detailSource).toContain('const isPublicGalleryItem = item.id.startsWith')
    expect(detailSource).toContain('Public Gallery Detail')
    expect(detailSource).toContain('ai-creator-library-detail-public-notice-')
    expect(detailSource).toContain('!isPublicGalleryItem && downloadNotice')
    expect(detailSource).toContain("item.librarySource === 'backend' && !isPublicGalleryItem")
    expect(detailSource).toContain('ai-creator-library-detail-use-image-')
    expect(detailSource).toContain('ai-creator-library-detail-use-cover-')
    expect(pageSource).toContain('providerStatus: AI_CREATOR_VIDEO_PROVIDER_STATUS')
    expect(pageSource).toContain('videoProviderNotice={AI_CREATOR_VIDEO_PROVIDER_NOTICE}')
    expect(pageSource).toContain('AI_CREATOR_VIDEO_PROVIDER_STATUS')
    expect(await Bun.file('apps/frontend/src/components/ai-creator/AiCreatorControlPanel.tsx').text()).toContain(
      'data-testid="ai-creator-video-contract-state"',
    )
    expect(pageSource).toContain('handleCancelHistoryItem')
    expect(pageSource).toContain('useAiCreatorLibraryActions({')
    expect(pageSource).toContain('useAiCreatorHistoryView(backendHistory, history)')
    expect(pageSource).not.toContain('filterAiCreatorHistory(combinedHistory, galleryFilter)')
    expect(pageSource).not.toContain('paginateAiCreatorHistory(filteredHistory, currentPage)')
    expect(historyViewHookSource).toContain('filterAiCreatorHistory(combinedHistory, galleryFilter)')
    expect(historyViewHookSource).toContain('paginateAiCreatorHistory(filteredHistory, currentPage)')
    expect(historyViewHookSource).toContain('setGalleryFilter(filter)')
    expect(historyViewHookSource).toContain('setCurrentPage(1)')
    expect(pageSource).not.toContain('cancelGenerationJob(item.backendJobId)')
    expect(pageSource).not.toContain('retryGenerationJob(item.backendJobId)')
    expect(pageSource).not.toContain('deleteGenerationOutput(backendItem.backendOutputId)')
    expect(pageSource).not.toContain('reportGenerationOutput(reportTarget.id')
    expect(pageSource).not.toContain('publishGenerationOutput(item.backendOutputId)')
    expect(pageSource).not.toContain('unpublishGenerationOutput(item.backendOutputId)')
    expect(libraryActionsHookSource).toContain('cancelGenerationJob(item.backendJobId)')
    expect(libraryActionsHookSource).toContain('retryGenerationJob(item.backendJobId)')
    expect(libraryActionsHookSource).toContain('deleteGenerationOutput(backendItem.backendOutputId)')
    expect(libraryActionsHookSource).toContain('reportGenerationOutput(reportTarget.id')
    expect(libraryActionsHookSource).toContain('publishGenerationOutput(item.backendOutputId)')
    expect(libraryActionsHookSource).toContain('unpublishGenerationOutput(item.backendOutputId)')
    expect(pageSource).toContain('useAiCreatorStudioBridge(setStatusMessage, setDetailItem)')
    expect(pageSource).toContain('useAiCreatorStudioActions(setStatusMessage)')
    expect(pageSource).not.toContain('updateCreatorDraft(response.draft)')
    expect(pageSource).not.toContain('safeWriteClipboardText(getSafeClipboard()')
    expect(studioActionsHookSource).toContain('updateCreatorDraft(response.draft)')
    expect(studioActionsHookSource).toContain('safeWriteClipboardText(getSafeClipboard()')
    expect(studioActionsHookSource).toContain('setCopiedPrompt(true)')
    expect(pageSource).not.toContain('resolveCreatorReferenceItem')
    expect(pageSource).not.toContain('createCharacterImageReference(item.backendOutputId)')
    expect(pageSource).not.toContain('createCoverReference(item.backendOutputId)')
    expect(pageSource).not.toContain('saveAiCreatorItemToCreatorDraft(window.localStorage, resolved.item)')
    expect(pageSource).not.toContain('saveAiCreatorItemToCreatorCoverDraft(window.localStorage, resolved.item)')
    expect(studioBridgeHookSource).toContain('resolveCreatorReferenceItem')
    expect(studioBridgeHookSource).toContain("if (item.id.startsWith('public-')) return { ok: true, item }")
    expect(studioBridgeHookSource).toContain('useGenerationOutputAsCharacterImage as createCharacterImageReference')
    expect(studioBridgeHookSource).toContain('useGenerationOutputAsCover as createCoverReference')
    expect(studioBridgeHookSource).toContain('createCharacterImageReference(item.backendOutputId)')
    expect(studioBridgeHookSource).toContain('createCoverReference(item.backendOutputId)')
    expect(studioBridgeHookSource).toContain('import.meta.env.DEV && err instanceof ApiError && err.status === 404 && hasLocalSafePreview')
    expect(studioBridgeHookSource).toContain('ใช้ preview local-safe แทน backend reference')
    expect(studioBridgeHookSource).toContain('Promise<{ ok: true; item: AiCreatorGeneratedItem } | { ok: false; message: string }>')
    expect(studioBridgeHookSource).toContain('saveAiCreatorItemToCreatorDraft(window.localStorage, resolved.item)')
    expect(studioBridgeHookSource).toContain('saveAiCreatorItemToCreatorCoverDraft(window.localStorage, resolved.item)')
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
