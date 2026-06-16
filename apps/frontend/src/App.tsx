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
  Trophy,
  Heart,
  Folder,
  HelpCircle,
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

const primaryNavItems = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
]

const desktopNavItems = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/favorites', label: 'รายการโปรด', icon: Heart },
  { to: '/works', label: 'ผลงาน', icon: Folder },
  { to: '/creators', label: 'ผู้สร้าง', icon: Trophy },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
]

const mobileDropdownNavItems = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/favorites', label: 'รายการโปรด', icon: Heart },
  { to: '/works', label: 'ผลงานของฉัน', icon: Folder },
  { to: '/creators', label: 'อันดับนักสร้าง', icon: Trophy },
  { to: '/announcements', label: 'ประกาศข่าวสาร', icon: Bell },
  { to: '/support', label: 'ติดต่อช่วยเหลือ', icon: HelpCircle },
  { to: '/profile', label: 'โปรไฟล์ & ตั้งค่า', icon: UserRound },
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
  '/announcements': loadAnnouncementsPage,
  '/creators': loadCreatorsPage,
  '/favorites': loadFavoritesPage,
  '/works': loadWorksPage,
  '/support': loadSupportPage,
}

function NotFoundPage() {
  return (
    <main
      className="missai-page grid min-h-screen place-items-center px-6 text-white"
      data-testid="not-found-page"
    >
      <section className="text-center">
        <SearchX className="mx-auto h-20 w-20 text-purple-400" />
        <h1 className="mt-6 text-4xl font-black">ไม่พบหน้านี้</h1>
        <p className="mt-2 text-lg text-slate-400">ขออภัย เราไม่พบหน้าที่คุณค้นหา</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <NavLink
            className="missai-button-primary min-h-11 px-6 text-sm"
            to="/"
          >
            ไปหน้าหลัก
          </NavLink>
          <NavLink
            className="missai-button-secondary min-h-11 px-6 text-sm"
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
          <div className="missai-page grid min-h-screen place-items-center">
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

      {/* Modern Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[rgba(8,10,26,0.82)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] missai-glow">
                <span className="text-xl font-black">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-display text-lg font-black tracking-wide">MAPRANG</span>
                <p className="text-xs text-[var(--color-text-muted)]">AI Roleplay</p>
              </div>
            </NavLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {desktopNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onMouseEnter={() => preloadRoute(item.to)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                      isActive
                        ? 'bg-gradient-to-r from-[var(--color-accent-purple)] to-[#8b5cf6] text-white missai-glow'
                        : 'text-[var(--color-text-muted)] hover:border-white/10 hover:bg-white/5 hover:text-white'
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
                className="flex items-center gap-2 rounded-full border border-[#f99c00]/30 bg-[#f99c00]/10 px-4 py-2 text-sm font-black text-[#f9c86d] transition hover:brightness-110"
              >
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">โทเคน</span>
                <span>{isWalletLoading ? '...' : tokenBalance.toLocaleString()}</span>
              </NavLink>

              {/* Events (with badge) */}
              <NavLink
                to="/events"
                className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-[var(--color-text-muted)] transition hover:border-[var(--color-accent-purple)]/40 hover:text-white"
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
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-[var(--color-text-muted)] transition hover:border-[var(--color-accent-purple)]/40 hover:text-white md:hidden"
                aria-label="เมนู"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="border-t border-[var(--color-border)] bg-[rgba(12,13,22,0.96)] backdrop-blur-xl md:hidden">
            <nav className="mx-auto max-w-7xl px-4 py-4 space-y-1">
              {mobileDropdownNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition ${
                      isActive
                        ? 'bg-gradient-to-r from-[var(--color-accent-purple)] to-[#8b5cf6] text-white missai-glow'
                        : 'text-[var(--color-text-muted)] hover:border-white/10 hover:bg-white/5 hover:text-white'
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
        className="missai-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 md:hidden"
        data-testid="app-mobile-nav"
      >
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            data-testid={`app-mobile-nav-${item.to === '/' ? 'home' : item.to.slice(1)}`}
            onTouchStart={() => preloadRoute(item.to)}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-black transition ${
                isActive
                  ? 'bg-gradient-to-br from-[var(--color-accent-purple)] to-[#8b5cf6] text-white missai-glow'
                  : 'text-[var(--color-text-muted)]'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

export default App
