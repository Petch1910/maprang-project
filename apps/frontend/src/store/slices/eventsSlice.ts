import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EventsState, PendingEventSummary, RootState } from '../types'
export type { PendingEventSummary } from '../types'

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
