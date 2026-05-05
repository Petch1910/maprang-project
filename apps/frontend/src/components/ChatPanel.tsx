import type { RefObject } from 'react'
import type { Character, ChatMessage, ChatResponse, ChatRuntimeState } from '../lib/api'
import { starterPrompts } from '../lib/chat'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'

type ChatUsage = NonNullable<ChatResponse['usage']>

type ChatPanelProps = {
  character: Character
  chatEndRef: RefObject<HTMLDivElement | null>
  chatId: string | null
  chatLog: ChatMessage[]
  isLoading: boolean
  lastUsage: ChatUsage | null
  runtimeState: ChatRuntimeState | null
  message: string
  onMessageChange: (message: string) => void
  onOpenMenu: () => void
  onSceneAction: (
    action: 'enter' | 'hold' | 'decline' | 'exit' | 'resolve' | 'accept' | 'reject',
    code?: string,
  ) => void
  onSendMessage: (message?: string) => void
}

function UsageStrip({ usage }: { usage: ChatUsage | null }) {
  if (!usage) return null

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-900/10 bg-white/45 px-4 py-2 text-xs font-bold text-slate-500 sm:px-8">
      <span>used {usage.totalTokens.toLocaleString()} tokens</span>
      {usage.tokenBalance !== undefined && usage.tokenBalance !== null && (
        <span>balance {usage.tokenBalance.toLocaleString()}</span>
      )}
      {usage.contextLoreCount !== undefined && <span>lore {usage.contextLoreCount}</span>}
      {usage.cost !== undefined && usage.cost > 0 && <span>${usage.cost.toFixed(6)}</span>}
    </div>
  )
}

function RuntimeStateStrip({
  runtimeState,
  onSceneAction,
  isLoading,
}: {
  runtimeState: ChatRuntimeState | null
  onSceneAction: (
    action: 'enter' | 'hold' | 'decline' | 'exit' | 'resolve' | 'accept' | 'reject',
    code?: string,
  ) => void
  isLoading: boolean
}) {
  if (!runtimeState) return null

  const relationship = runtimeState.relationshipState
  const scene = runtimeState.sceneState
  const pendingEvent = scene.pendingEvents.find((event) => event.status === 'pending') ?? scene.pendingEvents[0]
  const stats = [
    ['aff', relationship.affinity],
    ['trust', relationship.trust],
    ['int', relationship.intimacy],
    ['dom', relationship.dominance],
    ['fear', relationship.fear],
    ['resp', relationship.respect],
  ] as const

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-900/10 bg-white/45 px-4 py-2 text-xs font-bold text-slate-500 sm:px-8">
      <span>turn {runtimeState.memory.turnCount.toLocaleString()}</span>
      <span>{scene.mode}</span>
      <span>{scene.currentScene}</span>
      <span>intent {scene.lastUserIntent}</span>
      <span>{relationship.status}</span>
      <span>tier {relationship.tier}</span>
      <span>tone {relationship.tone}</span>
      {pendingEvent && scene.mode === 'sandbox' && (
        <span className="rounded-full border border-amber-400/50 bg-amber-100 px-2 py-1 text-amber-800">
          scene ready: {pendingEvent.title}
        </span>
      )}
      {scene.activeScene && (
        <>
          <button
            className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-green-700 transition hover:bg-green-500/15 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => onSceneAction('accept')}
            type="button"
          >
            accept
          </button>
          <button
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-700 transition hover:bg-blue-500/15 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => onSceneAction('resolve')}
            type="button"
          >
            resolve
          </button>
          <button
            className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-700 transition hover:bg-rose-500/15 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => onSceneAction('reject')}
            type="button"
          >
            reject
          </button>
          <button
            className="rounded-full border border-slate-900/10 bg-white px-2 py-1 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => onSceneAction('exit')}
            type="button"
          >
            exit
          </button>
        </>
      )}
      {pendingEvent && scene.mode === 'sandbox' && (
        <>
          <button
            className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-green-700 transition hover:bg-green-500/15 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => onSceneAction('enter', pendingEvent.code)}
            type="button"
          >
            enter
          </button>
          <button
            className="rounded-full border border-slate-900/10 bg-white px-2 py-1 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => onSceneAction('hold', pendingEvent.code)}
            type="button"
          >
            later
          </button>
          <button
            className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-700 transition hover:bg-rose-500/15 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => onSceneAction('decline', pendingEvent.code)}
            type="button"
          >
            skip
          </button>
        </>
      )}
      {relationship.constraints.length > 0 && <span>guard {relationship.constraints.join(', ')}</span>}
      {stats.map(([label, value]) => (
        <span key={label}>
          {label} {value}
        </span>
      ))}
    </div>
  )
}

export function ChatPanel({
  character,
  chatEndRef,
  chatId,
  chatLog,
  isLoading,
  lastUsage,
  runtimeState,
  message,
  onMessageChange,
  onOpenMenu,
  onSceneAction,
  onSendMessage,
}: ChatPanelProps) {
  return (
    <section className="grid min-h-svh min-w-0 grid-rows-[auto_auto_auto_1fr_auto_auto]">
      <header className="flex items-center justify-between gap-4 border-b border-slate-900/10 bg-white/60 px-4 py-4 backdrop-blur-xl sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="grid size-10 place-items-center rounded-xl border border-slate-900/10 bg-white text-lg font-extrabold text-slate-700 shadow-sm md:hidden"
            onClick={onOpenMenu}
            title="Open menu"
            type="button"
          >
            Menu
          </button>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">Ready to chat</p>
            <h2 className="m-0 truncate text-xl font-bold tracking-normal sm:text-2xl">Chat with {character.name}</h2>
          </div>
        </div>
        <div className="inline-flex min-h-9 flex-none items-center gap-2 rounded-full border border-green-500/25 bg-green-500/10 px-3 text-sm font-extrabold text-green-700">
          <span className="size-2 rounded-full bg-green-500" />
          {chatId ? 'Saved' : 'Online'}
        </div>
      </header>

      <UsageStrip usage={lastUsage} />
      <RuntimeStateStrip isLoading={isLoading} onSceneAction={onSceneAction} runtimeState={runtimeState} />

      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        {chatLog.map((chat) => (
          <MessageBubble chat={chat} key={chat.id} />
        ))}

        {isLoading && chatLog.at(-1)?.role !== 'assistant' && (
          <article className="grid max-w-[min(760px,92%)] grid-cols-[40px_minmax(0,auto)] items-end gap-3 self-start">
            <div className="grid size-10 place-items-center rounded-full bg-orange-100 text-xs font-extrabold text-orange-900">
              AI
            </div>
            <p className="m-0 rounded-[18px] bg-white px-4 py-3.5 leading-relaxed text-slate-500 shadow-[0_16px_44px_rgba(61,79,112,0.10)]">
              Maprang is typing...
            </p>
          </article>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-4 pb-4 sm:px-8">
        {starterPrompts.map((prompt) => (
          <button
            className="min-h-10 flex-none rounded-full border border-slate-900/10 bg-white/80 px-3.5 text-sm text-slate-700 transition hover:bg-white disabled:opacity-60"
            key={prompt}
            onClick={() => onSendMessage(prompt)}
            disabled={isLoading}
          >
            {prompt}
          </button>
        ))}
      </div>

      <Composer
        disabled={isLoading}
        message={message}
        onMessageChange={onMessageChange}
        onSubmit={() => onSendMessage()}
      />
    </section>
  )
}
