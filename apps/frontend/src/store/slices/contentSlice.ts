import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export type ContentRating = 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'

type ContentState = {
  isAdult: boolean
  showMature: boolean
  maxRating: ContentRating
}

const initialState: ContentState = {
  isAdult: false,
  showMature: false,
  maxRating: 'teen_romance',
}

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    hydrateContent(_state, action: PayloadAction<ContentState>) {
      return action.payload
    },
    setAdultStatus(state, action: PayloadAction<boolean>) {
      state.isAdult = action.payload
      state.showMature = action.payload ? state.showMature : false
      state.maxRating = action.payload ? 'restricted_18' : 'teen_romance'
    },
    setShowMature(state, action: PayloadAction<boolean>) {
      state.showMature = state.isAdult && action.payload
    },
  },
})

export const { hydrateContent, setAdultStatus, setShowMature } = contentSlice.actions
export const selectContentSettings = (state: RootState) => state.content
export default contentSlice.reducer
