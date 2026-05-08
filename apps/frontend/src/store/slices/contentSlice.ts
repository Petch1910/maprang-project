import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchContentSettings, updateContentSettings } from '../../lib/api'
import type { RootState } from '../store'

export type ContentRating = 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'

type ContentState = {
  isAdult: boolean
  ageGateAnswered: boolean
  showMature: boolean
  maxRating: ContentRating
}

const initialState: ContentState = {
  isAdult: false,
  ageGateAnswered: false,
  showMature: false,
  maxRating: 'teen_romance',
}

export const loadContentSettings = createAsyncThunk('content/loadSettings', async () => {
  const data = await fetchContentSettings()
  return data.contentSettings
})

export const saveContentSettings = createAsyncThunk(
  'content/saveSettings',
  async (input: { isAdult: boolean; maxRating?: ContentRating }) => {
    const data = await updateContentSettings(input)
    return data.contentSettings
  },
)

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    hydrateContent(_state, action: PayloadAction<ContentState>) {
      return action.payload
    },
    applyContentSettings(state, action: PayloadAction<{ isAdult: boolean; maxRating: ContentRating }>) {
      state.isAdult = action.payload.isAdult
      state.ageGateAnswered = true
      state.showMature = action.payload.isAdult ? state.showMature : false
      state.maxRating = action.payload.maxRating
    },
    setAdultStatus(state, action: PayloadAction<boolean>) {
      state.isAdult = action.payload
      state.ageGateAnswered = true
      state.showMature = action.payload ? state.showMature : false
      state.maxRating = action.payload ? 'restricted_18' : 'teen_romance'
    },
    setShowMature(state, action: PayloadAction<boolean>) {
      state.showMature = state.isAdult && action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadContentSettings.fulfilled, (state, action) => {
        state.isAdult = action.payload.isAdult
        state.ageGateAnswered = true
        state.showMature = action.payload.isAdult ? state.showMature : false
        state.maxRating = action.payload.maxRating
      })
      .addCase(saveContentSettings.fulfilled, (state, action) => {
        state.isAdult = action.payload.isAdult
        state.ageGateAnswered = true
        state.showMature = action.payload.isAdult ? state.showMature : false
        state.maxRating = action.payload.maxRating
      })
  },
})

export const { applyContentSettings, hydrateContent, setAdultStatus, setShowMature } = contentSlice.actions
export const selectContentSettings = (state: RootState) => state.content
export default contentSlice.reducer
