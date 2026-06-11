import { Eye, Heart, MessageCircle } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { setCharacterFavorite, type Character } from '../../lib/api'
import { characterRating } from '../../lib/contentRating'

interface CharacterCardProps {
  character: Character
  variant?: 'default' | 'compact' | 'featured'
  onSelect?: (character: Character) => void
  showStats?: boolean
}

function displayNumber(value?: number) {
  const next = value ?? 0
  if (next >= 1000000) return `${(next / 1000000).toFixed(1)}M`
  if (next >= 1000) return `${(next / 1000).toFixed(1)}K`
  return next.toLocaleString()
}

function getBadges(character: Character) {
  const badges: string[] = []

  if (character.tags.some((tag) => ['slow-burn', 'trust-building', 'mentor'].includes(tag))) {
    badges.push('ความสัมพันธ์')
  }
  if (character.tags.some((tag) => ['rival', 'hostile', 'red-flag'].includes(tag))) {
    badges.push('ความตึงเครียด')
  }
  if (character.tags.some((tag) => ['fantasy', 'magic'].includes(tag))) {
    badges.push('แฟนตาซี')
  }
  if (character.tags.some((tag) => ['scifi', 'cyberpunk'].includes(tag))) {
    badges.push('ไซไฟ')
  }
  if (character.tags.some((tag) => ['slice-of-life', 'modern'].includes(tag))) {
    badges.push('ชีวิตประจำวัน')
  }

  return badges.slice(0, 3)
}

export function CharacterCard({
  character,
  variant = 'default',
  onSelect,
  showStats = true,
}: CharacterCardProps) {
  const navigate = useNavigate()
  const badges = getBadges(character)
  const rating = characterRating(character)
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'
  const [isFavorite, setIsFavorite] = useState(Boolean(character.isFavorite))
  const [favoriteCount, setFavoriteCount] = useState(character.favoriteCount ?? 0)
  const [isFavoritePending, setIsFavoritePending] = useState(false)
  const [favoriteNote, setFavoriteNote] = useState('')

  useEffect(() => {
    setIsFavorite(Boolean(character.isFavorite))
    setFavoriteCount(character.favoriteCount ?? 0)
    setFavoriteNote('')
  }, [character.favoriteCount, character.id, character.isFavorite])

  const handleClick = () => {
    if (onSelect) {
      onSelect(character)
      return
    }
    navigate(`/characters/${character.id}`)
  }

  const toggleFavorite = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (isFavoritePending) return

    const previousFavorite = isFavorite
    const previousCount = favoriteCount
    const nextFavorite = !previousFavorite
    const nextCount = Math.max(0, previousCount + (nextFavorite ? 1 : -1))

    setIsFavorite(nextFavorite)
    setFavoriteCount(nextCount)
    setIsFavoritePending(true)
    setFavoriteNote(nextFavorite ? 'เพิ่มในรายการโปรดแล้ว' : 'นำออกจากรายการโปรดแล้ว')

    try {
      const data = await setCharacterFavorite(character.id, nextFavorite)
      setIsFavorite(Boolean(data.character.isFavorite))
      setFavoriteCount(data.character.favoriteCount ?? nextCount)
      setFavoriteNote(nextFavorite ? 'บันทึกรายการโปรดแล้ว' : 'นำออกจากรายการโปรดแล้ว')
    } catch {
      setIsFavorite(previousFavorite)
      setFavoriteCount(previousCount)
      setFavoriteNote('บันทึกรายการโปรดไม่สำเร็จ')
    } finally {
      setIsFavoritePending(false)
    }
  }

  if (isCompact) {
    return (
      <div
        onClick={handleClick}
        className="group flex cursor-pointer gap-3 rounded-lg bg-slate-800/50 p-3 backdrop-blur-sm transition-all hover:bg-slate-700/50 hover:shadow-lg"
      >
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={character.avatarUrl || '/placeholder-avatar.png'}
            alt={character.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
          />
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <h3 className="font-semibold text-slate-100">{character.name}</h3>
          <p className="line-clamp-1 text-sm text-slate-400">{character.tagline || 'ไม่มีคำอธิบาย'}</p>
        </div>
        {showStats && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {displayNumber(character.chatCount)}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`
        group relative cursor-pointer overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur-sm
        transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20
        ${isFeatured ? 'col-span-2 row-span-2' : ''}
      `}
    >
      <div className={`relative overflow-hidden ${isFeatured ? 'aspect-[16/9]' : 'aspect-[3/4]'}`}>
        <img
          src={character.avatarUrl || '/placeholder-avatar.png'}
          alt={character.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <button
          type="button"
          onClick={toggleFavorite}
          aria-disabled={isFavoritePending}
          aria-pressed={isFavorite}
          disabled={isFavoritePending}
          className={`absolute right-3 top-3 z-10 rounded-full p-2 backdrop-blur-sm transition-all hover:scale-110 disabled:cursor-wait ${
            isFavorite ? 'bg-rose-500/85 text-white hover:bg-rose-500' : 'bg-black/30 text-white hover:bg-black/50'
          }`}
          aria-label={isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
          title={isFavoritePending ? 'กำลังบันทึกรายการโปรด' : isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
        >
          <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {rating !== 'general' && (
          <div className="absolute left-3 top-3 rounded-full bg-pink-500/90 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {rating === 'teen_romance' ? '13+' : rating === 'mature_18' ? '18+' : 'R'}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-semibold text-white drop-shadow-lg">{character.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-200 drop-shadow-md">
          {character.tagline || 'ไม่มีคำอธิบาย'}
        </p>

        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-white/10 px-2 py-1 text-xs text-white backdrop-blur-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {showStats && (
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {displayNumber(character.chatCount)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {displayNumber(favoriteCount)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {displayNumber(character.viewCount)}
            </span>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-purple-600/0 transition-colors group-hover:bg-purple-600/10" />
      {favoriteNote && (
        <span className="sr-only" aria-live="polite">
          {favoriteNote}
        </span>
      )}
    </div>
  )
}
