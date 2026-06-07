// API helper functions for components
// Note: Uses GET/POST from api.ts to comply with QA standards
import { GET, POST } from './api'

/**
 * Daily login - Claim daily reward
 */
export async function claimDailyLogin() {
  return POST('/user/me/daily-login', {})
}

/**
 * Load creator scenarios for preview
 */
export async function loadCreatorScenarios(preset: string = 'basic') {
  return GET(`/creator/scenarios?preset=${preset}`)
}

/**
 * Preview chat with character
 */
export async function previewChatMessage(params: {
  characterId?: string
  characterData?: any
  userMessage: string
  mockMode?: boolean
}) {
  return POST('/creator/preview-chat', params)
}
