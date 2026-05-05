import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export type PendingEventSummary = {
  id: string
  chatId: string
  characterName: string
  title: string
  relationshipStatus: string
  expiresAtTurn?: number
}

type EventsState = {
  pending: PendingEventSummary[]
}

const initialState: EventsState = {
  pending: [],
}

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setPendingEvents(state, action: PayloadAction<PendingEventSummary[]>) {
      state.pending = action.payload
    },
  },
})

export const { setPendingEvents } = eventsSlice.actions
export const selectPendingEvents = (state: RootState) => state.events.pending
export const selectEventCount = (state: RootState) => state.events.pending.length
export default eventsSlice.reducer
