import { useMemo, useState } from 'react'
import type { Character, CharacterListFilters } from '../lib/api'
import { characterStatusLabel, characterStatusOptions, characterVisibilityLabel } from '../lib/characterLabels'

type CharacterListProps = {
  characters: Character[]
  selectedCharacterId: string
  onFilterCharacters: (filters?: CharacterListFilters) => Promise<Character[]>
  onFavoriteCharacter: (characterId: string, favorite: boolean) => Promise<void>
  onSelectCharacter: (character: Character) => void
}

const inputClass =
  'min-h-9 rounded-lg border border-slate-900/15 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/15'

export function CharacterList({
  characters,
  selectedCharacterId,
  onFilterCharacters,
  onFavoriteCharacter,
  onSelectCharacter,
}: CharacterListProps) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('')
  const [status, setStatus] = useState<CharacterListFilters['status']>('')
  const [sort, setSort] = useState<CharacterListFilters['sort']>('popular')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  const availableTags = useMemo(
    () => [...new Set(characters.flatMap((character) => character.tags))].sort(),
    [characters],
  )
  const filterDisabledReason = isFiltering ? 'กำลังค้นหาตัวละคร รอให้เสร็จก่อน' : ''

  const applyFilters = async () => {
    setIsFiltering(true)
    try {
      await onFilterCharacters({
        view: 'admin',
        q: query,
        tag,
        status,
        sort,
        favoriteOnly,
        limit: 40,
      })
    } finally {
      setIsFiltering(false)
    }
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">ตัวละคร</p>
        <h2 className="m-0 text-lg font-bold text-slate-900">เลือกผู้ช่วย AI</h2>
      </div>

      <div className="grid gap-2">
        <input
          className={inputClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void applyFilters()
          }}
          placeholder="ค้นหาชื่อตัวละคร"
        />
        <div className="grid grid-cols-2 gap-2">
          <select className={inputClass} value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">ทุกแท็ก</option>
            {availableTags.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as CharacterListFilters['status'])}
          >
            <option value="">ทุกสถานะ</option>
            {characterStatusOptions.map((option) => (
              <option key={option} value={option}>
                {characterStatusLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <select
            className={inputClass}
            value={sort}
            onChange={(event) => setSort(event.target.value as CharacterListFilters['sort'])}
          >
            <option value="popular">ยอดแชท</option>
            <option value="favorited">ถูกใจมากสุด</option>
            <option value="viewed">ยอดเข้าชม</option>
            <option value="newest">ล่าสุด</option>
            <option value="quality">คุณภาพ</option>
          </select>
          <button type="button"
            className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-extrabold text-white disabled:opacity-60"
            aria-disabled={isFiltering}
            onClick={applyFilters}
            disabled={isFiltering}
            title={filterDisabledReason || 'ค้นหาตัวละครตามตัวกรอง'}
          >
            {isFiltering ? '...' : 'ค้นหา'}
          </button>
        </div>
        <label className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-900/10 bg-white px-3 text-xs font-bold text-slate-600">
          <input checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} type="checkbox" />
          แสดงเฉพาะรายการโปรด
        </label>
      </div>

      <div className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-0.5">
        {characters.map((character) => (
          <div
            className={`grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-lg border p-3 text-left transition ${
              character.id === selectedCharacterId
                ? 'border-blue-500/40 bg-blue-50'
                : 'border-slate-900/10 bg-white/75 hover:bg-white'
            }`}
            key={character.id}
            onClick={() => onSelectCharacter(character)}
            role="button"
            tabIndex={0}
          >
            <div className="grid size-10 place-items-center rounded-xl bg-orange-100 text-xs font-extrabold text-orange-900">
              AI
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <strong className="truncate text-sm text-slate-900">{character.name}</strong>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {character.status ? characterStatusLabel(character.status) : characterVisibilityLabel(character.visibility, 'สาธารณะ')}
                </span>
                <button
                  className={`ml-auto grid size-7 place-items-center rounded-full border text-xs font-extrabold ${
                    character.isFavorite
                      ? 'border-rose-500/25 bg-rose-50 text-rose-600'
                      : 'border-slate-900/10 bg-white text-slate-400'
                  }`}
                  onClick={(event) => {
                    event.stopPropagation()
                    void onFavoriteCharacter(character.id, !character.isFavorite)
                  }}
                  title={character.isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                  type="button"
                >
                  {character.isFavorite ? '♥' : '♡'}
                </button>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {character.tagline || character.description || character.greeting}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <span>Q {character.qualityScore ?? 0}</span>
                <span>{character.chatCount.toLocaleString()} แชท</span>
                <span>{(character.viewCount ?? 0).toLocaleString()} เข้าชม</span>
                <span>{(character.favoriteCount ?? 0).toLocaleString()} ถูกใจ</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
