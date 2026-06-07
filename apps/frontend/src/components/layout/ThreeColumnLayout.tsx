import { useState, type ReactNode } from 'react'
import { Menu, X, Settings } from 'lucide-react'

interface ThreeColumnLayoutProps {
  leftSidebar: ReactNode
  rightSidebar: ReactNode
  children: ReactNode
  defaultLeftOpen?: boolean
  defaultRightOpen?: boolean
}

export function ThreeColumnLayout({
  leftSidebar,
  rightSidebar,
  children,
  defaultLeftOpen = true,
  defaultRightOpen = true,
}: ThreeColumnLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(defaultLeftOpen)
  const [rightOpen, setRightOpen] = useState(defaultRightOpen)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  // Handle window resize
  useState(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640
      setIsMobile(mobile)
      if (mobile) {
        setLeftOpen(false)
        setRightOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  })

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Left Sidebar - Chat History */}
      <aside
        className={`
          ${leftOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMobile ? 'absolute z-20 h-full w-80' : 'relative w-80'}
          border-r border-slate-700/50 bg-slate-800/50 backdrop-blur-sm
          transition-transform duration-300 ease-in-out
        `}
      >
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          {isMobile && leftOpen && (
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setLeftOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-700/50"
                aria-label="ปิดแถบด้านซ้าย"
              >
                <X className="h-5 w-5 text-slate-300" />
              </button>
            </div>
          )}
          {leftSidebar}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar - Mobile Controls */}
        {isMobile && (
          <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/50 p-3">
            <button
              type="button"
              onClick={() => setLeftOpen(!leftOpen)}
              className="rounded-lg p-2 hover:bg-slate-700/50"
              aria-label="สลับแถบด้านซ้าย"
            >
              <Menu className="h-5 w-5 text-slate-300" />
            </button>
            <button
              type="button"
              onClick={() => setRightOpen(!rightOpen)}
              className="rounded-lg p-2 hover:bg-slate-700/50"
              aria-label="สลับแถบด้านขวา"
            >
              <Settings className="h-5 w-5 text-slate-300" />
            </button>
          </div>
        )}

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>

      {/* Right Sidebar - Lore/Settings */}
      <aside
        className={`
          ${rightOpen ? 'translate-x-0' : 'translate-x-full'}
          ${isMobile ? 'absolute right-0 z-20 h-full w-96' : 'relative w-96'}
          border-l border-slate-700/50 bg-slate-800/50 backdrop-blur-sm
          transition-transform duration-300 ease-in-out
        `}
      >
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          {isMobile && rightOpen && (
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setRightOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-700/50"
                aria-label="ปิดแถบด้านขวา"
              >
                <X className="h-5 w-5 text-slate-300" />
              </button>
            </div>
          )}
          {rightSidebar}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && (leftOpen || rightOpen) && (
        <div
          className="fixed inset-0 z-10 bg-black/50"
          onClick={() => {
            setLeftOpen(false)
            setRightOpen(false)
          }}
        />
      )}

      {/* Desktop Toggle Buttons */}
      {!isMobile && (
        <>
          {/* Left toggle */}
          <button
            type="button"
            onClick={() => setLeftOpen(!leftOpen)}
            className="absolute left-2 top-4 z-30 rounded-lg bg-slate-800/80 p-2 shadow-lg hover:bg-slate-700/80"
            aria-label={leftOpen ? 'ซ่อนแถบด้านซ้าย' : 'แสดงแถบด้านซ้าย'}
          >
            <Menu className="h-5 w-5 text-slate-300" />
          </button>

          {/* Right toggle */}
          <button
            type="button"
            onClick={() => setRightOpen(!rightOpen)}
            className="absolute right-2 top-4 z-30 rounded-lg bg-slate-800/80 p-2 shadow-lg hover:bg-slate-700/80"
            aria-label={rightOpen ? 'ซ่อนแถบด้านขวา' : 'แสดงแถบด้านขวา'}
          >
            <Settings className="h-5 w-5 text-slate-300" />
          </button>
        </>
      )}
    </div>
  )
}
