import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchContentSettings, updateContentSettings } from '../../lib/api'
import type { ContentRating, ContentState, RootState } from '../types'
export type { ContentRating } from '../types'

const initialState: ContentState = {
  isAdult: false,
  ageGateAnswered: false,
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
    hydrateContent(_state, action: PayloadAction<Partial<ContentState>>) {
      return {
        isAdult: action.payload.isAdult ?? initialState.isAdult,
        ageGateAnswered: action.payload.ageGateAnswered ?? initialState.ageGateAnswered,
        maxRating: action.payload.maxRating ?? initialState.maxRating,
      }
    },
    setAdultStatus(state, action: PayloadAction<boolean>) {
      state.isAdult = action.payload
      state.ageGateAnswered = true
      state.maxRating = action.payload ? 'restricted_18' : 'teen_romance'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadContentSettings.fulfilled, (state, action) => {
        state.isAdult = action.payload.isAdult
        state.ageGateAnswered = true
        state.maxRating = action.payload.maxRating
      })
      .addCase(saveContentSettings.fulfilled, (state, action) => {
        state.isAdult = action.payload.isAdult
        state.ageGateAnswered = true
        state.maxRating = action.payload.maxRating
      })
  },
})

export const { hydrateContent, setAdultStatus } = contentSlice.actions
export const selectContentSettings = (state: RootState) => state.content
export default contentSlice.reducer
