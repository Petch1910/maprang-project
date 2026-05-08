import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import { fetchChats, type ChatSummary } from '../../lib/api'

type ChatsState = {
  items: ChatSummary[]
  isLoading: boolean
  error: string | null
}

const initialState: ChatsState = {
  items: [],
  isLoading: false,
  error: null,
}

export const loadChatSummaries = createAsyncThunk('chats/loadSummaries', async () => {
  const data = await fetchChats()
  return data.chats ?? []
})

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadChatSummaries.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadChatSummaries.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(loadChatSummaries.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Could not load chats'
      })
  },
})

export const selectChatSummaries = (state: RootState) => state.chats.items
export function isPlayableChatSummary(chat: ChatSummary) {
  const title = chat.title?.trim().toLowerCase() ?? ''
  const preview = chat.preview?.trim().toLowerCase() ?? ''
  return !(
    title === 'message report guard' ||
    title.startsWith('reply with a very short') ||
    preview.includes('only the chat owner should be able to report') ||
    preview.includes('reply with a very short thai greeting')
  )
}

export const selectPlayableChatSummaries = createSelector([selectChatSummaries], (items) =>
  items.filter(isPlayableChatSummary),
)
export const selectChatsLoading = (state: RootState) => state.chats.isLoading
export const selectChatsError = (state: RootState) => state.chats.error
export const selectPendingSceneSummaries = createSelector([selectPlayableChatSummaries], (items) =>
  items.flatMap((chat) =>
    (chat.sceneState?.pendingEvents ?? [])
      .filter((event) => event.status === 'pending')
      .map((event) => ({
        id: `${chat.id}:${event.code}`,
        chatId: chat.id,
        chatTitle: chat.title || chat.characterName,
        characterName: chat.characterName,
        title: event.title,
        prompt: event.prompt,
        relationshipStatus: chat.relationshipState?.status ?? 'NEUTRAL',
        expiresAtTurn: event.expiresAtTurn,
      })),
  ),
)
export const selectPendingSceneCount = createSelector([selectPendingSceneSummaries], (events) => events.length)
export default chatsSlice.reducer
