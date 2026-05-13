import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import {
  Activity,
  Bell,
  Coins,
  Compass,
  FileSearch,
  MessageCircle,
  Moon,
  PlusCircle,
  SearchX,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react'
import { AgeGate } from './components/AgeGate'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { loadChatSummaries, selectPendingSceneCount } from './store/slices/chatsSlice'
import { loadContentSettings } from './store/slices/contentSlice'
import { loadWalletSummary, selectTokenBalance, selectWalletLoading } from './store/slices/walletSlice'
import { loadPersonaDraft } from './store/slices/draftsSlice'

const loadCreatorStudioPage = () => import('./pages/CreatorStudioPage').then((module) => ({ default: module.CreatorStudioPage }))
const loadChatRoomPage = () => import('./pages/ChatRoomPage').then((module) => ({ default: module.ChatRoomPage }))
const loadEventsInboxPage = () => import('./pages/EventsInboxPage').then((module) => ({ default: module.EventsInboxPage }))
const loadMyChatsPage = () => import('./pages/MyChatsPage').then((module) => ({ default: module.MyChatsPage }))
const loadAdminModerationPage = () => import('./pages/AdminModerationPage').then((module) => ({ default: module.AdminModerationPage }))
const loadAdminHealthPage = () => import('./pages/AdminHealthPage').then((module) => ({ default: module.AdminHealthPage }))
const loadAdminPromptInspectorPage = () =>
  import('./pages/AdminPromptInspectorPage').then((module) => ({ default: module.AdminPromptInspectorPage }))
const loadCharacterLobbyPage = () => import('./pages/CharacterLobbyPage').then((module) => ({ default: module.CharacterLobbyPage }))
const loadExplorePage = () => import('./pages/ExplorePage').then((module) => ({ default: module.ExplorePage }))
const loadProfilePage = () => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage }))
const loadWalletPage = () => import('./pages/WalletPage').then((module) => ({ default: module.WalletPage }))

const CreatorStudioPage = lazy(loadCreatorStudioPage)
const ChatRoomPage = lazy(loadChatRoomPage)
const EventsInboxPage = lazy(loadEventsInboxPage)
const MyChatsPage = lazy(loadMyChatsPage)
const AdminModerationPage = lazy(loadAdminModerationPage)
const AdminHealthPage = lazy(loadAdminHealthPage)
const AdminPromptInspectorPage = lazy(loadAdminPromptInspectorPage)
const CharacterLobbyPage = lazy(loadCharacterLobbyPage)
const ExplorePage = lazy(loadExplorePage)
const ProfilePage = lazy(loadProfilePage)
const WalletPage = lazy(loadWalletPage)

const primaryNavItems = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/events', label: 'อีเวนต์', icon: Bell },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
]

const adminNavItems = [
  { to: '/moderation', label: 'ดูแลรายงาน', icon: ShieldCheck },
  { to: '/admin/health', label: 'ตรวจระบบ', icon: Activity },
  { to: '/admin/prompt-inspector', label: 'ตรวจพรอมป์', icon: FileSearch },
]
const utilityNavItems = [{ to: '/wallet', label: 'กระเป๋าโทเคน', icon: Coins }]

const routePreloads: Record<string, () => Promise<unknown>> = {
  '/': loadExplorePage,
  '/admin/health': loadAdminHealthPage,
  '/admin/prompt-inspector': loadAdminPromptInspectorPage,
  '/chats': loadMyChatsPage,
  '/create': loadCreatorStudioPage,
  '/events': loadEventsInboxPage,
  '/moderation': loadAdminModerationPage,
  '/profile': loadProfilePage,
  '/wallet': loadWalletPage,
}

function preloadRoute(to: string) {
  void routePreloads[to]?.()
}

function NotFoundPage() {
  return (
    <main className="grid min-h-[calc(100svh-4rem)] place-items-center px-4 py-12">
      <section className="w-full max-w-lg rounded-lg border border-slate-900/10 bg-white p-6 text-center shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-slate-950 text-white">
          <SearchX size={22} />
        </span>
        <h1 className="m-0 mt-4 text-2xl font-black text-slate-950">ไม่พบหน้านี้</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          ลิงก์นี้อาจถูกย้ายหรือยังไม่เปิดใช้งาน เลือกทางไปต่อได้เลย
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <NavLink
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white"
            to="/"
          >
            ไปหน้าหลัก
          </NavLink>
          <NavLink
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-900/10 bg-slate-50 px-4 text-sm font-black text-slate-700"
            to="/create"
          >
            สร้างตัวละคร
          </NavLink>
        </div>
      </section>
    </main>
  )
}

function initialDarkMode() {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem('maprang:theme:v2')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return true
}

function App() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isWalletLoading = useAppSelector(selectWalletLoading)
  const eventCount = useAppSelector(selectPendingSceneCount)
  const didBootstrap = useRef(false)
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode)
  const isChatRoute = location.pathname === '/chat' || location.pathname.startsWith('/chat/')
  const isExploreRoute = location.pathname === '/'

  useEffect(() => {
    if (didBootstrap.current) return
    didBootstrap.current = true
    dispatch(loadContentSettings())
    dispatch(loadWalletSummary())
    dispatch(loadChatSummaries())
    dispatch(loadPersonaDraft())
  }, [dispatch])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('maprang:theme:v2', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const appRoutes = (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="grid min-h-40 place-items-center rounded-2xl border border-white/10 bg-white/6 px-4 text-center text-sm font-black text-white/62 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            กำลังโหลดหน้า...
          </div>
        </div>
      }
    >
      <Routes>
        <Route element={<ExplorePage />} path="/" />
        <Route element={<CharacterLobbyPage />} path="/characters/:characterId" />
        <Route element={<ChatRoomPage />} path="/chat/:chatId?" />
        <Route element={<MyChatsPage />} path="/chats" />
        <Route element={<CreatorStudioPage />} path="/create" />
        <Route element={<EventsInboxPage />} path="/events" />
        <Route element={<AdminModerationPage />} path="/moderation" />
        <Route element={<AdminHealthPage />} path="/admin/health" />
        <Route element={<AdminPromptInspectorPage />} path="/admin/prompt-inspector" />
        <Route element={<ProfilePage />} path="/profile" />
        <Route element={<WalletPage />} path="/wallet" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </Suspense>
  )

  if (isChatRoute) {
    return (
      <div className="h-svh overflow-hidden bg-[#101012] text-white">
        <AgeGate />
        {appRoutes}
      </div>
    )
  }

  if (isExploreRoute) {
    return (
      <div className="min-h-svh bg-[#111113] text-white">
        <AgeGate />
        {appRoutes}
      </div>
    )
  }

  const shellClass = isDarkMode
    ? 'maprang-standard-shell maprang-dark min-h-svh bg-[#101012] text-slate-100'
    : 'maprang-standard-shell min-h-svh bg-slate-50 text-slate-950'

  return (
    <div className={shellClass}>
      <AgeGate />
      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <NavLink className="flex min-w-0 items-center gap-3" to="/">
            <span className="grid size-10 flex-none place-items-center rounded-xl bg-linear-to-br from-amber-400 to-rose-500 text-lg font-black text-white shadow-[0_12px_24px_rgba(244,114,52,0.22)]">
              M
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black">Maprang AI</span>
              <span className="hidden text-xs font-bold text-slate-500 sm:block">
                โรลเพลย์ภาษาไทย พร้อมระบบความสัมพันธ์เชิงลึก
              </span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            <NavLink
              className="flex min-h-10 max-w-[7.5rem] items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-50 px-2 text-xs font-black text-amber-700 sm:max-w-none sm:gap-2 sm:px-3 sm:text-sm"
              to="/wallet"
            >
              <Coins size={16} />
              <span className="hidden sm:inline">โทเคน</span>
              <span className="truncate">{isWalletLoading ? '...' : tokenBalance.toLocaleString()}</span>
            </NavLink>
            <button
              aria-pressed={isDarkMode}
              className="grid size-10 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-700"
              onClick={() => setIsDarkMode((current) => !current)}
              title={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              type="button"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NavLink
              className="relative grid size-10 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-700"
              to="/events"
              title="อีเวนต์"
            >
              <Bell size={18} />
              {eventCount > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-xs font-black text-white">
                  {eventCount}
                </span>
              )}
            </NavLink>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden border-r border-slate-900/10 bg-white/70 px-3 py-5 md:block">
          <div className="sticky top-21 flex min-h-[calc(100svh-6rem)] flex-col gap-1">
            {primaryNavItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black transition ${
                    isActive ? 'bg-orange-500 text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)]' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
                end={item.to === '/'}
                key={item.to}
                onFocus={() => preloadRoute(item.to)}
                onMouseEnter={() => preloadRoute(item.to)}
                onTouchStart={() => preloadRoute(item.to)}
                to={item.to}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div className="my-3 border-t border-slate-900/10 pt-3">
              <p className="mb-2 px-3 text-[11px] font-black tracking-widest text-slate-400 uppercase">บัญชี</p>
              {utilityNavItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black transition ${
                      isActive ? 'bg-amber-500 text-white shadow-[0_14px_28px_rgba(245,158,11,0.2)]' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                  key={item.to}
                  onFocus={() => preloadRoute(item.to)}
                  onMouseEnter={() => preloadRoute(item.to)}
                  onTouchStart={() => preloadRoute(item.to)}
                  to={item.to}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="my-3 border-t border-slate-900/10 pt-3">
              <p className="mb-2 px-3 text-[11px] font-black tracking-widest text-slate-400 uppercase">ผู้ดูแล</p>
              {adminNavItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black transition ${
                      isActive ? 'bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                  key={item.to}
                  onFocus={() => preloadRoute(item.to)}
                  onMouseEnter={() => preloadRoute(item.to)}
                  onTouchStart={() => preloadRoute(item.to)}
                  to={item.to}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="mt-auto rounded-2xl border border-slate-900/10 bg-slate-50 p-3 shadow-sm">
              <p className="m-0 text-[11px] font-black tracking-widest text-slate-400 uppercase">สถานะวันนี้</p>
              <div className="mt-3 grid gap-2">
                <NavLink
                  className="flex min-h-9 items-center justify-between rounded-xl bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                  to="/events"
                >
                  <span className="inline-flex items-center gap-2">
                    <Bell size={14} />
                    ฉากรอ
                  </span>
                  <span className="text-amber-700">{eventCount.toLocaleString()}</span>
                </NavLink>
                <NavLink
                  className="flex min-h-9 items-center justify-between rounded-xl bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                  to="/wallet"
                >
                  <span className="inline-flex items-center gap-2">
                    <Coins size={14} />
                    โทเคน
                  </span>
                  <span className="text-emerald-700">{isWalletLoading ? '...' : tokenBalance.toLocaleString()}</span>
                </NavLink>
              </div>
              <NavLink
                className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-slate-900/10 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                to="/admin/health"
              >
                ตรวจความพร้อม
              </NavLink>
            </div>
          </div>
        </nav>

        <section className="min-w-0 pb-24 md:pb-0">{appRoutes}</section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-900/10 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden">
        {primaryNavItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black ${
                isActive ? 'bg-orange-500 text-white' : 'text-slate-500'
              }`
            }
            end={item.to === '/'}
            key={item.to}
            onFocus={() => preloadRoute(item.to)}
            onMouseEnter={() => preloadRoute(item.to)}
            onTouchStart={() => preloadRoute(item.to)}
            to={item.to}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
