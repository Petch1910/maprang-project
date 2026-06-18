import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Bell, Coins, Menu, SearchX, X } from 'lucide-react'
import { AgeGate } from './components/AgeGate'
import { ToastContainer } from './components/Toast'
import { missAiMobileNav, missAiNavSections, type MissAiNavItem } from './lib/missaiNavigation'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { loadChatSummaries, selectPendingSceneCount } from './store/slices/chatsSlice'
import { loadContentSettings } from './store/slices/contentSlice'
import { loadPersonaDraft } from './store/slices/draftsSlice'
import { loadWalletSummary, selectTokenBalance, selectWalletLoading } from './store/slices/walletSlice'

const loadCreatorStudioPage = () => import('./pages/CreatorStudioPage').then((module) => ({ default: module.CreatorStudioPage }))
const loadChatRoomPage = () => import('./pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage }))
const loadEventsInboxPage = () => import('./pages/EventsInboxPage').then((module) => ({ default: module.EventsInboxPage }))
const loadMyChatsPage = () => import('./pages/MyChatsPage').then((module) => ({ default: module.MyChatsPage }))
const loadAdminModerationPage = () => import('./pages/AdminModerationPage').then((module) => ({ default: module.AdminModerationPage }))
const loadAdminHealthPage = () => import('./pages/AdminHealthPage').then((module) => ({ default: module.AdminHealthPage }))
const loadAdminPromptInspectorPage = () =>
  import('./pages/AdminPromptInspectorPage').then((module) => ({ default: module.AdminPromptInspectorPage }))
const loadAdminEvalsPage = () => import('./pages/AdminEvalsPage').then((module) => ({ default: module.AdminEvalsPage }))
const loadCharacterLobbyPage = () => import('./pages/CharacterLobbyPage').then((module) => ({ default: module.CharacterLobbyPage }))
const loadExplorePage = () => import('./pages/ExplorePage').then((module) => ({ default: module.ExplorePage }))
const loadProfilePage = () => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage }))
const loadWalletPage = () => import('./pages/WalletPage').then((module) => ({ default: module.WalletPage }))
const loadAICreatorPage = () => import('./pages/AICreatorPage').then((module) => ({ default: module.AICreatorPage }))
const loadAnnouncementsPage = () => import('./pages/AnnouncementsPage').then((module) => ({ default: module.AnnouncementsPage }))
const loadCreatorsPage = () => import('./pages/CreatorsPage').then((module) => ({ default: module.CreatorsPage }))
const loadFavoritesPage = () => import('./pages/FavoritesPage').then((module) => ({ default: module.FavoritesPage }))
const loadWorksPage = () => import('./pages/WorksPage').then((module) => ({ default: module.WorksPage }))
const loadSupportPage = () => import('./pages/SupportPage').then((module) => ({ default: module.SupportPage }))

const CreatorStudioPage = lazy(loadCreatorStudioPage)
const ChatRoomPage = lazy(loadChatRoomPage)
const EventsInboxPage = lazy(loadEventsInboxPage)
const MyChatsPage = lazy(loadMyChatsPage)
const AdminModerationPage = lazy(loadAdminModerationPage)
const AdminHealthPage = lazy(loadAdminHealthPage)
const AdminPromptInspectorPage = lazy(loadAdminPromptInspectorPage)
const AdminEvalsPage = lazy(loadAdminEvalsPage)
const CharacterLobbyPage = lazy(loadCharacterLobbyPage)
const ExplorePage = lazy(loadExplorePage)
const ProfilePage = lazy(loadProfilePage)
const WalletPage = lazy(loadWalletPage)
const AICreatorPage = lazy(loadAICreatorPage)
const AnnouncementsPage = lazy(loadAnnouncementsPage)
const CreatorsPage = lazy(loadCreatorsPage)
const FavoritesPage = lazy(loadFavoritesPage)
const WorksPage = lazy(loadWorksPage)
const SupportPage = lazy(loadSupportPage)

const routePreloads: Record<string, () => Promise<unknown>> = {
  '/': loadExplorePage,
  '/wallet': loadWalletPage,
  '/create': loadCreatorStudioPage,
  '/works': loadWorksPage,
  '/ai-creator': loadAICreatorPage,
  '/announcements': loadAnnouncementsPage,
  '/creators': loadCreatorsPage,
  '/support': loadSupportPage,
  '/chats': loadMyChatsPage,
  '/events': loadEventsInboxPage,
  '/favorites': loadFavoritesPage,
  '/profile': loadProfilePage,
  '/moderation': loadAdminModerationPage,
  '/admin/health': loadAdminHealthPage,
  '/admin/prompt-inspector': loadAdminPromptInspectorPage,
  '/admin/evals': loadAdminEvalsPage,
}

function NotFoundPage() {
  return (
    <main className="missai-page grid min-h-screen place-items-center px-6 text-white" data-testid="not-found-page">
      <section className="text-center">
        <SearchX className="mx-auto h-20 w-20 text-purple-400" />
        <h1 className="mt-6 text-4xl font-black">Page not found</h1>
        <p className="mt-2 text-lg text-slate-400">This route is not available in the current Maprang local server.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <NavLink className="missai-button-primary min-h-11 px-6 text-sm" to="/">
            Back to Explore
          </NavLink>
          <NavLink className="missai-button-secondary min-h-11 px-6 text-sm" to="/create">
            Creation
          </NavLink>
        </div>
      </section>
    </main>
  )
}

function AppNavItem({
  item,
  preloadRoute,
  eventCount,
}: {
  item: MissAiNavItem
  preloadRoute: (path: string) => void
  eventCount: number
}) {
  const Icon = item.icon
  const to = item.to
  const badge = to === '/events' && eventCount > 0 ? String(eventCount) : item.badge

  if (!to) {
    return (
      <button
        className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-sm font-black text-white/35"
        title={item.disabledReason}
        type="button"
      >
        <Icon className="size-5" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <NavLink
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black transition ${
          isActive
            ? 'border border-[#ac4bff]/45 bg-[#ac4bff]/18 text-[#d9b3ff] shadow-[inset_3px_0_0_#ac4bff]'
            : 'text-slate-400 hover:bg-white/6 hover:text-white'
        }`
      }
      end={to === '/'}
      onMouseEnter={() => preloadRoute(to)}
      to={to}
    >
      <Icon className="size-5" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge && <span className="rounded-full bg-[#f99c00] px-1.5 py-0.5 text-[10px] font-black text-[#1a1206]">{badge}</span>}
    </NavLink>
  )
}

function MissAiSidebar({
  eventCount,
  preloadRoute,
  tokenBalance,
}: {
  eventCount: number
  preloadRoute: (path: string) => void
  tokenBalance: number
}) {
  return (
    <aside className="hidden h-svh w-[206px] shrink-0 flex-col border-r border-white/10 bg-[#0a0c1f]/95 p-3 text-white md:flex">
      <NavLink className="mb-5 flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center" to="/">
        <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#ac4bff] to-[#34d5ff] text-2xl font-black shadow-[0_0_28px_rgba(172,75,255,0.35)]">
          M
        </div>
        <div>
          <p className="font-display m-0 text-lg font-black tracking-[0.22em] text-[#d9b3ff]">Maprang</p>
          <p className="m-0 text-[11px] font-bold text-white/45">MissAI style local server</p>
        </div>
      </NavLink>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {missAiNavSections.map((section, sectionIndex) => (
          <section className="space-y-1" key={section.label ?? sectionIndex}>
            {section.label && <p className="m-0 px-3 pt-2 text-[11px] font-black tracking-wide text-white/35">{section.label}</p>}
            {section.items.map((item) => (
              <AppNavItem eventCount={eventCount} item={item} key={item.label} preloadRoute={preloadRoute} />
            ))}
          </section>
        ))}
      </nav>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
        <NavLink
          className="flex min-h-10 items-center gap-2 rounded-xl border border-[#f99c00]/25 bg-[#f99c00]/10 px-3 text-sm font-black text-[#f9c86d]"
          to="/wallet"
        >
          <Coins className="size-4" />
          <span className="min-w-0 flex-1 truncate">{tokenBalance.toLocaleString()} coins</span>
        </NavLink>
        <div className="grid grid-cols-2 gap-2 text-xs font-black">
          <button className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-white/65" type="button">
            English
          </button>
          <button className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[#f9c86d]" type="button">
            Dark
          </button>
        </div>
      </div>
    </aside>
  )
}

function App() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isWalletLoading = useAppSelector(selectWalletLoading)
  const eventCount = useAppSelector(selectPendingSceneCount)
  const didBootstrap = useRef(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    if (didBootstrap.current) return
    didBootstrap.current = true
    dispatch(loadContentSettings())
    dispatch(loadWalletSummary())
    dispatch(loadChatSummaries())
    dispatch(loadPersonaDraft())
  }, [dispatch])

  useEffect(() => {
    setShowMobileMenu(false)
  }, [location.pathname])

  const appRoutes = (
    <Suspense
      fallback={
        <div className="missai-page grid min-h-screen place-items-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#a855f7] border-t-transparent" />
            <p className="mt-4 text-slate-400">Loading...</p>
          </div>
        </div>
      }
    >
      <Routes>
        <Route element={<ExplorePage />} path="/" />
        <Route element={<MyChatsPage />} path="/chats" />
        <Route element={<ChatRoomPage />} path="/chat" />
        <Route element={<ChatRoomPage />} path="/chat/:chatId" />
        <Route element={<CreatorStudioPage />} path="/create" />
        <Route element={<ProfilePage />} path="/profile" />
        <Route element={<WalletPage />} path="/wallet" />
        <Route element={<EventsInboxPage />} path="/events" />
        <Route element={<AICreatorPage />} path="/ai-creator" />
        <Route element={<CharacterLobbyPage />} path="/characters/:id" />
        <Route element={<AdminModerationPage />} path="/moderation" />
        <Route element={<AdminHealthPage />} path="/admin/health" />
        <Route element={<AdminPromptInspectorPage />} path="/admin/prompt-inspector" />
        <Route element={<AdminEvalsPage />} path="/admin/evals" />
        <Route element={<AnnouncementsPage />} path="/announcements" />
        <Route element={<CreatorsPage />} path="/creators" />
        <Route element={<FavoritesPage />} path="/favorites" />
        <Route element={<WorksPage />} path="/works" />
        <Route element={<SupportPage />} path="/support" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </Suspense>
  )

  const preloadRoute = (path: string) => {
    const loader = routePreloads[path]
    if (loader) loader().catch(() => {})
  }
  const isImmersiveRoute = location.pathname === '/' || location.pathname.startsWith('/chat')

  if (isImmersiveRoute) {
    return (
      <div className="min-h-screen bg-[var(--color-page)] text-white">
        <AgeGate />
        {appRoutes}
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className="missai-page min-h-screen text-white">
      <AgeGate />
      <div className="flex min-h-screen">
        <MissAiSidebar eventCount={eventCount} preloadRoute={preloadRoute} tokenBalance={tokenBalance} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080a1a]/88 px-3 py-2 backdrop-blur-xl md:hidden">
            <div className="flex min-h-12 items-center gap-2">
              <NavLink className="flex min-w-0 flex-1 items-center gap-2" to="/">
                <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#34d5ff] font-black">M</span>
                <span className="min-w-0 truncate font-display text-base font-black tracking-wide">Maprang</span>
              </NavLink>
              <NavLink className="flex items-center gap-1 rounded-full bg-[#f99c00]/14 px-3 py-2 text-xs font-black text-[#f9c86d]" to="/wallet">
                <Coins className="size-4" />
                {isWalletLoading ? '...' : tokenBalance.toLocaleString()}
              </NavLink>
              <NavLink className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-white/65" to="/events">
                <Bell className="size-5" />
                {eventCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1 text-[10px] font-black">{eventCount}</span>}
              </NavLink>
              <button
                aria-label="Open menu"
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/65"
                onClick={() => setShowMobileMenu((current) => !current)}
                type="button"
              >
                {showMobileMenu ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
            {showMobileMenu && (
              <nav className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto border-t border-white/10 pt-3">
                {missAiNavSections.flatMap((section) => section.items).map((item) => (
                  <AppNavItem eventCount={eventCount} item={item} key={item.label} preloadRoute={preloadRoute} />
                ))}
              </nav>
            )}
          </header>

          <main className="min-h-screen pb-20 md:pb-0">{appRoutes}</main>
        </div>
      </div>

      <nav className="missai-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 md:hidden" data-testid="app-mobile-nav">
        {missAiMobileNav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black transition ${
                  isActive ? 'bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-white missai-glow' : 'text-white/45'
                }`
              }
              data-testid={`app-mobile-nav-${item.to === '/' ? 'home' : item.to?.slice(1)}`}
              end={item.to === '/'}
              key={item.label}
              onTouchStart={() => item.to && preloadRoute(item.to)}
              to={item.to ?? '/'}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <ToastContainer />
    </div>
  )
}

export default App
