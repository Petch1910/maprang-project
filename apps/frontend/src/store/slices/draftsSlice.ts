import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchUserPersona, updateUserPersona } from '../../lib/api'
import type { DraftsState, RootState } from '../types'

const initialState: DraftsState = {
  composerByKey: {},
  personaDraft: '',
  personaUpdatedAt: null,
  creatorDraftUpdatedAt: null,
}

const localPersonaMaxChars = 2000

function timeMs(value: string | null | undefined) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const loadPersonaDraft = createAsyncThunk('drafts/loadPersona', async () => {
  const data = await fetchUserPersona()
  return data.persona
})

export const savePersonaDraftToCloud = createAsyncThunk('drafts/savePersona', async (persona: string) => {
  const data = await updateUserPersona(persona.slice(0, localPersonaMaxChars))
  return data.persona
})

const draftsSlice = createSlice({
  name: 'drafts',
  initialState,
  reducers: {
    hydrateDrafts(_state, action: PayloadAction<Partial<DraftsState>>) {
      return { ...initialState, ...action.payload }
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
  extraReducers: (builder) => {
    builder
      .addCase(loadPersonaDraft.fulfilled, (state, action) => {
        const serverUpdatedAt = timeMs(action.payload.updatedAt)
        const localUpdatedAt = timeMs(state.personaUpdatedAt)
        if (!state.personaDraft.trim() || (serverUpdatedAt > 0 && serverUpdatedAt >= localUpdatedAt)) {
          state.personaDraft = action.payload.persona
          state.personaUpdatedAt = action.payload.updatedAt
        }
      })
      .addCase(savePersonaDraftToCloud.fulfilled, (state, action) => {
        if (state.personaDraft === action.meta.arg || state.personaDraft.length > action.payload.maxChars) {
          state.personaDraft = action.payload.persona
        }
        state.personaUpdatedAt = action.payload.updatedAt
      })
  },
})

export const { hydrateDrafts, markCreatorDraftSaved, saveComposerDraft, savePersonaDraft } = draftsSlice.actions
export const selectComposerDraft = (key: string) => (state: RootState) => state.drafts.composerByKey[key] ?? ''
export const selectPersonaDraft = (state: RootState) => state.drafts.personaDraft
export const selectPersonaUpdatedAt = (state: RootState) => state.drafts.personaUpdatedAt
export const selectCreatorDraftUpdatedAt = (state: RootState) => state.drafts.creatorDraftUpdatedAt
export default draftsSlice.reducer
