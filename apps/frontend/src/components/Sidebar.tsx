import type {
  AdminSummary as AdminSummaryData,
  Character,
  CharacterInput,
  CharacterListFilters,
  ChatSummary,
  ChatRuntimeState,
  HealthStatus,
  LoreEntry,
  LoreInput,
} from '../lib/api'
import { formatTime } from '../lib/chat'
import { AdminSummary } from './AdminSummary'
import { AuthPanel } from './AuthPanel'
import { CharacterCreateForm } from './CharacterCreateForm'
import { CharacterList } from './CharacterList'
import { CharacterManager } from './CharacterManager'
import { LoreManager } from './LoreManager'
import { RelationshipExplainability } from './RelationshipExplainability'
import { SystemStatus } from './SystemStatus'

type SidebarProps = {
  character: Character
  adminSummary: AdminSummaryData | null
  characters: Character[]
  chatHistory: ChatSummary[]
  chatId: string | null
  runtimeState: ChatRuntimeState | null
  connectionNote: string
  healthStatus: HealthStatus | null
  isHistoryLoading: boolean
  isLoreLoading: boolean
  isMobileOpen: boolean
  isSavingCharacter: boolean
  isSavingLore: boolean
  loreEntries: LoreEntry[]
  onArchiveChat: (chatId: string) => void
  onAuthChanged: () => Promise<void>
  onCloseMobile: () => void
  onCreateCharacter: (input: CharacterInput) => Promise<void>
  onCreateLore: (input: LoreInput) => Promise<void>
  onDeleteCharacter: () => Promise<void>
  onDeleteLore: (loreId: string) => Promise<void>
  onDuplicateCharacter: () => Promise<void>
  onFilterCharacters: (filters?: CharacterListFilters) => Promise<Character[]>
  onFavoriteCharacter: (characterId: string, favorite: boolean) => Promise<void>
  onLoadChatHistory: () => void
  onLoadHealth: () => Promise<void>
  onLoadAdminSummary: () => Promise<void>
  onLoadLore: () => Promise<void>
  onOpenChat: (chatId: string) => void
  onResetCharacterPrompt: () => Promise<void>
  onSaveCharacter: (input: CharacterInput) => Promise<void>
  onSelectCharacter: (character: Character) => void
  onStartNewChat: () => void
  onUpdateLore: (loreId: string, input: Partial<LoreInput>) => Promise<void>
}

export function Sidebar(props: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm transition md:hidden ${
          props.isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={props.onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(92vw,360px)] min-h-0 flex-col gap-6 overflow-y-auto border-r border-slate-900/10 bg-white/95 p-5 shadow-2xl backdrop-blur-xl transition-transform md:static md:z-auto md:w-auto md:translate-x-0 md:bg-white/70 md:p-7 md:shadow-none ${
          props.isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent {...props} />
      </aside>
    </>
  )
}

function SidebarContent({
  character,
  adminSummary,
  characters,
  chatHistory,
  chatId,
  runtimeState,
  connectionNote,
  healthStatus,
  isHistoryLoading,
  isLoreLoading,
  isSavingCharacter,
  isSavingLore,
  loreEntries,
  onArchiveChat,
  onAuthChanged,
  onCloseMobile,
  onCreateCharacter,
  onCreateLore,
  onDeleteCharacter,
  onDeleteLore,
  onDuplicateCharacter,
  onFilterCharacters,
  onFavoriteCharacter,
  onLoadChatHistory,
  onLoadHealth,
  onLoadAdminSummary,
  onLoadLore,
  onOpenChat,
  onResetCharacterPrompt,
  onSaveCharacter,
  onSelectCharacter,
  onStartNewChat,
  onUpdateLore,
}: SidebarProps) {
  const handleStartNewChat = () => {
    onStartNewChat()
    onCloseMobile()
  }

  const handleSelectCharacter = (nextCharacter: Character) => {
    onSelectCharacter(nextCharacter)
    onCloseMobile()
  }

  const handleOpenChat = (id: string) => {
    onOpenChat(id)
    onCloseMobile()
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3.5">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="grid size-13 flex-none place-items-center rounded-2xl bg-linear-to-br from-amber-400 to-rose-500 text-2xl font-extrabold text-white shadow-[0_16px_36px_rgba(255,120,60,0.32)]">
            M
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">Maprang Project</p>
            <h1 className="truncate text-3xl leading-none font-bold tracking-normal">Maprang AI</h1>
          </div>
        </div>
        <button
          className="grid size-9 place-items-center rounded-xl border border-slate-900/10 bg-white text-lg font-bold text-slate-600 md:hidden"
          onClick={onCloseMobile}
          type="button"
        >
          x
        </button>
      </div>

      <SystemStatus healthStatus={healthStatus} onRefresh={onLoadHealth} />

      <AuthPanel onAuthChanged={onAuthChanged} />

      <AdminSummary summary={adminSummary} onRefresh={onLoadAdminSummary} />

      <button
        className="min-h-12 w-full rounded-xl border-0 bg-blue-600 font-extrabold text-white shadow-[0_14px_28px_rgba(31,111,235,0.25)] transition hover:bg-blue-700"
        onClick={handleStartNewChat}
      >
        แชทใหม่
      </button>

      <div className="grid grid-cols-[54px_minmax(0,1fr)] gap-3.5 rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
        <div className="grid size-[54px] place-items-center rounded-2xl bg-orange-100 font-extrabold text-orange-900">
          AI
        </div>
        <div className="min-w-0">
          <h2 className="m-0 truncate text-lg font-bold tracking-normal">{character.name}</h2>
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-500">
            {character.tagline || character.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
            <span>{(character.favoriteCount ?? 0).toLocaleString()} ถูกใจ</span>
            <span>{(character.viewCount ?? 0).toLocaleString()} เข้าชม</span>
            <span>{character.chatCount.toLocaleString()} แชท</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {character.tags.map((tag) => (
          <span
            className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-2 text-[13px] font-bold text-blue-600"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>

      <RelationshipExplainability runtimeState={runtimeState} tags={character.tags} />

      <CharacterCreateForm isSaving={isSavingCharacter} onCreate={onCreateCharacter} />

      <CharacterList
        characters={characters}
        selectedCharacterId={character.id}
        onFilterCharacters={onFilterCharacters}
        onFavoriteCharacter={onFavoriteCharacter}
        onSelectCharacter={handleSelectCharacter}
      />

      <CharacterManager
        character={character}
        isSaving={isSavingCharacter}
        onDelete={onDeleteCharacter}
        onDuplicate={onDuplicateCharacter}
        onResetPrompt={onResetCharacterPrompt}
        onSave={onSaveCharacter}
      />

      <LoreManager
        character={character}
        isLoading={isLoreLoading}
        isSaving={isSavingLore}
        loreEntries={loreEntries}
        onCreate={onCreateLore}
        onDelete={onDeleteLore}
        onLoad={onLoadLore}
        onUpdate={onUpdateLore}
      />

      <section className="flex min-h-0 flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2.5">
          <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">ประวัติแชท</p>
          <button
            className="min-h-7 rounded-full border border-slate-900/10 bg-white/80 px-3 text-xs font-bold text-slate-700"
            onClick={onLoadChatHistory}
            disabled={isHistoryLoading}
          >
            รีเฟรช
          </button>
        </div>

        <div className="flex min-h-30 flex-col gap-2 overflow-y-auto pr-0.5">
          {chatHistory.length === 0 && (
            <p className="m-0 rounded-lg border border-dashed border-slate-900/15 bg-white/60 p-3.5 text-sm leading-relaxed text-slate-500">
              {isHistoryLoading ? 'กำลังโหลด...' : 'ยังไม่มีแชทที่บันทึกไว้'}
            </p>
          )}

          {chatHistory.map((chat) => (
            <div
              className={`grid grid-cols-[minmax(0,1fr)_32px] items-stretch overflow-hidden rounded-lg border bg-white/75 ${
                chat.id === chatId ? 'border-blue-500/40 bg-blue-50' : 'border-slate-900/10'
              }`}
              key={chat.id}
            >
              <button
                className="flex min-w-0 flex-col gap-1 border-0 bg-transparent px-3 py-2.5 text-left"
                onClick={() => handleOpenChat(chat.id)}
              >
                <strong className="truncate text-[13px] text-slate-900">{chat.title}</strong>
                <span className="truncate text-xs text-slate-500">{chat.preview || chat.characterName}</span>
                <small className="truncate text-[11px] text-slate-400">{formatTime(chat.lastMessageAt)}</small>
              </button>
              <button
                className="border-0 border-l border-slate-900/10 bg-transparent text-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                onClick={() => onArchiveChat(chat.id)}
                title="เก็บแชท"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </section>

      <p className="m-0 text-[13px] leading-relaxed text-slate-500">{connectionNote}</p>
    </>
  )
}
