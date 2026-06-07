import type { Character } from '../../lib/api'
import { CharacterCard } from './CharacterCard'

interface CharacterGridProps {
  characters: Character[]
  variant?: 'default' | 'compact'
  onSelectCharacter?: (character: Character) => void
  showStats?: boolean
  loading?: boolean
  emptyMessage?: string
}

export function CharacterGrid({
  characters,
  variant = 'default',
  onSelectCharacter,
  showStats = true,
  loading = false,
  emptyMessage = 'ไม่พบตัวละคร',
}: CharacterGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] animate-pulse rounded-xl bg-slate-800/50"
          />
        ))}
      </div>
    )
  }

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-6xl opacity-20">🔍</div>
        <p className="mt-4 text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            variant="compact"
            onSelect={onSelectCharacter}
            showStats={showStats}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          variant="default"
          onSelect={onSelectCharacter}
          showStats={showStats}
        />
      ))}
    </div>
  )
}
