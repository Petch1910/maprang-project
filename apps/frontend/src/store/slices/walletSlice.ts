import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

type WalletState = {
  tokenBalance: number
  lowTokenThreshold: number
  isLoading: boolean
}

const initialState: WalletState = {
  tokenBalance: 0,
  lowTokenThreshold: 250,
  isLoading: false,
}

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setTokenBalance(state, action: PayloadAction<number>) {
      state.tokenBalance = action.payload
    },
    setWalletLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
  },
})

export const { setTokenBalance, setWalletLoading } = walletSlice.actions
export const selectTokenBalance = (state: RootState) => state.wallet.tokenBalance
export const selectIsLowToken = (state: RootState) => state.wallet.tokenBalance <= state.wallet.lowTokenThreshold
export default walletSlice.reducer
