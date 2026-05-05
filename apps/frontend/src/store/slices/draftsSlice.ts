import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

type DraftsState = {
  composerByKey: Record<string, string>
  personaDraft: string
  creatorDraftUpdatedAt: string | null
}

const initialState: DraftsState = {
  composerByKey: {},
  personaDraft: '',
  creatorDraftUpdatedAt: null,
}

const draftsSlice = createSlice({
  name: 'drafts',
  initialState,
  reducers: {
    hydrateDrafts(_state, action: PayloadAction<DraftsState>) {
      return action.payload
    },
    saveComposerDraft(state, action: PayloadAction<{ key: string; value: string }>) {
      state.composerByKey[action.payload.key] = action.payload.value
    },
    savePersonaDraft(state, action: PayloadAction<string>) {
      state.personaDraft = action.payload
    },
    markCreatorDraftSaved(state, action: PayloadAction<string>) {
      state.creatorDraftUpdatedAt = action.payload
    },
  },
})

export const { hydrateDrafts, markCreatorDraftSaved, saveComposerDraft, savePersonaDraft } = draftsSlice.actions
export const selectComposerDraft = (key: string) => (state: RootState) => state.drafts.composerByKey[key] ?? ''
export const selectPersonaDraft = (state: RootState) => state.drafts.personaDraft
export const selectCreatorDraftUpdatedAt = (state: RootState) => state.drafts.creatorDraftUpdatedAt
export default draftsSlice.reducer
