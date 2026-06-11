import { expect, test, type APIRequestContext } from '@playwright/test'

const backendUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000'
const defaultUserId = process.env.E2E_USER_ID ?? '550e8400-e29b-41d4-a716-446655440000'
const seededCharacterId = process.env.E2E_CHARACTER_ID ?? '8644f2ce-8f6f-4c12-ab16-861081471303'
const seededChatId = process.env.E2E_CHAT_ID ?? '61aaecf2-a85b-4e01-a7ee-0973eef62699'
const seededMenuArchiveDesktopChatId = 'aaaaaaaa-1111-4111-8111-aaaaaaaa1111'
const seededMenuArchiveMobileChatId = 'aaaaaaaa-2222-4222-8222-aaaaaaaa2222'
const seededMenuDeleteDesktopChatId = 'bbbbbbbb-1111-4111-8111-bbbbbbbb1111'
const seededMenuDeleteMobileChatId = 'bbbbbbbb-2222-4222-8222-bbbbbbbb2222'
const seededMyChatsArchiveDesktopChatId = 'cccccccc-1111-4111-8111-cccccccc1111'
const seededMyChatsArchiveMobileChatId = 'cccccccc-2222-4222-8222-cccccccc2222'
const seededMyChatsDeleteDesktopChatId = 'dddddddd-1111-4111-8111-dddddddd1111'
const seededMyChatsDeleteMobileChatId = 'dddddddd-2222-4222-8222-dddddddd2222'
const seededMyChatsBulkArchiveDesktopChatId = 'eeeeeeee-1111-4111-8111-eeeeeeee1111'
const seededMyChatsBulkArchiveMobileChatId = 'eeeeeeee-2222-4222-8222-eeeeeeee2222'
const seededMyChatsBulkDeleteDesktopChatId = 'ffffffff-1111-4111-8111-ffffffff1111'
const seededMyChatsBulkDeleteMobileChatId = 'ffffffff-2222-4222-8222-ffffffff2222'
const adminKey = process.env.E2E_ADMIN_API_KEY ?? process.env.SMOKE_ADMIN_API_KEY ?? ''

const routeSmokeTargets = [
  { path: '/', text: 'Maprang' },
  { path: `/characters/${seededCharacterId}`, text: 'สัญญาความสัมพันธ์' },
  { path: `/chat/${seededChatId}`, testId: 'chat-composer-input' },
  { path: '/chats', text: 'แชท' },
  { path: '/create', testId: 'creator-name' },
  { path: '/events', text: 'อีเวนต์' },
  { path: '/profile', text: 'ตัวตนผู้เล่น' },
  { path: '/wallet', text: 'โทเคน' },
  { path: '/moderation', text: adminKey ? 'คิวรายงาน' : 'ADMIN_API_KEY' },
  { path: '/admin/health', text: 'ตรวจเส้นทาง/เมนู' },
  { path: '/admin/prompt-inspector', text: adminKey ? 'ตรวจพรอมป์ก่อนยิงโมเดล' : 'ADMIN_API_KEY' },
  { path: '/admin/evals', text: adminKey ? 'ทดสอบคุณภาพพรอมป์และบริบท' : 'ADMIN_API_KEY' },
]

function persistedReduxState() {
  return JSON.stringify({
    content: {
      isAdult: true,
      ageGateAnswered: true,
      showMature: true,
      maxRating: 'restricted_18',
    },
    drafts: {
      composerByKey: {},
      personaDraft: '',
      creatorDraftUpdatedAt: null,
    },
  })
}

test.beforeEach(async ({ page, request }) => {
  const contentReset = await request.patch(`${backendUrl}/me/content-settings`, {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': defaultUserId,
    },
    data: {
      isAdult: true,
      maxRating: 'restricted_18',
    },
  })
  expect(contentReset.ok(), 'e2e content settings should reset before each browser test').toBeTruthy()

  await page.addInitScript(
    ({ userId, savedRedux, key }) => {
      window.localStorage.setItem('maprang:userId', userId)
      window.localStorage.setItem('maprang:redux:v1', savedRedux)
      window.localStorage.setItem('maprang:theme:v2', 'dark')
      window.localStorage.setItem('maprang:showQaSeed', '1')
      if (key) window.localStorage.setItem('maprang:adminKey', key)
    },
    {
      userId: defaultUserId,
      savedRedux: persistedReduxState(),
      key: adminKey,
    },
  )
})

function collectBrowserErrors(page: Parameters<typeof test>[0]['page']) {
  const errors: string[] = []
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`response.${response.status()}: ${response.url()}`)
  })
  return errors
}

async function expectBackendRootIdentity(request: APIRequestContext, label: string) {
  const root = await request.get(`${backendUrl}/`)
  expect(root.ok(), `backend root should be reachable before ${label}`).toBeTruthy()
  await expect(root.json()).resolves.toMatchObject({ ok: true, service: 'maprang-backend' })
}

async function expectNoHorizontalOverflow(page: Parameters<typeof test>[0]['page']) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const label = [
          element.tagName.toLowerCase(),
          element.id ? `#${element.id}` : '',
          element.className && typeof element.className === 'string'
            ? `.${element.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.')}`
            : '',
        ].join('')
        return {
          label,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      })
      .filter((item) => item.width > 0 && (item.left < -2 || item.right > viewportWidth + 2))
      .slice(0, 8)

    return { viewportWidth, scrollWidth, offenders }
  })

  expect(
    overflow.scrollWidth <= overflow.viewportWidth + 2,
    `page should not overflow horizontally: ${JSON.stringify(overflow)}`,
  ).toBeTruthy()
}

async function ensureCreatorFormOpen(page: Parameters<typeof test>[0]['page']) {
  const toggle = page.getByTestId('creator-form-toggle')
  const nameInput = page.getByTestId('creator-name')
  await expect(toggle).toBeVisible()
  const isExpanded = await toggle.getAttribute('aria-expanded')
  if (isExpanded !== 'true') {
    await toggle.click()
  }
  await expect(nameInput).toBeVisible()
}

test('core route and menu smoke', async ({ page, request }, testInfo) => {
  const isMobile = testInfo.project.name.includes('mobile')
  const menuArchiveChatId = isMobile ? seededMenuArchiveMobileChatId : seededMenuArchiveDesktopChatId
  const menuDeleteChatId = isMobile ? seededMenuDeleteMobileChatId : seededMenuDeleteDesktopChatId
  const myChatsArchiveChatId = isMobile ? seededMyChatsArchiveMobileChatId : seededMyChatsArchiveDesktopChatId
  const myChatsDeleteChatId = isMobile ? seededMyChatsDeleteMobileChatId : seededMyChatsDeleteDesktopChatId
  const myChatsBulkArchiveChatId = isMobile ? seededMyChatsBulkArchiveMobileChatId : seededMyChatsBulkArchiveDesktopChatId
  const myChatsBulkDeleteChatId = isMobile ? seededMyChatsBulkDeleteMobileChatId : seededMyChatsBulkDeleteDesktopChatId
  await expectBackendRootIdentity(request, 'ตรวจเบราว์เซอร์')
  const health = await request.get(`${backendUrl}/health`)
  expect(health.ok(), 'ระบบหลังบ้าน /health ต้องเรียกได้ก่อนตรวจเบราว์เซอร์').toBeTruthy()
  const healthPayload = (await health.json()) as {
    model?: {
      chatProvider?: {
        activeRuntimeProvider?: string
        forcedLocal?: boolean
      }
    }
  }
  const expectsLocalChatRuntime =
    healthPayload.model?.chatProvider?.activeRuntimeProvider === 'local' || healthPayload.model?.chatProvider?.forcedLocal === true

  await page.goto('/')
  await expect(page.locator('body')).toContainText(/maprang/i)
  await expect(page.locator('a[href="/create"]').first()).toHaveAttribute('href', '/create')
  if (isMobile) {
    await expect(page.getByTestId('explore-mobile-nav')).toBeVisible()
    await expect(page.getByTestId('explore-mobile-nav-create')).toHaveAttribute('href', '/create')
    await expect(page.getByTestId('explore-mobile-nav-chats')).toHaveAttribute('href', '/chats')
  }

  await page.goto(`/characters/${seededCharacterId}`)
  const startChatLink = page.getByTestId('character-start-chat')
  await startChatLink.scrollIntoViewIfNeeded()
  await expect(startChatLink).toBeVisible()
  await expect(page.getByTestId('character-seed-stranger')).toHaveCount(1)
  const contractSeedTestIds = await page.locator('[data-testid^="character-seed-"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-testid') ?? '').filter((value) => value.length > 0),
  )
  expect(new Set(contractSeedTestIds).size, 'relationship contract seed buttons must not render duplicate choices').toBe(contractSeedTestIds.length)
  await page.getByTestId('character-seed-rival').click()
  await expect(page.getByTestId('character-seed-rival')).toHaveAttribute('aria-pressed', 'true')
  await expect(startChatLink).toHaveAttribute(
    'href',
    `/chat?characterId=${seededCharacterId}&relationship_seed=rival`,
  )
  await startChatLink.click()
  await expect(page.getByTestId('chat-composer-input')).toBeVisible()
  await expect(page.locator('body')).toContainText('เลือกจุดเริ่มต้นความสัมพันธ์: คู่ปรับ')
  await expect(page.locator('body')).not.toContainText('เลือกจุดเริ่มต้นความสัมพันธ์: rival')
  await page.goto(`/characters/${seededCharacterId}`)
  const shareStartChatLink = page.getByTestId('character-start-chat')
  await shareStartChatLink.scrollIntoViewIfNeeded()
  await expect(shareStartChatLink).toBeVisible()
  await page.getByTestId('character-share-button').click()
  await expect(page.getByTestId('character-action-note')).toBeVisible()
  await page.getByTestId('character-report-button').click()
  await expect(page.getByTestId('report-dialog')).toBeVisible()
  await page.getByTestId('report-cancel').click()
  await expect(page.getByTestId('report-dialog')).toBeHidden()

  await page.goto('/create')
  await ensureCreatorFormOpen(page)
  // The visible picker below is populated by /relationship/presets?surface=creator.
  // Keep this marker stable for predeploy relationship-contract coverage.
  await expect(page.getByTestId('relationship-preset-picker-select')).toBeVisible()
  await expect(page.getByTestId('relationship-preset-picker-select')).toBeEnabled()

  await expect(page.getByTestId('creator-ai-image-only')).toBeVisible()
  await expect(page.getByTestId('creator-image-style')).toBeVisible()

  const uniqueName = `QA Smoke ${Date.now()}`
  await page.getByTestId('creator-name').fill(uniqueName)
  await page.getByTestId('creator-tagline').fill('ตัวละครทดสอบ e2e ก่อนดีพลอย')
  await page.getByTestId('creator-image-style').selectOption('anime')

  await page.waitForTimeout(2000) // Wait for debounce auto-save to DB

  await page.reload()
  await ensureCreatorFormOpen(page)

  await expect(page.getByTestId('creator-name')).toHaveValue(uniqueName)
  await expect(page.getByTestId('creator-tagline')).toHaveValue('ตัวละครทดสอบ e2e ก่อนดีพลอย')
  await expect(page.getByTestId('creator-image-style')).toHaveValue('anime')

  await page.getByTestId('creator-avatar-url').fill('/src/assets/hero.png')
  await page.getByTestId('creator-description').fill('ใช้ตรวจว่า Creator Studio สร้าง draft ได้จริงและไม่ติดปุ่มหลอก')
  await page.getByTestId('creator-greeting').fill('พร้อมทดสอบระบบหรือยัง')
  await page.getByTestId('creator-system-prompt').fill('คุณคือตัวละคร QA สำหรับตรวจระบบ Maprang ตอบภาษาไทย กระชับ และคงบทบาท')
  await page.getByTestId('creator-scenario').fill('ผู้เล่นเปิดหน้า smoke test และต้องการเช็ค flow สร้างตัวละคร')
  await page.getByTestId('creator-tags').fill('qa, thai, roleplay, slow-burn')
  await expect(page.getByTestId('creator-submit')).toBeEnabled()
  await page.getByTestId('creator-submit').click()
  await expect(page.locator('body')).toContainText(uniqueName)
  let createdCharacterId = page.url().match(/\/characters\/([^/?#]+)/)?.[1]

  await page.goto('/create')
  await ensureCreatorFormOpen(page)
  await expect(page.getByTestId('creator-name')).toHaveValue('')
  await expect(page.getByTestId('creator-tagline')).toHaveValue('')
  await expect(page.getByTestId('creator-image-style')).toHaveValue('')

  if (!createdCharacterId) {
    const createdCharacters = await request.get(
      `${backendUrl}/characters?view=admin&q=${encodeURIComponent(uniqueName)}&limit=5`,
      {
        headers: {
          'x-user-id': defaultUserId,
          ...(adminKey ? { 'x-admin-key': adminKey } : {}),
        },
      },
    )
    expect(createdCharacters.ok(), 'การตรวจเบราว์เซอร์ต้องหาตัวละครชั่วคราวที่เพิ่งสร้างได้').toBeTruthy()
    const body = (await createdCharacters.json()) as { characters?: Array<{ id: string; name: string }> }
    createdCharacterId = body.characters?.find((item) => item.name === uniqueName)?.id
  }
  expect(createdCharacterId, 'การตรวจเบราว์เซอร์ต้องเก็บรหัสตัวละครชั่วคราวเพื่อ cleanup').toBeTruthy()
  if (createdCharacterId) {
    const cleanup = await request.delete(`${backendUrl}/characters/${createdCharacterId}`, {
      headers: {
        'x-user-id': defaultUserId,
        ...(adminKey ? { 'x-admin-key': adminKey } : {}),
      },
    })
    expect([200, 404], 'การตรวจเบราว์เซอร์ต้อง cleanup ตัวละครชั่วคราว').toContain(cleanup.status())
  }

  await page.goto('/chats')
  await expect(page.locator('body')).toContainText('แชท')
  const myChatsArchiveMenuButton = page.getByTestId(`my-chat-menu-${myChatsArchiveChatId}`)
  await expect(myChatsArchiveMenuButton).toBeVisible()
  await myChatsArchiveMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await expect(page.locator('[role="menu"] [role="menuitem"]')).toHaveText([
    'แก้ไขแชท',
    'ปักหมุดแชท',
    'จัดเก็บแชท',
    'เลือก',
    'ลบแชท',
  ])
  await expect(page.getByTestId(`my-chat-pin-${myChatsArchiveChatId}`)).toContainText('ปักหมุดแชท')
  await expect(page.getByTestId(`my-chat-rename-${myChatsArchiveChatId}`)).toContainText('แก้ไขแชท')
  await expect(page.getByTestId(`my-chat-archive-${myChatsArchiveChatId}`)).toContainText('จัดเก็บแชท')
  const myChatsRenamedTitle = `My Chats renamed ${isMobile ? 'mobile' : 'desktop'}`
  await page.getByTestId(`my-chat-pin-${myChatsArchiveChatId}`).click()
  await expect(page.locator('[role="menu"]')).toBeHidden()
  expect(
    await page.evaluate((id) => {
      const pinned = JSON.parse(window.localStorage.getItem('maprang:pinned-chats:v1') ?? '[]') as string[]
      return pinned.includes(id)
    }, myChatsArchiveChatId),
    'my chats menu should pin the selected chat using the shared pinned storage',
  ).toBe(true)

  await myChatsArchiveMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await expect(page.getByTestId(`my-chat-pin-${myChatsArchiveChatId}`)).toContainText('ถอนหมุดแชท')
  await page.getByTestId(`my-chat-pin-${myChatsArchiveChatId}`).click()
  await expect(page.locator('[role="menu"]')).toBeHidden()
  expect(
    await page.evaluate((id) => {
      const pinned = JSON.parse(window.localStorage.getItem('maprang:pinned-chats:v1') ?? '[]') as string[]
      return pinned.includes(id)
    }, myChatsArchiveChatId),
    'my chats menu should unpin the selected chat using the shared pinned storage',
  ).toBe(false)

  await myChatsArchiveMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.getByTestId(`my-chat-select-${myChatsArchiveChatId}`).click()
  await expect(page.getByTestId('my-chats-selection-toolbar')).toBeVisible()
  await expect(page.getByTestId(`my-chat-checkbox-${myChatsArchiveChatId}`)).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('my-chats-select-mode').click()
  await expect(page.getByTestId('my-chats-selection-toolbar')).toBeHidden()

  await myChatsArchiveMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.getByTestId(`my-chat-rename-${myChatsArchiveChatId}`).click()
  await expect(page.getByTestId('my-chat-rename-dialog')).toBeVisible()
  await page.getByTestId('my-chat-rename-input').fill(myChatsRenamedTitle)
  await page.getByTestId('my-chat-rename-confirm').click()
  await expect(page.getByTestId('my-chat-rename-dialog')).toBeHidden()
  await expect(page.locator('body')).toContainText(myChatsRenamedTitle)

  await myChatsArchiveMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.getByTestId(`my-chat-archive-${myChatsArchiveChatId}`).click()
  await expect(page.getByTestId(`my-chat-menu-${myChatsArchiveChatId}`)).toBeHidden()
  await page.getByTestId('my-chats-filter-archived').click()
  await expect(page.getByTestId(`my-chat-restore-button-${myChatsArchiveChatId}`)).toBeVisible()
  await page.getByTestId(`my-chat-restore-button-${myChatsArchiveChatId}`).click()
  await expect(page.getByTestId(`my-chat-restore-button-${myChatsArchiveChatId}`)).toBeHidden()
  await page.getByTestId('my-chats-filter-all').click()
  await expect(page.getByTestId(`my-chat-menu-${myChatsArchiveChatId}`)).toBeVisible()

  const myChatsDeleteMenuButton = page.getByTestId(`my-chat-menu-${myChatsDeleteChatId}`)
  await expect(myChatsDeleteMenuButton).toBeVisible()
  await myChatsDeleteMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.getByTestId(`my-chat-delete-${myChatsDeleteChatId}`).click()
  await expect(page.getByTestId('my-chat-delete-dialog')).toBeVisible()
  await page.getByTestId('my-chat-delete-confirm').click()
  await expect(page.getByTestId('my-chat-delete-dialog')).toBeHidden()
  await expect(page.getByTestId(`my-chat-menu-${myChatsDeleteChatId}`)).toBeHidden()

  await expect(page.getByTestId(`my-chat-menu-${myChatsBulkArchiveChatId}`)).toBeVisible()
  await page.getByTestId('my-chats-select-mode').click()
  await expect(page.getByTestId('my-chats-selection-toolbar')).toBeVisible()
  await page.getByTestId(`my-chat-checkbox-${myChatsBulkArchiveChatId}`).click()
  await expect(page.getByTestId(`my-chat-checkbox-${myChatsBulkArchiveChatId}`)).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('my-chats-bulk-archive').click()
  await expect(page.getByTestId('my-chats-selection-toolbar')).toBeHidden()
  await expect(page.getByTestId(`my-chat-menu-${myChatsBulkArchiveChatId}`)).toBeHidden()
  await page.getByTestId('my-chats-filter-archived').click()
  await expect(page.getByTestId(`my-chat-menu-${myChatsBulkArchiveChatId}`)).toBeVisible()
  await page.getByTestId('my-chats-select-mode').click()
  await expect(page.getByTestId('my-chats-selection-toolbar')).toBeVisible()
  await page.getByTestId(`my-chat-checkbox-${myChatsBulkArchiveChatId}`).click()
  await expect(page.getByTestId(`my-chat-checkbox-${myChatsBulkArchiveChatId}`)).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('my-chats-bulk-restore').click()
  await expect(page.getByTestId('my-chats-selection-toolbar')).toBeHidden()
  await expect(page.getByTestId(`my-chat-menu-${myChatsBulkArchiveChatId}`)).toBeHidden()
  await page.getByTestId('my-chats-filter-all').click()
  await expect(page.getByTestId(`my-chat-menu-${myChatsBulkArchiveChatId}`)).toBeVisible()

  await expect(page.getByTestId(`my-chat-menu-${myChatsBulkDeleteChatId}`)).toBeVisible()
  await page.getByTestId('my-chats-select-mode').click()
  await expect(page.getByTestId('my-chats-selection-toolbar')).toBeVisible()
  await page.getByTestId(`my-chat-checkbox-${myChatsBulkDeleteChatId}`).click()
  await expect(page.getByTestId(`my-chat-checkbox-${myChatsBulkDeleteChatId}`)).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('my-chats-bulk-delete').click()
  await expect(page.getByTestId('my-chats-bulk-delete-dialog')).toBeVisible()
  await page.getByTestId('my-chats-bulk-delete-confirm').click()
  await expect(page.getByTestId('my-chats-bulk-delete-dialog')).toBeHidden()
  await expect(page.getByTestId(`my-chat-menu-${myChatsBulkDeleteChatId}`)).toBeHidden()

  await page.goto(`/chat/${seededChatId}`)
  await expect(page.getByTestId('chat-composer-input')).toBeVisible()
  await expect(page.getByTestId('chat-character-stage')).toHaveCount(0)

  if (isMobile) {
    await page.getByTestId('chat-mobile-menu').click()
  }

  const menuButton = page.locator(`[data-testid="chat-row-menu-${seededChatId}"]`)
  await expect(menuButton).toBeVisible()
  await menuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await expect(page.locator('[role="menu"] [role="menuitem"]')).toHaveCount(5)
  await expect(page.locator('[role="menu"] [role="menuitem"]')).toHaveText([
    'แก้ไขแชท',
    'ปักหมุดแชท',
    'จัดเก็บแชท',
    'เลือก',
    'ลบแชท',
  ])
  await expect(page.getByTestId(`chat-row-rename-${seededChatId}`)).toContainText('แก้ไขแชท')
  await expect(page.getByTestId(`chat-row-pin-${seededChatId}`)).toContainText('ปักหมุดแชท')
  await expect(page.getByTestId(`chat-row-archive-${seededChatId}`)).toContainText('จัดเก็บแชท')
  await expect(page.getByTestId(`chat-row-pin-${seededChatId}`)).toBeVisible()
  await page.getByTestId(`chat-row-pin-${seededChatId}`).click()
  await expect(page.locator('[role="menu"]')).toBeHidden()
  expect(
    await page.evaluate((id) => {
      const pinned = JSON.parse(window.localStorage.getItem('maprang:pinned-chats:v1') ?? '[]') as string[]
      return pinned.includes(id)
    }, seededChatId),
    'sidebar menu should pin the selected chat',
  ).toBe(true)

  await menuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await expect(page.getByTestId(`chat-row-pin-${seededChatId}`)).toBeVisible()
  await expect(page.getByTestId(`chat-row-pin-${seededChatId}`)).toContainText('ถอนหมุดแชท')
  await page.getByTestId(`chat-row-pin-${seededChatId}`).click()
  await expect(page.locator('[role="menu"]')).toBeHidden()
  expect(
    await page.evaluate((id) => {
      const pinned = JSON.parse(window.localStorage.getItem('maprang:pinned-chats:v1') ?? '[]') as string[]
      return pinned.includes(id)
    }, seededChatId),
    'sidebar menu should unpin the selected chat',
  ).toBe(false)

  await menuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="menu"]')).toBeHidden()

  await menuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.getByTestId(`chat-row-select-${seededChatId}`).click()
  await expect(page.getByTestId('chat-selection-toolbar')).toBeVisible()
  await expect(page.getByTestId(`chat-row-checkbox-${seededChatId}`)).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('chat-selection-cancel').click()
  await expect(page.getByTestId('chat-selection-toolbar')).toBeHidden()

  await page.goto(`/chat/${menuArchiveChatId}`)
  await expect(page.getByTestId('chat-composer-input')).toBeVisible()
  if (isMobile) {
    await page.getByTestId('chat-mobile-menu').click()
  }
  const archiveMenuButton = page.locator(`[data-testid="chat-row-menu-${menuArchiveChatId}"]`)
  await expect(archiveMenuButton).toBeVisible()
  await archiveMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  const renamedTitle = `QA menu renamed ${isMobile ? 'mobile' : 'desktop'}`
  await page.getByTestId(`chat-row-rename-${menuArchiveChatId}`).click()
  await expect(page.getByTestId('chat-rename-dialog')).toBeVisible()
  await page.getByTestId('chat-rename-input').fill(renamedTitle)
  await page.getByTestId('chat-rename-confirm').click()
  await expect(page.getByTestId('chat-rename-dialog')).toBeHidden()
  await expect(page.locator('body')).toContainText(renamedTitle)

  await archiveMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.getByTestId(`chat-row-archive-${menuArchiveChatId}`).click()
  await expect(page.getByTestId(`chat-row-menu-${menuArchiveChatId}`)).toBeHidden()

  await page.goto(`/chat/${menuDeleteChatId}`)
  await expect(page.getByTestId('chat-composer-input')).toBeVisible()
  if (isMobile) {
    await page.getByTestId('chat-mobile-menu').click()
  }
  const deleteMenuButton = page.locator(`[data-testid="chat-row-menu-${menuDeleteChatId}"]`)
  await expect(deleteMenuButton).toBeVisible()
  await deleteMenuButton.click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await page.getByTestId(`chat-row-delete-${menuDeleteChatId}`).click()
  await expect(page.getByTestId('chat-delete-dialog')).toBeVisible()
  await page.getByTestId('chat-delete-confirm').click()
  await expect(page.getByTestId('chat-delete-dialog')).toBeHidden()
  await expect(page.getByTestId(`chat-row-menu-${menuDeleteChatId}`)).toBeHidden()

  await page.goto(`/chat/${seededChatId}`)
  await expect(page.getByTestId('chat-composer-input')).toBeVisible()
  if (isMobile) {
    await page.getByTestId('chat-mobile-menu').click()
  }

  if (isMobile) {
    await page.getByTestId('chat-sidebar-overlay').click({ position: { x: 320, y: 140 } })
    await expect(page.getByTestId('chat-sidebar-overlay')).toHaveClass(/pointer-events-none/)
  }

  await page.getByTestId('chat-read-mode').click()
  await expect(page.getByTestId('chat-read-mode')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('body')).toContainText('โหมดอ่านเปิดอยู่')
  await page.getByTestId('chat-read-mode').click()
  await expect(page.getByTestId('chat-read-mode')).toHaveAttribute('aria-pressed', 'false')

  if (!isMobile) {
    await page.getByTestId('chat-right-panel-world').click()
    await expect(page.getByTestId('chat-world-state-panel')).toBeVisible()
    await page.getByTestId('chat-world-state-time').fill('e2e late night')
    await page.getByTestId('chat-world-state-location').fill('e2e rooftop')
    await page.getByTestId('chat-world-state-weather').fill('e2e soft rain')
    await page.getByTestId('chat-world-state-mood').fill('e2e careful tension')
    await page.getByTestId('chat-world-state-notes').fill('Keep this location stable during QA')
    await page.getByTestId('chat-world-state-save').click()
    await expect(page.getByTestId('chat-world-state-save')).toBeEnabled()
    await page.reload()
    await page.getByTestId('chat-right-panel-world').click()
    await expect(page.getByTestId('chat-world-state-location')).toHaveValue('e2e rooftop')
    await expect(page.getByTestId('chat-world-state-notes')).toHaveValue('Keep this location stable during QA')
  }

  await page.getByTestId('chat-report-character').click()
  await expect(page.getByTestId('report-dialog')).toBeVisible()
  await expect(page.getByTestId('report-submit')).toBeEnabled()
  await page.getByTestId('report-cancel').click()
  await expect(page.getByTestId('report-dialog')).toBeHidden()

  await page.goto('/profile')
  await expect(page.getByTestId('profile-persona-textarea')).toBeVisible()
  await page.getByTestId('profile-persona-clear').click()
  await expect(page.getByTestId('profile-persona-textarea')).toHaveValue('')
  await page.getByTestId('profile-persona-template').click()
  expect((await page.getByTestId('profile-persona-textarea').inputValue()).trim().length).toBeGreaterThan(10)
  await expect(page.getByTestId('profile-persona-count')).toBeVisible()
  await page.getByTestId('profile-content-mode-teen_romance').click()
  await expect(page.getByTestId('profile-content-mode-teen_romance')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('profile-content-note')).toBeVisible()
  await page.getByTestId('profile-content-mode-restricted_18').click()
  await expect(page.getByTestId('profile-content-mode-restricted_18')).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/wallet')
  await expect(page.locator('body')).toContainText('โทเคน')
  await expect(page.locator('body')).toContainText('ธุรกรรม')
  await expect(page.getByTestId('wallet-cost-by-model')).toContainText('ต้นทุนแยกตามโมเดล')
  await expect(page.getByTestId('wallet-usage-trend')).toContainText('การใช้ 7 วันล่าสุด')

  await expect(page.getByTestId('wallet-refresh')).toBeVisible()
  await page.getByTestId('wallet-refresh').click()
  await expect(page.getByTestId('wallet-note')).toBeVisible()
  await page.getByTestId('wallet-admin-key-input').fill('temporary-smoke-admin-key')
  await page.getByTestId('wallet-admin-key-save').click()
  expect(await page.evaluate(() => window.localStorage.getItem('maprang:adminKey'))).toBe('temporary-smoke-admin-key')
  await page.getByTestId('wallet-admin-key-clear').click()
  await expect(page.getByTestId('wallet-admin-key-input')).toHaveValue('')
  expect(await page.evaluate(() => window.localStorage.getItem('maprang:adminKey'))).toBeNull()
  await expect(page.getByTestId('wallet-adjust-add')).toBeDisabled()
  await expect(page.getByTestId('wallet-adjust-debit')).toBeDisabled()
  if (adminKey) {
    await page.getByTestId('wallet-admin-key-input').fill(adminKey)
    await page.getByTestId('wallet-admin-key-save').click()
  }

  await page.goto('/moderation')
  await expect(page.locator('body')).toContainText('คิวรายงาน')
  if (adminKey) {
    await expect(page.locator('body')).toContainText('policy_review')
    await expect(page.locator('body')).toContainText('PhetQA')
  } else {
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  }

  await page.goto('/events')
  await expect(page.getByTestId('events-scene-list')).toBeVisible()
  expect(await page.getByTestId('events-scene-group').count()).toBeGreaterThan(0)
  expect(await page.getByTestId('events-scene-row').count()).toBeGreaterThan(0)

  await page.goto('/admin/health')
  await expect(page.locator('body')).toContainText('สรุปด่านค้างก่อนโปรดักชัน')
  await expect(page.locator('body')).toContainText('ลำดับงานก่อนปล่อยจริง')
  await expect(page.locator('body')).toContainText('bun run staging:verify + bun run e2e:smoke')
  await expect(page.locator('body')).toContainText('bun run api:smoke:live')
  await expect(page.locator('body')).toContainText('bun run production:check')
  await expect(page.locator('body')).toContainText('เช็กลิสต์ deploy')
  await expect(page.locator('body')).toContainText('Runtime แชท')
  if (expectsLocalChatRuntime) {
    await expect(page.locator('body')).toContainText('local mock พร้อมเล่น')
    await expect(page.locator('body')).toContainText('แชท local สำหรับ QA')
    await expect(page.locator('body')).toContainText('local/mock-roleplay')
  }
  await expect(page.locator('body')).toContainText('ตรวจเส้นทาง/เมนู')
  await expect(page.locator('body')).toContainText('แถบแชท')

  await page.goto('/admin/prompt-inspector')
  await expect(page.locator('body')).toContainText('ตรวจพรอมป์ก่อนยิงโมเดล')
  if (adminKey) {
    await expect(page.getByTestId('prompt-inspector-character-select')).toBeEnabled()
    await page.getByTestId('prompt-inspector-message').fill('ช่วยตรวจว่าพรอมป์ยังคุมบุคลิกและตอบยาวพอไหม')
    await expect(page.getByTestId('prompt-inspector-submit')).toBeEnabled()
    await page.getByTestId('prompt-inspector-submit').click()
    await expect(page.getByTestId('prompt-inspector-output')).toContainText('กฎคุมพรอมป์ของแพลตฟอร์ม')
    await expect(page.getByTestId('prompt-inspector-diff')).toBeVisible()
  } else {
    await expect(page.getByTestId('prompt-inspector-admin-key-input')).toBeVisible()
  }

  await page.goto('/admin/evals')
  await expect(page.locator('body')).toContainText('ทดสอบคุณภาพพรอมป์และบริบท')
  if (adminKey) {
    await expect(page.getByTestId('admin-evals-output')).toContainText('maprang-golden-roleplay')
    await expect(page.getByTestId('admin-evals-run')).toBeEnabled()
    await page.getByTestId('admin-evals-run').click()
    await expect(page.getByTestId('admin-evals-output')).toContainText('maprang-golden-roleplay')
    await expect(page.getByTestId('admin-evals-scenario')).toHaveCount(3)
  } else {
    await expect(page.getByTestId('admin-evals-admin-key-input')).toBeVisible()
  }
})

test('all primary routes render without console errors or horizontal overflow', async ({ page, request }) => {
  await expectBackendRootIdentity(request, 'ตรวจ route audit')
  const health = await request.get(`${backendUrl}/health`)
  expect(health.ok(), 'ระบบหลังบ้าน /health ต้องเรียกได้ก่อนตรวจ route audit').toBeTruthy()

  const browserErrors = collectBrowserErrors(page)

  for (const target of routeSmokeTargets) {
    await page.goto(target.path)
    if (target.path === '/create') {
      await ensureCreatorFormOpen(page)
    }
    if ('testId' in target && target.testId) {
      await expect(page.getByTestId(target.testId), `${target.path} ต้องแสดง ${target.testId}`).toBeVisible()
    } else {
      await expect(page.locator('body'), `${target.path} ต้องแสดงข้อความที่คาดไว้`).toContainText(target.text)
    }
    await expectNoHorizontalOverflow(page)
  }

  expect(browserErrors, 'route ไม่ควรมี browser console/page error').toEqual([])
})
