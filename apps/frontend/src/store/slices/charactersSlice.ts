import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import { fetchCharacters, type Character, type CharacterListFilters } from '../../lib/api'

type CharactersState = {
  items: Character[]
  isLoading: boolean
  error: string | null
}

const initialState: CharactersState = {
  items: [],
  isLoading: false,
  error: null,
}

export const loadExploreCharacters = createAsyncThunk(
  'characters/loadExplore',
  async (filters: CharacterListFilters = {}) => {
    const data = await fetchCharacters({ view: 'public', sort: 'popular', limit: 24, ...filters })
    return data.characters ?? []
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
      .addCase(loadExploreCharacters.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Could not load characters'
      })
  },
})

export const selectExploreCharacters = (state: RootState) => state.characters.items
export const selectCharactersLoading = (state: RootState) => state.characters.isLoading
export const selectCharactersError = (state: RootState) => state.characters.error
export default charactersSlice.reducer
