// API helper functions for components
import { readApiJson, logUnexpectedError } from './api'

/**
 * Daily login - Claim daily reward
 */
export async function claimDailyLogin() {
  const response = await fetch('/api/user/me/daily-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  return readApiJson(response)
}

/**
 * Load creator scenarios for preview
 */
export async function loadCreatorScenarios(preset: string = 'basic') {
  const response = await fetch(`/api/creator/scenarios?preset=${preset}`)
  return readApiJson(response)
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
  const response = await fetch('/api/creator/preview-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error('Preview chat failed')
  }

  return readApiJson(response)
}
