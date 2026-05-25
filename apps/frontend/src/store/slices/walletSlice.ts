import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchUsageSummary } from '../../lib/api'
import type { RootState, WalletState } from '../types'

const initialState: WalletState = {
  tokenBalance: 0,
  lowTokenThreshold: 250,
  isLoading: false,
}

export const loadWalletSummary = createAsyncThunk('wallet/loadSummary', async () => {
  const data = await fetchUsageSummary()
  return data.user.tokenBalance
})

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setTokenBalance(state, action: PayloadAction<number>) {
      state.tokenBalance = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWalletSummary.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loadWalletSummary.fulfilled, (state, action) => {
        state.isLoading = false
        state.tokenBalance = action.payload
      })
      .addCase(loadWalletSummary.rejected, (state) => {
        state.isLoading = false
      })
  },
})

export const { setTokenBalance } = walletSlice.actions
export const selectTokenBalance = (state: RootState) => state.wallet.tokenBalance
export const selectWalletLoading = (state: RootState) => state.wallet.isLoading
export const selectIsLowToken = (state: RootState) => state.wallet.tokenBalance <= state.wallet.lowTokenThreshold
export default walletSlice.reducer
