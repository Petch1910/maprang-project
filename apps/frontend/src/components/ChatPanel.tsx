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
  const balance = usage.tokenBalance
  const isLowBalance = typeof balance === 'number' && balance <= 5

  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs font-bold sm:px-8 ${
        isLowBalance
          ? 'border-amber-300/60 bg-amber-50 text-amber-900'
          : 'border-slate-900/10 bg-white/45 text-slate-500'
      }`}
    >
      <span>Used {usage.totalTokens.toLocaleString()} tokens</span>
      {typeof balance === 'number' && <span>Balance {balance.toLocaleString()}</span>}
      {isLowBalance && (
        <span className="rounded-full bg-amber-200/70 px-2 py-1 text-amber-950">
          Token is low. Finish the next turn carefully.
        </span>
      )}
      {usage.contextLoreCount !== undefined && <span>lore {usage.contextLoreCount}</span>}
      {usage.cost !== undefined && usage.cost > 0 && <span>${usage.cost.toFixed(6)}</span>}
    </div>
  )
}

function metricWidth(value: number) {
  return `${Math.max(0, Math.min(100, Math.abs(value)))}%`
}

function relationshipLabel(status?: string) {
  const labels: Record<string, string> = {
    RIVAL: 'Rival',
    NEUTRAL: 'Neutral',
    CLOSE: 'Close',
    TRUSTED: 'Trusted',
    ROMANTIC: 'Romantic',
  }
  return status ? labels[status] ?? status.toLowerCase() : 'Starting'
}

function RelationshipTopBar({
  runtimeState,
  character,
}: {
  runtimeState: ChatRuntimeState | null
  character: Character
}) {
  const relationship = runtimeState?.relationshipState
  const momentum = runtimeState?.memory.emotionalMomentum
  const stats = relationship
    ? [
        ['Affinity', relationship.affinity, 'bg-rose-500'],
        ['Trust', relationship.trust, 'bg-sky-500'],
        ['Intimacy', relationship.intimacy, 'bg-violet-500'],
        ['Respect', relationship.respect, 'bg-emerald-500'],
      ]
    : []

  return (
    <div className="border-b border-slate-900/10 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold tracking-widest text-slate-500 uppercase">Relationship</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-slate-950 sm:text-lg">
              {character.name} / {relationshipLabel(relationship?.status)}
            </span>
            {relationship?.tier && (
              <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
                {relationship.tier}
              </span>
            )}
            {relationship?.tone && (
              <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-bold text-orange-800">
                tone {relationship.tone}
              </span>
            )}
            {momentum?.direction && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">
                momentum {momentum.direction}
              </span>
            )}
          </div>
        </div>

        {stats.length > 0 && (
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[430px]">
            {stats.map(([label, value, color]) => (
              <div key={label} className="min-w-0 rounded-lg border border-slate-900/10 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color}`} style={{ width: metricWidth(value as number) }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SceneRuntimePanel({
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

  const scene = runtimeState.sceneState
  const pendingEvent = scene.pendingEvents.find((event) => event.status === 'pending') ?? scene.pendingEvents[0]
  const activeScene = scene.activeScene

  return (
    <div className="border-b border-slate-900/10 bg-white/55 px-4 py-3 sm:px-8">
      {activeScene ? (
        <div className="rounded-lg border border-slate-900/15 bg-slate-950 px-4 py-3 text-white shadow-[0_20px_60px_rgba(15,23,42,0.20)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-xs font-extrabold tracking-widest text-slate-400 uppercase">Scene Mode</p>
              <h3 className="m-0 mt-1 truncate text-base font-extrabold">{activeScene.title}</h3>
              <p className="m-0 mt-1 text-sm leading-relaxed text-slate-300">{activeScene.objective}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="min-h-10 rounded-full bg-emerald-400 px-3 text-sm font-extrabold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
                disabled={isLoading}
                onClick={() => onSceneAction('accept')}
                type="button"
              >
                Accept
              </button>
              <button
                className="min-h-10 rounded-full bg-sky-400 px-3 text-sm font-extrabold text-sky-950 transition hover:bg-sky-300 disabled:opacity-60"
                disabled={isLoading}
                onClick={() => onSceneAction('resolve')}
                type="button"
              >
                Resolve
              </button>
              <button
                className="min-h-10 rounded-full bg-rose-400 px-3 text-sm font-extrabold text-rose-950 transition hover:bg-rose-300 disabled:opacity-60"
                disabled={isLoading}
                onClick={() => onSceneAction('reject')}
                type="button"
              >
                Reject
              </button>
              <button
                className="min-h-10 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-extrabold text-white transition hover:bg-white/15 disabled:opacity-60"
                disabled={isLoading}
                onClick={() => onSceneAction('exit')}
                type="button"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      ) : pendingEvent && scene.mode === 'sandbox' ? (
        <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-xs font-extrabold tracking-widest uppercase">Scene Ready</p>
              <h3 className="m-0 mt-1 text-base font-extrabold">{pendingEvent.title}</h3>
              <p className="m-0 mt-1 text-sm leading-relaxed text-amber-900">{pendingEvent.prompt}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="min-h-10 rounded-full bg-amber-900 px-3 text-sm font-extrabold text-white transition hover:bg-amber-800 disabled:opacity-60"
                disabled={isLoading}
                onClick={() => onSceneAction('enter', pendingEvent.code)}
                type="button"
              >
                Enter Scene
              </button>
              <button
                className="min-h-10 rounded-full border border-amber-300 bg-white/70 px-3 text-sm font-extrabold text-amber-950 transition hover:bg-white disabled:opacity-60"
                disabled={isLoading}
                onClick={() => onSceneAction('hold', pendingEvent.code)}
                type="button"
              >
                Later
              </button>
              <button
                className="min-h-10 rounded-full border border-rose-300 bg-rose-50 px-3 text-sm font-extrabold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
                disabled={isLoading}
                onClick={() => onSceneAction('decline', pendingEvent.code)}
                type="button"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          <span>Sandbox</span>
          <span>Turn {runtimeState.memory.turnCount.toLocaleString()}</span>
          <span>Intent {scene.lastUserIntent}</span>
        </div>
      )}
    </div>
  )
}

function SceneBackdrop({ runtimeState }: { runtimeState: ChatRuntimeState | null }) {
  if (runtimeState?.sceneState.mode !== 'scene') return null
  return (
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(15,23,42,0.10)_58%,rgba(15,23,42,0.34)_100%)]" />
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
  const isSceneMode = runtimeState?.sceneState.mode === 'scene'

  return (
    <section
      className={`relative grid min-h-svh min-w-0 grid-rows-[auto_auto_auto_auto_1fr_auto_auto] overflow-hidden transition-colors duration-300 ${
        isSceneMode ? 'bg-slate-950/5' : ''
      }`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-slate-900/10 bg-white/60 px-4 py-4 backdrop-blur-xl sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="grid size-10 place-items-center rounded-lg border border-slate-900/10 bg-white text-xs font-extrabold text-slate-700 shadow-sm md:hidden"
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

      <RelationshipTopBar character={character} runtimeState={runtimeState} />
      <UsageStrip usage={lastUsage} />
      <SceneRuntimePanel isLoading={isLoading} onSceneAction={onSceneAction} runtimeState={runtimeState} />

      <div
        className={`relative flex flex-col gap-4 overflow-y-auto px-4 py-6 transition-all duration-300 sm:px-8 sm:py-8 ${
          isSceneMode ? 'bg-slate-950/5' : ''
        }`}
      >
        <SceneBackdrop runtimeState={runtimeState} />
        {chatLog.map((chat) => (
          <MessageBubble chat={chat} key={chat.id} />
        ))}

        {isLoading && chatLog.at(-1)?.role !== 'assistant' && (
          <article className="relative grid max-w-[min(760px,92%)] grid-cols-[40px_minmax(0,auto)] items-end gap-3 self-start">
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
