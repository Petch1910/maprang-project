import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  Bell,
  Coins,
  Compass,
  MessageCircle,
  PlusCircle,
  SearchX,
  UserRound,
  Menu,
  X,
} from 'lucide-react'
import { AgeGate } from './components/AgeGate'
import { ToastContainer } from './components/Toast'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { loadChatSummaries, selectPendingSceneCount } from './store/slices/chatsSlice'
import { loadContentSettings } from './store/slices/contentSlice'
import { loadWalletSummary, selectTokenBalance, selectWalletLoading } from './store/slices/walletSlice'
import { loadPersonaDraft } from './store/slices/draftsSlice'

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

const primaryNavItems = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
]

const routePreloads: Record<string, () => Promise<unknown>> = {
  '/': loadExplorePage,
  '/chats': loadMyChatsPage,
  '/create': loadCreatorStudioPage,
  '/profile': loadProfilePage,
  '/wallet': loadWalletPage,
  '/events': loadEventsInboxPage,
  '/ai-creator': loadAICreatorPage,
  '/moderation': loadAdminModerationPage,
  '/admin/health': loadAdminHealthPage,
  '/admin/prompt-inspector': loadAdminPromptInspectorPage,
  '/admin/evals': loadAdminEvalsPage,
}

function NotFoundPage() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-6 text-white"
      data-testid="not-found-page"
    >
      <section className="text-center">
        <SearchX className="mx-auto h-20 w-20 text-purple-400" />
        <h1 className="mt-6 text-4xl font-black">ไม่พบหน้านี้</h1>
        <p className="mt-2 text-lg text-slate-400">ขออภัย เราไม่พบหน้าที่คุณค้นหา</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <NavLink
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-purple-600 px-6 text-sm font-black text-white transition hover:bg-purple-500"
            to="/"
          >
            ไปหน้าหลัก
          </NavLink>
          <NavLink
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 px-6 text-sm font-black text-slate-300 transition hover:bg-slate-700/50"
            to="/create"
          >
            สร้างตัวละคร
          </NavLink>
        </div>
      </section>
    </main>
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

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false)
  }, [location.pathname])

  const appRoutes = (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#080A1A]">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#a855f7] border-t-transparent" />
            <p className="mt-4 text-slate-400">กำลังโหลด...</p>
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
      <div className="min-h-screen bg-[#111113] text-white">
        <AgeGate />
        {appRoutes}
        <ToastContainer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080A1A] text-white">
      <AgeGate />

      {/* Modern Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#2e2e44] bg-[#1e1e34]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
                <span className="text-xl font-black">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-black">MAPRANG</span>
                <p className="text-xs text-slate-400">AI Roleplay</p>
              </div>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {primaryNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onMouseEnter={() => preloadRoute(item.to)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-[#a855f7] text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]'
                        : 'text-slate-400 hover:bg-[#2e2e44] hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Wallet */}
              <NavLink
                to="/wallet"
                className="flex items-center gap-2 rounded-full bg-yellow-600/20 border border-yellow-500/30 px-4 py-2 text-sm font-bold text-yellow-400 transition hover:bg-yellow-600/30"
              >
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">โทเคน</span>
                <span>{isWalletLoading ? '...' : tokenBalance.toLocaleString()}</span>
              </NavLink>

              {/* Events (with badge) */}
              <NavLink
                to="/events"
                className="relative rounded-lg p-2 text-slate-400 transition hover:bg-[#2e2e44] hover:text-white"
                title="อีเวนต์"
              >
                <Bell className="h-5 w-5" />
                {eventCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {eventCount}
                  </span>
                )}
              </NavLink>

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden rounded-lg p-2 text-slate-400 transition hover:bg-[#2e2e44] hover:text-white"
                aria-label="เมนู"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="border-t border-[#2e2e44] bg-[#1e1e34]/98 backdrop-blur-xl md:hidden">
            <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1">
              {primaryNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-[#a855f7] text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]'
                        : 'text-slate-400 hover:bg-[#2e2e44] hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)] pb-20 md:pb-0">{appRoutes}</main>

      {/* Bottom Tab Navigation (Mobile Only) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2e2e44] bg-[#1e1e34]/98 backdrop-blur-xl md:hidden"
        data-testid="app-mobile-nav"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              data-testid={`app-mobile-nav-${item.to === '/' ? 'home' : item.to.slice(1)}`}
              onTouchStart={() => preloadRoute(item.to)}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isActive ? 'text-[#a855f7]' : 'text-slate-500'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

export default App
