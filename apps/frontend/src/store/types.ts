import type { Character, ChatSummary } from '../lib/api'

export type ContentRating = 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'

export type CharactersState = {
  items: Character[]
  isLoading: boolean
  error: string | null
}

export type ChatsState = {
  items: ChatSummary[]
  isLoading: boolean
  error: string | null
}

export type ContentState = {
  isAdult: boolean
  ageGateAnswered: boolean
  showMature: boolean
  maxRating: ContentRating
}

export type DraftsState = {
  composerByKey: Record<string, string>
  personaDraft: string
  personaUpdatedAt: string | null
  creatorDraftUpdatedAt: string | null
}

export type WalletState = {
  tokenBalance: number
  lowTokenThreshold: number
  isLoading: boolean
}

export type RootState = {
  characters: CharactersState
  chats: ChatsState
  content: ContentState
  drafts: DraftsState
  wallet: WalletState
}
