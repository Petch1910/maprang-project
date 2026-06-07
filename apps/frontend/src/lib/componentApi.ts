// API helper functions for components
// Uses direct fetch with readApiJson to comply with QA standards
import { readApiJson } from './api'

/**
 * GET request helper
 */
async function GET(path: string) {
  const response = await fetch(`/api${path}`)
  return readApiJson(response)
}

/**
 * POST request helper
 */
async function POST(path: string, body: any) {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readApiJson(response)
}

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
