import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Sparkles,
  TrendingUp,
  Heart,
  Calendar,
  Users,
  Zap,
  Filter,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { Character, CharacterListFilters } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  loadExploreCharacters,
  selectCharactersError,
  selectCharactersLoading,
  selectExploreCharacters,
} from '../store/slices/charactersSlice'
import { selectContentSettings } from '../store/slices/contentSlice'
import { CharacterCard } from '../components/character/CharacterCard'
import { CharacterGrid } from '../components/character/CharacterGrid'
import { CategorySection } from '../components/character/CategorySection'

const categories = [
  { id: 'trending', label: '⭐ กำลังฮิต', icon: <TrendingUp className="h-5 w-5" /> },
  { id: 'newest', label: '✨ มาใหม่', icon: <Sparkles className="h-5 w-5" /> },
  { id: 'popular', label: '🔥 ยอดนิยม', icon: <Zap className="h-5 w-5" /> },
  { id: 'romance', label: '💝 โรแมนซ์', icon: <Heart className="h-5 w-5" /> },
  { id: 'fantasy', label: '🪄 แฟนตาซี', icon: <Sparkles className="h-5 w-5" /> },
  { id: 'anime', label: '🎌 อนิเมะ', icon: <Users className="h-5 w-5" /> },
]

const quickFilters = [
  { label: 'ทั้งหมด', tag: '' },
  { label: 'อนิเมะ', tag: 'anime' },
  { label: 'แฟนตาซี', tag: 'fantasy' },
  { label: 'โรแมนซ์', tag: 'romance' },
  { label: 'ดราม่า', tag: 'drama' },
  { label: 'ค่อยๆ สนิท', tag: 'slow-burn' },
  { label: 'คู่แข่ง', tag: 'rival' },
]

function filterCharactersByTag(characters: Character[], tag: string): Character[] {
  if (!tag) return characters
  return characters.filter((c) => c.tags.includes(tag))
}

function filterCharactersByCategory(characters: Character[], category: string): Character[] {
  switch (category) {
    case 'newest':
      return [...characters].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })
    case 'popular':
      return [...characters].sort((a, b) => (b.chatCount || 0) - (a.chatCount || 0))
    case 'romance':
      return characters.filter((c) => c.tags.some((tag) => ['romance', 'partner', 'lover'].includes(tag)))
    case 'fantasy':
      return characters.filter((c) => c.tags.some((tag) => ['fantasy', 'magic', 'medieval'].includes(tag)))
    case 'anime':
      return characters.filter((c) => c.tags.includes('anime'))
    case 'trending':
    default:
      return [...characters].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
  }
}

export function ExplorePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const characters = useAppSelector(selectExploreCharacters)
  const loading = useAppSelector(selectCharactersLoading)
  const error = useAppSelector(selectCharactersError)
  const contentSettings = useAppSelector(selectContentSettings)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'home' | 'browse'>('home')

  useEffect(() => {
    dispatch(
      loadExploreCharacters({
        sort: 'viewed',
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        limit: 100,
      })
    )
  }, [dispatch])

  // Filter characters
  const filteredCharacters = useMemo(() => {
    let result = characters

    // Apply tag filter
    if (selectedFilter) {
      result = filterCharactersByTag(result, selectedFilter)
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.tagline?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return result
  }, [characters, selectedFilter, searchQuery])

  // Category sections for home view
  const categorySections = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      characters: filterCharactersByCategory(characters, cat.id).slice(0, 12),
    }))
  }, [characters])

  const handleSelectCharacter = (character: Character) => {
    navigate(`/characters/${character.id}`)
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-red-400">เกิดข้อผิดพลาด: {error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-500"
          >
            โหลดใหม่
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-lg font-black text-white">
                M
              </div>
              <span className="hidden text-xl font-black tracking-wide text-white sm:block">
                MAPRANG
              </span>
            </Link>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาตัวละคร, แท็ก, หมวดหมู่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-800/50 py-2.5 pl-10 pr-4 text-slate-100 placeholder-slate-400 outline-none ring-1 ring-slate-700/50 transition-all focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-slate-700/50"
                  aria-label="ล้างการค้นหา"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-4 py-2.5 text-slate-100 ring-1 ring-slate-700/50 transition-all hover:bg-slate-700/50"
              aria-label={showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span className="hidden sm:inline">ตัวกรอง</span>
            </button>

            {/* Create Button */}
            <Link
              to="/create"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-purple-500/30"
            >
              <Sparkles className="h-5 w-5" />
              <span className="hidden sm:inline">สร้าง</span>
            </Link>

            {/* Profile Link */}
            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/50 ring-1 ring-slate-700/50 transition-all hover:bg-slate-700/50"
            >
              <span className="text-sm font-semibold text-slate-300">P</span>
            </Link>
          </div>

          {/* Quick Filters */}
          {showFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.tag}
                  onClick={() => setSelectedFilter(filter.tag === selectedFilter ? '' : filter.tag)}
                  className={`
                    rounded-full px-4 py-1.5 text-sm font-medium transition-all
                    ${
                      filter.tag === selectedFilter
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                    }
                  `}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-7xl">
          {/* View Mode Toggle */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-2 rounded-lg bg-slate-800/50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('home')}
                className={`
                  rounded-md px-4 py-2 text-sm font-medium transition-all
                  ${viewMode === 'home' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
                `}
              >
                หน้าแรก
              </button>
              <button
                type="button"
                onClick={() => setViewMode('browse')}
                className={`
                  rounded-md px-4 py-2 text-sm font-medium transition-all
                  ${viewMode === 'browse' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
                `}
              >
                เรียกดูทั้งหมด
              </button>
            </div>

            <div className="text-sm text-slate-400">
              {filteredCharacters.length} ตัวละคร
            </div>
          </div>

          {/* Home View - Category Sections */}
          {viewMode === 'home' && !searchQuery && (
            <div className="space-y-8">
              {categorySections.map((section) => (
                <CategorySection
                  key={section.id}
                  title={section.label}
                  icon={section.icon}
                  characters={section.characters}
                  onSelectCharacter={handleSelectCharacter}
                  onSeeAll={() => {
                    setViewMode('browse')
                    setSelectedFilter('')
                  }}
                  showStats
                />
              ))}
            </div>
          )}

          {/* Browse View - Full Grid */}
          {(viewMode === 'browse' || searchQuery) && (
            <CharacterGrid
              characters={filteredCharacters}
              onSelectCharacter={handleSelectCharacter}
              loading={loading}
              showStats
              emptyMessage={
                searchQuery
                  ? `ไม่พบตัวละครที่ตรงกับ "${searchQuery}"`
                  : 'ไม่พบตัวละคร'
              }
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center justify-around px-4 py-3">
          <Link
            to="/"
            className="flex flex-col items-center gap-1 text-purple-400"
          >
            <Search className="h-5 w-5" />
            <span className="text-xs font-medium">สำรวจ</span>
          </Link>
          <Link
            to="/chats"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
          >
            <Heart className="h-5 w-5" />
            <span className="text-xs font-medium">แชท</span>
          </Link>
          <Link
            to="/create"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-medium">สร้าง</span>
          </Link>
          <Link
            to="/profile"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
          >
            <Users className="h-5 w-5" />
            <span className="text-xs font-medium">โปรไฟล์</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
