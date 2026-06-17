import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { defaultUserId } from './config'
import { clampMaxRating, normalizeMaxRating, type ContentRating } from './content-rating'
import { getPrisma } from './db'

export type ContentSettingsInput = {
  isAdult?: boolean
  maxRating?: ContentRating
}

export type UserPersonaInput = {
  persona?: string
}

const maxPersonaChars = 2000
const usageLookbackDays = 7
const providerKeyVaultVersion = 'v1'
const supportedUserApiProviders = new Set(['openrouter', 'openai', 'gemini', 'anthropic'])

export type ProviderKeyInput = {
  apiKey: string
}

export type ProviderKeyMetadata = {
  provider: string
  keyHint: string | null
  createdAt: Date
  updatedAt: Date
}

function normalizePersona(value?: string) {
  return value?.replace(/\r\n/g, '\n').trim().slice(0, maxPersonaChars) ?? ''
}

function publicContentSettings(user: { contentMaxRating: string; adultVerifiedAt: Date | null }) {
  const maxRating = normalizeMaxRating(user.contentMaxRating)
  return {
    isAdult: Boolean(user.adultVerifiedAt) && (maxRating === 'mature_18' || maxRating === 'restricted_18'),
    maxRating,
    adultVerifiedAt: user.adultVerifiedAt,
  }
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

function decimalString(value: { toString(): string } | number | string | null | undefined) {
  if (value === null || value === undefined) return '0'
  const numericValue = Number(value.toString())
  if (!Number.isFinite(numericValue)) return '0'
  return numericValue.toFixed(6)
}

export function normalizeUserApiProvider(value?: string | null) {
  const provider = value?.trim().toLowerCase() || 'openrouter'
  if (!supportedUserApiProviders.has(provider)) return 'openrouter'
  return provider
}

export function providerKeyHint(apiKey: string) {
  const normalized = apiKey.trim()
  if (normalized.length <= 4) return '****'
  return `****${normalized.slice(-4)}`
}

function byokEncryptionSecret() {
  const explicitSecret = process.env.BYOK_ENCRYPTION_SECRET?.trim()
  if (explicitSecret) return explicitSecret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BYOK_ENCRYPTION_SECRET_missing')
  }
  return process.env.ADMIN_API_KEY?.trim() || 'maprang-local-user-provider-key-vault'
}

function encryptionKey(secret = byokEncryptionSecret()) {
  return createHash('sha256').update(secret).digest()
}

export function encryptUserProviderKey(apiKey: string, secret = byokEncryptionSecret()) {
  const plaintext = apiKey.trim()
  if (!plaintext) throw new Error('provider_key_empty')

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    providerKeyVaultVersion,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

export function decryptUserProviderKey(ciphertext: string, secret = byokEncryptionSecret()) {
  const [version, ivValue, tagValue, encryptedValue] = ciphertext.split(':')
  if (version !== providerKeyVaultVersion || !ivValue || !tagValue || !encryptedValue) {
    throw new Error('provider_key_ciphertext_invalid')
  }

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), Buffer.from(ivValue, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function providerKeyMetadata(row: {
  provider: string
  keyHint: string | null
  createdAt: Date
  updatedAt: Date
}): ProviderKeyMetadata {
  return {
    provider: row.provider,
    keyHint: row.keyHint,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function writeUserSecurityAuditLog(
  userId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
) {
  const prisma = getPrisma()
  if (!prisma) return null
  return prisma.userSecurityAuditLog.create({
    data: {
      userId,
      action,
      targetType,
      targetId,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
    },
  })
}

export async function listUserProviderKeys(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const rows = await prisma.userProviderKey.findMany({
    where: { userId },
    orderBy: [{ provider: 'asc' }],
    select: {
      provider: true,
      keyHint: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return rows.map(providerKeyMetadata)
}

export async function upsertUserProviderKey(userId = defaultUserId, providerInput: string, input: ProviderKeyInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const provider = normalizeUserApiProvider(providerInput)
  const apiKey = input.apiKey.trim()
  if (!apiKey) throw new Error('provider_key_empty')

  const saved = await prisma.userProviderKey.upsert({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    create: {
      userId,
      provider,
      keyCiphertext: encryptUserProviderKey(apiKey),
      keyHint: providerKeyHint(apiKey),
    },
    update: {
      keyCiphertext: encryptUserProviderKey(apiKey),
      keyHint: providerKeyHint(apiKey),
    },
    select: {
      id: true,
      provider: true,
      keyHint: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await writeUserSecurityAuditLog(userId, 'USER_PROVIDER_KEY_UPSERT', 'UserProviderKey', saved.id, {
    provider,
    keyHint: saved.keyHint,
  })

  return providerKeyMetadata(saved)
}

export async function deleteUserProviderKey(userId = defaultUserId, providerInput: string) {
  const prisma = getPrisma()
  if (!prisma) return null

  const provider = normalizeUserApiProvider(providerInput)
  const existing = await prisma.userProviderKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    select: {
      id: true,
      provider: true,
      keyHint: true,
    },
  })

  if (!existing) {
    await writeUserSecurityAuditLog(userId, 'USER_PROVIDER_KEY_DELETE_MISSING', 'UserProviderKey', null, { provider })
    return { deleted: false, provider }
  }

  await prisma.userProviderKey.delete({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
  })
  await writeUserSecurityAuditLog(userId, 'USER_PROVIDER_KEY_DELETE', 'UserProviderKey', existing.id, {
    provider,
    keyHint: existing.keyHint,
  })

  return { deleted: true, provider }
}

export async function resolveUserProviderKey(userId = defaultUserId, providerInput?: string | null) {
  const prisma = getPrisma()
  if (!prisma) return null

  const provider = normalizeUserApiProvider(providerInput)
  const row = await prisma.userProviderKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider,
      },
    },
    select: {
      id: true,
      provider: true,
      keyCiphertext: true,
      keyHint: true,
    },
  })

  if (!row) return null
  await writeUserSecurityAuditLog(userId, 'USER_PROVIDER_KEY_USE', 'UserProviderKey', row.id, {
    provider,
    keyHint: row.keyHint,
  })
  return {
    provider: row.provider,
    apiKey: decryptUserProviderKey(row.keyCiphertext),
  }
}

export async function loadContentSettings(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      contentMaxRating: true,
      adultVerifiedAt: true,
    },
  })

  return user ? publicContentSettings(user) : null
}

export async function loadUserPersona(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      persona: true,
      personaUpdatedAt: true,
    },
  })

  if (!user) return null
  return {
    persona: user.persona ?? '',
    updatedAt: user.personaUpdatedAt,
    maxChars: maxPersonaChars,
  }
}

export async function updateUserPersona(userId = defaultUserId, input: UserPersonaInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const persona = normalizePersona(input.persona)
  const updatedAt = new Date()
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      persona: persona || null,
      personaUpdatedAt: updatedAt,
    },
    select: {
      persona: true,
      personaUpdatedAt: true,
    },
  })

  return {
    persona: user.persona ?? '',
    updatedAt: user.personaUpdatedAt,
    maxChars: maxPersonaChars,
  }
}

export async function updateContentSettings(userId = defaultUserId, input: ContentSettingsInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const isAdult = Boolean(input.isAdult)
  const requestedMaxRating = input.maxRating ? normalizeMaxRating(input.maxRating) : isAdult ? 'restricted_18' : 'teen_romance'
  const maxRating = isAdult ? requestedMaxRating : clampMaxRating(requestedMaxRating, 'teen_romance')
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      contentMaxRating: maxRating,
      adultVerifiedAt: isAdult ? new Date() : null,
    },
    select: {
      contentMaxRating: true,
      adultVerifiedAt: true,
    },
  })

  return publicContentSettings(user)
}

export async function effectiveMaxRatingForUser(userId = defaultUserId, requested?: ContentRating) {
  const settings = await loadContentSettings(userId)
  const allowed = settings?.maxRating ?? 'teen_romance'
  return clampMaxRating(requested, allowed)
}

export async function loadUsageSummary(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const lookbackStart = new Date()
  lookbackStart.setUTCHours(0, 0, 0, 0)
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - (usageLookbackDays - 1))

  const [user, aggregate, recentUsages, usageByModel, dailyUsages, tokenTransactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        tokenBalance: true,
        role: true,
        contentMaxRating: true,
        adultVerifiedAt: true,
      },
    }),
    prisma.usage.aggregate({
      where: { userId },
      _sum: { tokens: true, cost: true },
      _count: { id: true },
    }),
    prisma.usage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tokens: true,
        modelName: true,
        cost: true,
        createdAt: true,
      },
    }),
    prisma.usage.groupBy({
      by: ['modelName'],
      where: { userId },
      _sum: {
        tokens: true,
        cost: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.usage.findMany({
      where: {
        userId,
        createdAt: {
          gte: lookbackStart,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        tokens: true,
        cost: true,
        createdAt: true,
      },
    }),
    prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        createdAt: true,
      },
    }),
  ])

  if (!user) return null

  const totalTokens = aggregate._sum.tokens ?? 0
  const requestCount = aggregate._count.id
  const totalCost = decimalString(aggregate._sum.cost)
  const averageTokensPerRequest = requestCount > 0 ? Math.round(totalTokens / requestCount) : 0
  const averageCostPerRequest = requestCount > 0 ? Number(totalCost) / requestCount : 0
  const estimatedRemainingRequests =
    averageTokensPerRequest > 0 ? Math.floor(user.tokenBalance / averageTokensPerRequest) : null

  const dailyMap = new Map<string, { date: string; tokens: number; cost: number; requestCount: number }>()
  for (let index = 0; index < usageLookbackDays; index += 1) {
    const day = new Date(lookbackStart)
    day.setUTCDate(lookbackStart.getUTCDate() + index)
    const key = dateKey(day)
    dailyMap.set(key, { date: key, tokens: 0, cost: 0, requestCount: 0 })
  }
  for (const usage of dailyUsages) {
    const key = dateKey(usage.createdAt)
    const row = dailyMap.get(key)
    if (!row) continue
    row.tokens += usage.tokens
    row.cost += Number(usage.cost ?? 0)
    row.requestCount += 1
  }

  return {
    user,
    contentSettings: publicContentSettings(user),
    usage: {
      totalTokens,
      totalCost,
      requestCount,
      recent: recentUsages,
      byModel: usageByModel
        .map((row) => ({
          modelName: row.modelName,
          tokens: row._sum.tokens ?? 0,
          cost: decimalString(row._sum.cost),
          requestCount: row._count.id,
        }))
        .sort((left, right) => right.tokens - left.tokens)
        .slice(0, 8),
      daily: Array.from(dailyMap.values()).map((row) => ({
        ...row,
        cost: row.cost.toFixed(6),
      })),
      estimate: {
        averageTokensPerRequest,
        averageCostPerRequest: averageCostPerRequest.toFixed(6),
        estimatedRemainingRequests,
      },
    },
    wallet: {
      transactions: tokenTransactions,
    },
  }
}
