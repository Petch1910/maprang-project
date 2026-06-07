import { ChevronDown, ChevronUp, Plus, Edit2, Trash2, Calendar, MapPin, Heart } from 'lucide-react'
import { useState } from 'react'
import type { Character } from '../../lib/api'

interface LorePanelProps {
  character: Character
  loreEntries?: LoreEntry[]
  relationship?: RelationshipInfo
  onAddLore?: () => void
  onEditLore?: (id: string) => void
  onDeleteLore?: (id: string) => void
}

interface LoreEntry {
  id: string
  title: string
  content: string
  category?: 'event' | 'location' | 'memory' | 'fact'
  createdAt: Date
}

interface RelationshipInfo {
  status: string
  tier: string
  affinity: number
  trust: number
  intimacy: number
}

export function LorePanel({
  character,
  loreEntries = [],
  relationship,
  onAddLore,
  onEditLore,
  onDeleteLore,
}: LorePanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    character: true,
    relationship: true,
    lore: true,
    settings: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'event':
        return <Calendar className="h-4 w-4" />
      case 'location':
        return <MapPin className="h-4 w-4" />
      case 'memory':
        return <Heart className="h-4 w-4" />
      default:
        return <Edit2 className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'event':
        return 'text-blue-400 bg-blue-500/10'
      case 'location':
        return 'text-green-400 bg-green-500/10'
      case 'memory':
        return 'text-pink-400 bg-pink-500/10'
      default:
        return 'text-purple-400 bg-purple-500/10'
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700/50 p-4">
        <h2 className="text-lg font-semibold text-slate-100">รายละเอียด</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Character Info Section */}
        <div className="border-b border-slate-700/50">
          <button
            type="button"
            onClick={() => toggleSection('character')}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-700/30"
            aria-label="สลับข้อมูลตัวละคร"
          >
            <h3 className="font-medium text-slate-100">ข้อมูลตัวละคร</h3>
            {expandedSections.character ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {expandedSections.character && (
            <div className="space-y-4 p-4 pt-0">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="h-24 w-24 overflow-hidden rounded-full ring-2 ring-purple-500/30">
                  <img
                    src={character.avatarUrl || '/placeholder-avatar.png'}
                    alt={character.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="text-center">
                <h4 className="text-lg font-semibold text-slate-100">{character.name}</h4>
                {character.tagline && (
                  <p className="mt-1 text-sm text-slate-400">{character.tagline}</p>
                )}
              </div>

              {/* Description */}
              {character.description && (
                <div className="rounded-lg bg-slate-700/30 p-3">
                  <p className="text-sm text-slate-300 leading-relaxed">{character.description}</p>
                </div>
              )}

              {/* Tags */}
              {character.tags && character.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {character.tags.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-700/50 px-2 py-1 text-xs text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Relationship Section */}
        {relationship && (
          <div className="border-b border-slate-700/50">
            <button
              type="button"
              onClick={() => toggleSection('relationship')}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-700/30"
              aria-label="สลับความสัมพันธ์"
            >
              <h3 className="font-medium text-slate-100">ความสัมพันธ์</h3>
              {expandedSections.relationship ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {expandedSections.relationship && (
              <div className="space-y-4 p-4 pt-0">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  <span className="rounded-full bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-300">
                    {relationship.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  {/* Affinity */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-400">ความรู้สึกดี</span>
                      <span className="text-slate-300">{relationship.affinity}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                        style={{ width: `${relationship.affinity}%` }}
                      />
                    </div>
                  </div>

                  {/* Trust */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-400">ความไว้วางใจ</span>
                      <span className="text-slate-300">{relationship.trust}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                        style={{ width: `${relationship.trust}%` }}
                      />
                    </div>
                  </div>

                  {/* Intimacy */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-400">ความใกล้ชิด</span>
                      <span className="text-slate-300">{relationship.intimacy}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-pink-500 transition-all"
                        style={{ width: `${relationship.intimacy}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lore Entries Section */}
        <div className="border-b border-slate-700/50">
          <button
            type="button"
            onClick={() => toggleSection('lore')}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-700/30"
            aria-label="สลับความทรงจำ"
          >
            <h3 className="font-medium text-slate-100">
              ความทรงจำ ({loreEntries.length})
            </h3>
            {expandedSections.lore ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {expandedSections.lore && (
            <div className="space-y-2 p-4 pt-0">
              {/* Add Lore Button */}
              <button
                type="button"
                onClick={onAddLore}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 py-3 text-sm text-slate-400 transition-colors hover:border-purple-500 hover:text-purple-400"
              >
                <Plus className="h-4 w-4" />
                เพิ่มความทรงจำ
              </button>

              {/* Lore List */}
              {loreEntries.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  ยังไม่มีความทรงจำ
                </p>
              ) : (
                <div className="space-y-2">
                  {loreEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="group rounded-lg bg-slate-700/30 p-3 transition-colors hover:bg-slate-700/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 rounded p-1 ${getCategoryColor(entry.category)}`}>
                            {getCategoryIcon(entry.category)}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-100">{entry.title}</h4>
                            <p className="mt-1 text-sm text-slate-400 line-clamp-2">{entry.content}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => onEditLore?.(entry.id)}
                            className="rounded p-1 hover:bg-slate-600/50"
                            aria-label="แก้ไข"
                          >
                            <Edit2 className="h-3 w-3 text-slate-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLore?.(entry.id)}
                            className="rounded p-1 hover:bg-slate-600/50"
                            aria-label="ลบ"
                          >
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('settings')}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-700/30"
            aria-label="สลับการตั้งค่า"
          >
            <h3 className="font-medium text-slate-100">การตั้งค่า</h3>
            {expandedSections.settings ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {expandedSections.settings && (
            <div className="space-y-3 p-4 pt-0">
              <button type="button" className="w-full rounded-lg bg-slate-700/50 px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">
                🔊 เสียงและภาษา
              </button>
              <button type="button" className="w-full rounded-lg bg-slate-700/50 px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">
                🎨 ธีม UI
              </button>
              <button type="button" className="w-full rounded-lg bg-slate-700/50 px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700">
                ⚙️ ตัวเลือกขั้นสูง
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
