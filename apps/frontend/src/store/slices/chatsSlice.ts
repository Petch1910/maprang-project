import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
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
export const selectChatsLoading = (state: RootState) => state.chats.isLoading
export const selectChatsError = (state: RootState) => state.chats.error
export const selectPendingSceneSummaries = (state: RootState) =>
  state.chats.items.flatMap((chat) =>
    (chat.sceneState?.pendingEvents ?? [])
      .filter((event) => event.status === 'pending')
      .map((event) => ({
        id: `${chat.id}:${event.code}`,
        chatId: chat.id,
        characterName: chat.characterName,
        title: event.title,
        prompt: event.prompt,
        relationshipStatus: chat.relationshipState?.status ?? 'NEUTRAL',
        expiresAtTurn: event.expiresAtTurn,
      })),
  )
export const selectPendingSceneCount = (state: RootState) => selectPendingSceneSummaries(state).length
export default chatsSlice.reducer
