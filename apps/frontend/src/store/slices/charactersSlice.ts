import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchCharacters, type CharacterListFilters } from '../../lib/api'
import { filterVisibleCharacters } from '../../lib/qaSeedVisibility'
import type { CharactersState, RootState } from '../types'

const initialState: CharactersState = {
  items: [],
  isLoading: false,
  error: null,
}

export const loadExploreCharacters = createAsyncThunk(
  'characters/loadExplore',
  async (filters: CharacterListFilters = {}) => {
    const data = await fetchCharacters({ view: 'public', sort: 'popular', limit: 24, ...filters })
    return filterVisibleCharacters(data.characters ?? [])
  },
)

const charactersSlice = createSlice({
  name: 'characters',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadExploreCharacters.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadExploreCharacters.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(loadExploreCharacters.rejected, (state) => {
        state.isLoading = false
        state.error = 'โหลดรายการตัวละครไม่ได้'
      })
  },
})

export const selectExploreCharacters = (state: RootState) => state.characters.items
export const selectCharactersLoading = (state: RootState) => state.characters.isLoading
export const selectCharactersError = (state: RootState) => state.characters.error
export default charactersSlice.reducer
