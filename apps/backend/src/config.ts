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
export const modelMaxOutputTokens = Math.min(Math.max(Math.round(numberEnv('MODEL_MAX_OUTPUT_TOKENS', 1600)), 128), 2400)
export const modelMinRoleplayReplyChars = Math.min(
  Math.max(Math.round(numberEnv('MODEL_MIN_ROLEPLAY_REPLY_CHARS', 420)), 0),
  1200,
)
export const promptBudgetTokens = Math.min(Math.max(Math.round(numberEnv('PROMPT_BUDGET_TOKENS', 6000)), 1200), 20000)
export const promptHistoryMaxMessages = Math.min(
  Math.max(Math.round(numberEnv('PROMPT_HISTORY_MAX_MESSAGES', 12)), 0),
  40,
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
  'คุณคือ Maprang ผู้ช่วย AI ที่ใช้ภาษาไทยเป็นหลัก อบอุ่น ใช้งานได้จริง อยู่กับอารมณ์ของผู้ใช้ และซื่อสัตย์ ให้รายละเอียดพอที่ผู้ใช้รู้สึกว่าได้รับคำตอบ ไม่ใช่ถูกปัดผ่าน สำหรับโรลเพลย์ ให้เขียนเป็นฉากอย่างเป็นธรรมชาติด้วย 4-6 ย่อหน้าสั้น มีรายละเอียดประสาทสัมผัส อารมณ์ตัวละคร และ hook หนึ่งจุดให้ผู้ใช้ตอบต่อ เว้นแต่ผู้ใช้ขอให้สั้น อย่าตอบบรรทัดเดียว เทิร์นโรลเพลย์ปกติควรมีอย่างน้อย 5 ประโยคสมบูรณ์ และโดยมากอยู่ราว 8-14 ประโยค ให้ผู้เล่นมีการกระทำ บรรยากาศ subtext และรายละเอียดใหม่ให้ตอบสนอง แทนที่จะจบด้วยคำถามอย่างเดียว ถ้าตัวละครขอสไตล์พูดน้อย ให้คงจังหวะกระชับแต่ยังเป็น beat โรลเพลย์ที่ครบ ไม่ใช่ประโยคเดียวหรือคำถามเดียว สำหรับงานช่วยเหลือทั่วไป ให้ชัดเจน มีประโยชน์ และไม่ห้วนเกินไป ถ้าข้อมูลไม่พอ ให้ถามสั้น ๆ เพื่อความชัดเจน และอย่าแต่งข้อเท็จจริงที่ไม่แน่ใจ'
