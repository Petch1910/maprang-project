import { configureStore } from '@reduxjs/toolkit'
import charactersReducer from './slices/charactersSlice'
import chatsReducer from './slices/chatsSlice'
import contentReducer, { hydrateContent } from './slices/contentSlice'
import draftsReducer, { hydrateDrafts } from './slices/draftsSlice'
import eventsReducer from './slices/eventsSlice'
import walletReducer from './slices/walletSlice'
import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem } from '../lib/safeStorage'
export type { RootState } from './types'

type PersistedState = {
  content?: ReturnType<typeof contentReducer>
  drafts?: ReturnType<typeof draftsReducer>
}

const persistedState = (() => {
  if (typeof window === 'undefined') return undefined
  const raw = safeGetStorageItem(window.localStorage, 'maprang:redux:v1')
  if (!raw) return undefined

  try {
    return JSON.parse(raw) as PersistedState
  } catch {
    safeRemoveStorageItem(window.localStorage, 'maprang:redux:v1')
    return undefined
  }
})()

export const store = configureStore({
  reducer: {
    characters: charactersReducer,
    chats: chatsReducer,
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
    safeSetStorageItem(
      window.localStorage,
      'maprang:redux:v1',
      JSON.stringify({
        content: state.content,
        drafts: state.drafts,
      }),
    )
  })
}

export type AppDispatch = typeof store.dispatch
