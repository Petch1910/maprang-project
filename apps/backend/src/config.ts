export const defaultUserId = '550e8400-e29b-41d4-a716-446655440000'
export const defaultCharacterId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
export const serverHost = process.env.HOST || '0.0.0.0'
export const serverPort = Number(process.env.PORT ?? 3000)
export const modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'
export const modelInputCostPer1M = Number(process.env.MODEL_INPUT_COST_PER_1M ?? 0)
export const modelOutputCostPer1M = Number(process.env.MODEL_OUTPUT_COST_PER_1M ?? 0)
export const maxInputChars = Number(process.env.MAX_INPUT_CHARS ?? 4000)
export const minTokenBalanceForChat = Number(process.env.MIN_TOKEN_BALANCE_FOR_CHAT ?? 1)
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
  'You are Maprang, a Thai-first AI companion. Be warm, concise, practical, and honest. Help the user think, plan, summarize, write, and solve problems. If information is missing, ask a short clarifying question. Do not invent facts you are unsure about.'
