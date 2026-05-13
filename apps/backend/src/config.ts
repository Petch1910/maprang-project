export const defaultUserId = '550e8400-e29b-41d4-a716-446655440000'
export const defaultCharacterId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
export const serverHost = process.env.HOST || '0.0.0.0'
export const serverPort = Number(process.env.PORT ?? 3000)
export const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'
export const modelInputCostPer1M = Number(process.env.MODEL_INPUT_COST_PER_1M ?? 0)
export const modelOutputCostPer1M = Number(process.env.MODEL_OUTPUT_COST_PER_1M ?? 0)
function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) ? value : fallback
}

export const modelTemperature = Math.min(Math.max(numberEnv('MODEL_TEMPERATURE', 0.85), 0), 2)
export const modelMaxOutputTokens = Math.min(Math.max(Math.round(numberEnv('MODEL_MAX_OUTPUT_TOKENS', 1200)), 128), 2400)
export const modelMinRoleplayReplyChars = Math.min(
  Math.max(Math.round(numberEnv('MODEL_MIN_ROLEPLAY_REPLY_CHARS', 320)), 0),
  1200,
)
export const chatProviderRetryAttempts = Math.min(
  Math.max(Math.round(numberEnv('CHAT_PROVIDER_RETRY_ATTEMPTS', 2)), 1),
  5,
)
export const chatProviderRetryDelayMs = Math.min(
  Math.max(Math.round(numberEnv('CHAT_PROVIDER_RETRY_DELAY_MS', 350)), 0),
  5000,
)
export const creatorDraftRetryAttempts = Math.min(
  Math.max(Math.round(numberEnv('CREATOR_DRAFT_RETRY_ATTEMPTS', 3)), 1),
  5,
)
export const creatorDraftRetryDelayMs = Math.min(
  Math.max(Math.round(numberEnv('CREATOR_DRAFT_RETRY_DELAY_MS', 350)), 0),
  5000,
)
export const maxInputChars = Number(process.env.MAX_INPUT_CHARS ?? 4000)
export const minTokenBalanceForChat = Number(process.env.MIN_TOKEN_BALANCE_FOR_CHAT ?? 1)
export const imageGenerationConfigured = Boolean(process.env.IMAGE_GENERATION_API_KEY || process.env.OPENAI_API_KEY)
export const imageGenerationModel = process.env.IMAGE_GENERATION_MODEL || 'gpt-image-1.5'
export const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
export const supabaseAuthConfigured = Boolean(process.env.SUPABASE_URL || process.env.SUPABASE_JWT_ISSUER)
export const adminAuthConfigured = Boolean(process.env.ADMIN_API_KEY)
export const supabaseStorageConfigured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_STORAGE_BUCKET,
)
const requestedStorageProvider =
  process.env.STORAGE_PROVIDER === 'local' || process.env.STORAGE_PROVIDER === 'supabase'
    ? process.env.STORAGE_PROVIDER
    : null
export const storageProvider =
  requestedStorageProvider ?? (process.env.NODE_ENV === 'production' && supabaseStorageConfigured ? 'supabase' : 'local')
export const defaultSystemPrompt =
  'You are Maprang, a Thai-first AI companion. Be warm, practical, emotionally present, and honest. Give enough detail for the user to feel answered rather than brushed off. For roleplay, write naturally in scene with 3-6 short paragraphs, sensory detail, character emotion, and one hook for the user to answer. Unless the user asks for brevity, avoid one-line replies; a normal roleplay turn should be at least 4 complete sentences and should usually land around 7-12 sentences. Give the player concrete action, atmosphere, subtext, and a new detail to react to instead of only a question. If a character asks for a terse style, keep the pacing tight but still provide a complete roleplay beat rather than only one sentence or only a question. For task help, stay clear and useful without being abrupt. If information is missing, ask a short clarifying question. Do not invent facts you are unsure about.'
