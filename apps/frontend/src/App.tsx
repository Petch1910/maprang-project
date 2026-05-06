import { lazy, Suspense, useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Bell, Coins, Compass, MessageCircle, PlusCircle, ShieldCheck, UserRound } from 'lucide-react'
import { AgeGate } from './components/AgeGate'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { loadChatSummaries, selectPendingSceneCount } from './store/slices/chatsSlice'
import { loadWalletSummary, selectTokenBalance } from './store/slices/walletSlice'

const ChatRoomPage = lazy(() => import('./pages/ChatRoomPage').then((module) => ({ default: module.ChatRoomPage })))
const AdminModerationPage = lazy(() =>
  import('./pages/AdminModerationPage').then((module) => ({ default: module.AdminModerationPage })),
)
const CharacterLobbyPage = lazy(() =>
  import('./pages/CharacterLobbyPage').then((module) => ({ default: module.CharacterLobbyPage })),
)
const CreatorStudioPage = lazy(() =>
  import('./pages/CreatorStudioPage').then((module) => ({ default: module.CreatorStudioPage })),
)
const EventsInboxPage = lazy(() =>
  import('./pages/EventsInboxPage').then((module) => ({ default: module.EventsInboxPage })),
)
const ExplorePage = lazy(() => import('./pages/ExplorePage').then((module) => ({ default: module.ExplorePage })))
const MyChatsPage = lazy(() => import('./pages/MyChatsPage').then((module) => ({ default: module.MyChatsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const WalletPage = lazy(() => import('./pages/WalletPage').then((module) => ({ default: module.WalletPage })))

const primaryNavItems = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/events', label: 'อีเวนต์', icon: Bell },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
]

const adminNavItems = [{ to: '/moderation', label: 'ดูแลรายงาน', icon: ShieldCheck }]
const utilityNavItems = [{ to: '/wallet', label: 'กระเป๋าโทเคน', icon: Coins }]

function App() {
  const dispatch = useAppDispatch()
  const tokenBalance = useAppSelector(selectTokenBalance)
  const eventCount = useAppSelector(selectPendingSceneCount)

  useEffect(() => {
    dispatch(loadWalletSummary())
    dispatch(loadChatSummaries())
  }, [dispatch])

  return (
    <div className="min-h-svh bg-slate-50 text-slate-950">
      <AgeGate />
      <header className="sticky top-0 z-40 border-b border-slate-900/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <NavLink className="flex min-w-0 items-center gap-3" to="/">
            <span className="grid size-10 flex-none place-items-center rounded-xl bg-linear-to-br from-amber-400 to-rose-500 text-lg font-black text-white shadow-[0_12px_24px_rgba(244,114,52,0.22)]">
              M
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black">Maprang AI</span>
              <span className="hidden text-xs font-bold text-slate-500 sm:block">โรลเพลย์ภาษาไทย พร้อมระบบความสัมพันธ์เชิงลึก</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            <NavLink
              className="hidden min-h-10 items-center gap-2 rounded-full border border-amber-500/20 bg-amber-50 px-3 text-sm font-black text-amber-700 sm:flex"
              to="/wallet"
            >
              <span>โทเคน</span>
              <span>{tokenBalance.toLocaleString()}</span>
            </NavLink>
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
          <div className="sticky top-21 flex flex-col gap-1">
            {primaryNavItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black transition ${
                    isActive ? 'bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.2)]' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
                end={item.to === '/'}
                key={item.to}
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
                  to={item.to}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <section className="min-w-0 pb-24 md:pb-0">
          <Suspense fallback={<div className="p-6"><div className="h-40 animate-pulse rounded-2xl bg-slate-200" /></div>}>
            <Routes>
              <Route element={<ExplorePage />} path="/" />
              <Route element={<CharacterLobbyPage />} path="/characters/:characterId" />
              <Route element={<ChatRoomPage />} path="/chat/:chatId?" />
              <Route element={<MyChatsPage />} path="/chats" />
              <Route element={<CreatorStudioPage />} path="/create" />
              <Route element={<EventsInboxPage />} path="/events" />
              <Route element={<AdminModerationPage />} path="/moderation" />
              <Route element={<ProfilePage />} path="/profile" />
              <Route element={<WalletPage />} path="/wallet" />
            </Routes>
          </Suspense>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-900/10 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden">
        {primaryNavItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-500'
              }`
            }
            end={item.to === '/'}
            key={item.to}
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
