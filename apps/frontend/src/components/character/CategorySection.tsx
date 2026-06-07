import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Character } from '../../lib/api'
import { CharacterCard } from './CharacterCard'

interface CategorySectionProps {
  title: string
  icon?: React.ReactNode
  characters: Character[]
  onSelectCharacter?: (character: Character) => void
  onSeeAll?: () => void
  showStats?: boolean
}

export function CategorySection({
  title,
  icon,
  characters,
  onSelectCharacter,
  onSeeAll,
  showStats = true,
}: CategorySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftButton, setShowLeftButton] = useState(false)
  const [showRightButton, setShowRightButton] = useState(true)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return

    const scrollAmount = 400
    const newScrollLeft =
      scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)

    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    })
  }

  const handleScroll = () => {
    if (!scrollRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftButton(scrollLeft > 0)
    setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10)
  }

  if (characters.length === 0) return null

  return (
    <section className="relative space-y-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
          <span className="text-sm text-slate-400">({characters.length})</span>
        </div>

        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            ดูทั้งหมด →
          </button>
        )}
      </div>

      {/* Scrollable Container */}
      <div className="relative">
        {/* Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto px-4 scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {characters.map((character) => (
            <div key={character.id} className="w-48 flex-shrink-0">
              <CharacterCard
                character={character}
                variant="default"
                onSelect={onSelectCharacter}
                showStats={showStats}
              />
            </div>
          ))}
        </div>

        {/* Left Scroll Button */}
        {showLeftButton && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-800/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-slate-700/90 hover:scale-110"
            aria-label="เลื่อนซ้าย"
          >
            <ChevronLeft className="h-5 w-5 text-slate-300" />
          </button>
        )}

        {/* Right Scroll Button */}
        {showRightButton && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-800/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-slate-700/90 hover:scale-110"
            aria-label="เลื่อนขวา"
          >
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </button>
        )}

        {/* Gradient Overlays */}
        {showLeftButton && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 to-transparent" />
        )}
        {showRightButton && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent" />
        )}
      </div>
    </section>
  )
}
