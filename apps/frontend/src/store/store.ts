import { configureStore } from '@reduxjs/toolkit'
import contentReducer, { hydrateContent } from './slices/contentSlice'
import draftsReducer, { hydrateDrafts } from './slices/draftsSlice'
import eventsReducer from './slices/eventsSlice'
import walletReducer from './slices/walletSlice'

type PersistedState = {
  content?: ReturnType<typeof contentReducer>
  drafts?: ReturnType<typeof draftsReducer>
}

const persistedState = (() => {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem('maprang:redux:v1')
  if (!raw) return undefined

  try {
    return JSON.parse(raw) as PersistedState
  } catch {
    window.localStorage.removeItem('maprang:redux:v1')
    return undefined
  }
})()

export const store = configureStore({
  reducer: {
    content: contentReducer,
    drafts: draftsReducer,
    events: eventsReducer,
    wallet: walletReducer,
  },
})

if (typeof window !== 'undefined') {
  if (persistedState?.content) store.dispatch(hydrateContent(persistedState.content))
  if (persistedState?.drafts) store.dispatch(hydrateDrafts(persistedState.drafts))

  store.subscribe(() => {
    const state = store.getState()
    window.localStorage.setItem(
      'maprang:redux:v1',
      JSON.stringify({
        content: state.content,
        drafts: state.drafts,
      }),
    )
  })
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
