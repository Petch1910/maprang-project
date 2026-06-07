import { Heart, MessageCircle, Eye, Star } from 'lucide-react'
import type { Character } from '../../lib/api'
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

  // Relationship badges
  if (character.tags.some((tag) => ['slow-burn', 'trust-building', 'mentor'].includes(tag))) {
    badges.push('ความสัมพันธ์')
  }
  if (character.tags.some((tag) => ['rival', 'hostile', 'red-flag'].includes(tag))) {
    badges.push('ความตึงเครียด')
  }

  // Genre badges
  if (character.tags.some((tag) => ['fantasy', 'magic'].includes(tag))) {
    badges.push('แฟนตาซี')
  }
  if (character.tags.some((tag) => ['scifi', 'cyberpunk'].includes(tag))) {
    badges.push('ไซไฟ')
  }
  if (character.tags.some((tag) => ['slice-of-life', 'modern'].includes(tag))) {
    badges.push('ชีวิตประจำวัน')
  }

  return badges.slice(0, 3) // Max 3 badges
}

export function CharacterCard({
  character,
  variant = 'default',
  onSelect,
  showStats = true,
}: CharacterCardProps) {
  const badges = getBadges(character)
  const rating = characterRating(character)
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'

  const handleClick = () => {
    if (onSelect) {
      onSelect(character)
    } else {
      window.location.href = `/characters/${character.id}`
    }
  }

  if (isCompact) {
    // Compact list view
    return (
      <div
        onClick={handleClick}
        className="group flex cursor-pointer gap-3 rounded-lg bg-slate-800/50 p-3 backdrop-blur-sm transition-all hover:bg-slate-700/50 hover:shadow-lg"
      >
        {/* Avatar */}
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
          <img
            src={character.avatarUrl || '/placeholder-avatar.png'}
            alt={character.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
          />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-center">
          <h3 className="font-semibold text-slate-100">{character.name}</h3>
          <p className="line-clamp-1 text-sm text-slate-400">{character.tagline || 'ไม่มีคำอธิบาย'}</p>
        </div>

        {/* Stats */}
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

  // Default card view (Pinterest style)
  return (
    <div
      onClick={handleClick}
      className={`
        group relative cursor-pointer overflow-hidden rounded-xl bg-slate-800/50 backdrop-blur-sm
        transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20
        ${isFeatured ? 'col-span-2 row-span-2' : ''}
      `}
    >
      {/* Avatar Image */}
      <div className={`relative overflow-hidden ${isFeatured ? 'aspect-[16/9]' : 'aspect-[3/4]'}`}>
        <img
          src={character.avatarUrl || '/placeholder-avatar.png'}
          alt={character.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            // TODO: Toggle favorite
          }}
          className="absolute right-3 top-3 rounded-full bg-black/30 p-2 backdrop-blur-sm transition-all hover:bg-black/50 hover:scale-110"
          aria-label="ถูกใจ"
        >
          <Heart className="h-4 w-4 text-white" />
        </button>

        {/* Rating Badge */}
        {rating !== 'general' && (
          <div className="absolute left-3 top-3 rounded-full bg-pink-500/90 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {rating === 'teen_romance' ? '13+' : rating === 'mature_18' ? '18+' : 'R'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Name & Tagline */}
        <h3 className="text-lg font-semibold text-white drop-shadow-lg">{character.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-200 drop-shadow-md">
          {character.tagline || 'ไม่มีคำอธิบาย'}
        </p>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <span
                key={index}
                className="rounded-full bg-white/10 px-2 py-1 text-xs text-white backdrop-blur-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {displayNumber(character.chatCount)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {displayNumber(character.favoriteCount)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {displayNumber(character.viewCount)}
            </span>
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-purple-600/0 transition-colors group-hover:bg-purple-600/10" />
    </div>
  )
}
