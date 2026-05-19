import { CharacterStatus, type Prisma, type Visibility } from '@prisma/client'
import { defaultCharacterId, defaultSystemPrompt, defaultUserId } from './config'
import { contentRatingFromTags, normalizeMaxRating, ratingAllowed, type ContentRating } from './content-rating'
import { getPrisma } from './db'
import { validateRelationshipTags } from './relationship.engine'
import type { CharacterWithTags } from './character.types'

export type { CharacterWithTags } from './character.types'

export type CharacterInput = {
  name: string
  avatarUrl?: string | null
  tagline?: string | null
  description?: string | null
  biography?: string | null
  scenario?: string | null
  systemPrompt: string
  compactPrompt?: string | null
  characterAnchor?: string | null
  constraints?: string | null
  greeting?: string | null
  tags?: string[]
  visibility?: Visibility
  status?: CharacterStatus
}

export type CharacterPatchInput = Partial<CharacterInput>

export type CharacterListOptions = {
  view?: 'public' | 'admin'
  viewerUserId?: string
  includePrivateFields?: boolean
  query?: string
  tag?: string
  status?: CharacterStatus
  visibility?: Visibility
  sort?: 'popular' | 'newest' | 'quality' | 'viewed' | 'favorited'
  favoriteOnly?: boolean
  maxRating?: ContentRating
  limit?: number
}

export function publicCharacter(
  character: CharacterWithTags,
  options: { viewerUserId?: string; includePrivateFields?: boolean } = {},
) {
  const includePrivateFields = options.includePrivateFields ?? false
  const viewerUserId = options.viewerUserId ?? defaultUserId

  return {
    id: character.id,
    name: character.name,
    avatarUrl: character.avatarUrl,
    tagline: character.tagline,
    description: character.description,
    biography: character.biography,
    scenario: character.scenario,
    systemPrompt: includePrivateFields ? character.systemPrompt : '',
    compactPrompt: includePrivateFields ? character.compactPrompt : null,
    characterAnchor: includePrivateFields ? character.characterAnchor : null,
    constraints: includePrivateFields ? character.constraints : null,
    greeting: character.greeting,
    status: character.status,
    visibility: character.visibility,
    qualityScore: character.qualityScore,
    qualityNotes: includePrivateFields ? character.qualityNotes : null,
    publishedAt: character.publishedAt,
    promptVersion: character.promptVersion,
    viewCount: character.viewCount,
    chatCount: character.chatCount,
    favoriteCount: character._count?.favoritedBy ?? 0,
    isFavorite: character.favoritedBy?.some((favorite) => favorite.userId === viewerUserId) ?? false,
    tags: character.tags?.map((item) => item.tag.name) ?? [],
    contentRating: contentRatingFromTags(character.tags?.map((item) => item.tag.name) ?? []),
  }
}

export function fallbackCharacter() {
  return {
    id: defaultCharacterId,
    name: 'น้องมะปราง',
    avatarUrl: null,
    tagline: 'ผู้ช่วย AI ภาษาไทยที่คุยง่ายและช่วยคิดงานได้จริง',
    description: 'AI ผู้ช่วยภาษาไทยที่พร้อมดูแลคุณทุกเรื่อง',
    biography: null,
    scenario: null,
    systemPrompt: defaultSystemPrompt,
    compactPrompt: 'มะปราง: ผู้ช่วย AI ภาษาไทย โทนอ่อนโยน สุภาพ ตอบชัด ใช้งานได้จริง',
    characterAnchor: null,
    constraints: null,
    greeting: 'สวัสดีค่ะ วันนี้มะปรางมีอะไรให้ช่วยไหมคะ?',
    status: CharacterStatus.PUBLISHED,
    visibility: 'PUBLIC',
    qualityScore: 90,
    qualityNotes: null,
    publishedAt: null,
    promptVersion: 1,
    viewCount: 0,
    chatCount: 0,
    tags: ['thai', 'assistant', 'friendly'],
    favoriteCount: 0,
    isFavorite: false,
  }
}

function normalizeTags(tags?: string[]) {
  return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
}

function tagNames(tags?: string[] | { tag: { name: string } }[]) {
  return (tags ?? []).map((tag) => (typeof tag === 'string' ? tag : tag.tag.name))
}

async function tagsForCharacter(characterId: string) {
  const prisma = getPrisma()
  if (!prisma) return []

  const rows = await prisma.characterTag.findMany({
    where: { characterId },
    include: { tag: true },
  })

  return rows.map((row) => row.tag.name)
}

export async function syncCharacterTags(characterId: string, tags: string[]) {
  const prisma = getPrisma()
  if (!prisma) return

  await prisma.characterTag.deleteMany({ where: { characterId } })

  for (const name of normalizeTags(tags)) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    })

    await prisma.characterTag.create({
      data: {
        characterId,
        tagId: tag.id,
      },
    })
  }
}

export async function loadCharacter(characterId: string, viewerUserId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  return prisma.character.findFirst({
    where: { id: characterId, deletedAt: null },
    include: {
      tags: {
        include: { tag: true },
      },
      favoritedBy: {
        where: { userId: viewerUserId },
        select: { userId: true },
      },
      _count: {
        select: { favoritedBy: true },
      },
    },
  })
}

export async function listCharacters(view: 'public' | 'admin' = 'public') {
  const prisma = getPrisma()
  if (!prisma) return [fallbackCharacter()]

  return searchCharacters({ view })
}

export async function searchCharacters(options: CharacterListOptions = {}) {
  const prisma = getPrisma()
  if (!prisma) return [fallbackCharacter()]

  const view = options.view ?? 'public'
  const isAdminView = view === 'admin'
  const viewerUserId = options.viewerUserId ?? defaultUserId
  const includePrivateFields = options.includePrivateFields ?? false
  const query = options.query?.trim()
  const tag = options.tag?.trim().toLowerCase()
  const maxRating = normalizeMaxRating(options.maxRating)
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 60)
  const orderBy: Prisma.CharacterOrderByWithRelationInput[] =
    options.sort === 'newest'
      ? [{ createdAt: 'desc' }]
      : options.sort === 'viewed'
        ? [{ viewCount: 'desc' }, { chatCount: 'desc' }, { createdAt: 'desc' }]
        : options.sort === 'favorited'
          ? [{ favoritedBy: { _count: 'desc' } }, { chatCount: 'desc' }, { createdAt: 'desc' }]
          : options.sort === 'quality'
            ? [{ qualityScore: 'desc' }, { chatCount: 'desc' }, { createdAt: 'desc' }]
            : [{ chatCount: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }]

  const characters = await prisma.character.findMany({
    where: {
      deletedAt: null,
      ...(isAdminView
        ? {
            ...(includePrivateFields ? {} : { creatorId: viewerUserId }),
            ...(options.status ? { status: options.status } : {}),
            ...(options.visibility ? { visibility: options.visibility } : {}),
          }
        : { status: CharacterStatus.PUBLISHED, visibility: 'PUBLIC' }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { tagline: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(tag
        ? {
            tags: {
              some: {
                tag: {
                  name: tag,
                },
              },
            },
          }
        : {}),
      ...(options.favoriteOnly
        ? {
            favoritedBy: {
              some: {
                userId: defaultUserId,
              },
            },
          }
        : {}),
    },
    orderBy,
    take: limit,
    include: {
      tags: {
        include: { tag: true },
      },
      favoritedBy: {
        where: { userId: viewerUserId },
        select: { userId: true },
      },
      _count: {
        select: { favoritedBy: true },
      },
    },
  })

  return characters
    .filter((character) => isAdminView || ratingAllowed(contentRatingFromTags(tagNames(character.tags)), maxRating))
    .map((character) => publicCharacter(character, { viewerUserId, includePrivateFields: isAdminView }))
}

type QualityReviewInput = Omit<CharacterInput, 'tags'> & {
  tags?: string[] | { tag: { name: string } }[]
}

export function reviewCharacterQuality(input: QualityReviewInput) {
  const notes: string[] = []
  const relationshipIssues = validateRelationshipTags(tagNames(input.tags))
  let score = 0

  if (input.name.trim().length >= 2) score += 10
  else notes.push('Name should be at least 2 characters.')

  if ((input.tagline ?? '').trim().length >= 12) score += 10
  else notes.push('Add a clear tagline.')

  if ((input.description ?? '').trim().length >= 40) score += 15
  else notes.push('Description should explain the character clearly.')

  if ((input.biography ?? '').trim().length >= 80) score += 15
  else notes.push('Biography is short; add more identity and background.')

  if ((input.scenario ?? '').trim().length >= 40) score += 10
  else notes.push('Add a starting scenario for roleplay.')

  if (input.systemPrompt.trim().length >= 120) score += 20
  else notes.push('System prompt should describe personality, behavior, and boundaries.')

  if ((input.compactPrompt ?? '').trim().length >= 40) score += 10
  else notes.push('Compact prompt is needed for lean runtime context.')

  if ((input.greeting ?? '').trim().length >= 10) score += 5
  else notes.push('Greeting is missing or too short.')

  const tagCount = input.tags?.length ?? 0
  if (tagCount > 0) score += 5
  else notes.push('Add at least one discovery tag.')

  for (const issue of relationshipIssues) {
    notes.push(`[${issue.level}] ${issue.message}`)
    score -= issue.level === 'danger' ? 15 : 5
  }

  return {
    score: Math.max(0, score),
    passes: score >= 70 && !relationshipIssues.some((issue) => issue.level === 'danger'),
    notes,
    relationshipIssues,
  }
}

export async function createCharacter(input: CharacterInput, creatorId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const quality = reviewCharacterQuality(input)
  const requestedStatus = input.status ?? CharacterStatus.DRAFT
  const status =
    requestedStatus === CharacterStatus.PUBLISHED && !quality.passes ? CharacterStatus.REVIEW : requestedStatus
  const character = await prisma.character.create({
    data: {
      name: input.name,
      avatarUrl: input.avatarUrl ?? null,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      biography: input.biography ?? null,
      scenario: input.scenario ?? null,
      systemPrompt: input.systemPrompt,
      compactPrompt: input.compactPrompt ?? null,
      characterAnchor: input.characterAnchor ?? null,
      constraints: input.constraints ?? null,
      greeting: input.greeting ?? null,
      visibility: input.visibility ?? 'PRIVATE',
      status,
      qualityScore: quality.score,
      qualityNotes: {
        passes: quality.passes,
        notes: quality.notes,
        relationshipIssues: quality.relationshipIssues,
      },
      publishedAt: status === CharacterStatus.PUBLISHED ? new Date() : null,
      creatorId,
    },
  })

  await syncCharacterTags(character.id, input.tags ?? [])
  return loadCharacter(character.id)
}

export async function updateCharacter(characterId: string, input: CharacterPatchInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const existing = await loadCharacter(characterId)
  if (!existing) return null
  const quality = reviewCharacterQuality({
    ...existing,
    ...input,
    tags: input.tags ?? existing.tags,
  })
  const requestedStatus = input.status
  const nextStatus =
    requestedStatus === CharacterStatus.PUBLISHED && !quality.passes ? CharacterStatus.REVIEW : requestedStatus

  await prisma.character.update({
    where: { id: characterId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.biography !== undefined ? { biography: input.biography } : {}),
      ...(input.scenario !== undefined ? { scenario: input.scenario } : {}),
      ...(input.systemPrompt !== undefined
        ? { systemPrompt: input.systemPrompt, promptVersion: { increment: 1 } }
        : {}),
      ...(input.compactPrompt !== undefined ? { compactPrompt: input.compactPrompt } : {}),
      ...(input.characterAnchor !== undefined ? { characterAnchor: input.characterAnchor } : {}),
      ...(input.constraints !== undefined ? { constraints: input.constraints } : {}),
      ...(input.greeting !== undefined ? { greeting: input.greeting } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      qualityScore: quality.score,
      qualityNotes: {
        passes: quality.passes,
        notes: quality.notes,
        relationshipIssues: quality.relationshipIssues,
      },
      ...(nextStatus === CharacterStatus.PUBLISHED && existing.publishedAt === null
        ? { publishedAt: new Date() }
        : {}),
    },
  })

  if (input.tags !== undefined) {
    await syncCharacterTags(characterId, input.tags)
  }

  return loadCharacter(characterId)
}

export async function softDeleteCharacter(characterId: string) {
  const prisma = getPrisma()
  if (!prisma) return null

  await prisma.character.update({
    where: { id: characterId },
    data: {
      deletedAt: new Date(),
      status: CharacterStatus.ARCHIVED,
      visibility: 'PRIVATE',
    },
  })

  return true
}

export async function duplicateCharacter(characterId: string, creatorId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const existing = await loadCharacter(characterId)
  if (!existing) return null

  const copied = await prisma.character.create({
    data: {
      name: `${existing.name} copy`,
      avatarUrl: existing.avatarUrl,
      tagline: existing.tagline,
      description: existing.description,
      biography: existing.biography,
      scenario: existing.scenario,
      systemPrompt: existing.systemPrompt,
      compactPrompt: existing.compactPrompt,
      characterAnchor: existing.characterAnchor,
      constraints: existing.constraints,
      greeting: existing.greeting,
      exampleDialog: existing.exampleDialog,
      visibility: 'PRIVATE',
      status: CharacterStatus.DRAFT,
      qualityScore: 0,
      creatorId,
    },
  })

  await syncCharacterTags(copied.id, await tagsForCharacter(existing.id))
  return loadCharacter(copied.id)
}

export async function resetCharacterPrompt(characterId: string) {
  const prisma = getPrisma()
  if (!prisma) return null

  await prisma.character.update({
    where: { id: characterId },
    data: {
      systemPrompt: defaultSystemPrompt,
      compactPrompt: 'มะปราง: ผู้ช่วย AI ภาษาไทย โทนอ่อนโยน สุภาพ ตอบชัด ใช้งานได้จริง',
      characterAnchor: null,
      constraints: null,
      promptVersion: { increment: 1 },
      status: CharacterStatus.DRAFT,
      publishedAt: null,
    },
  })

  return loadCharacter(characterId)
}

export async function setFavorite(characterId: string, favorite: boolean, userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const character = await loadCharacter(characterId)
  if (!character) return null

  if (favorite) {
    await prisma.favorite.upsert({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
      update: {},
      create: {
        userId,
        characterId,
      },
    })
  } else {
    await prisma.favorite.deleteMany({
      where: {
        userId,
        characterId,
      },
    })
  }

  return loadCharacter(characterId, userId)
}

export async function trackCharacterView(characterId: string) {
  const prisma = getPrisma()
  if (!prisma) return null

  const existing = await loadCharacter(characterId)
  if (!existing) return null

  await prisma.character.update({
    where: { id: characterId },
    data: {
      viewCount: { increment: 1 },
    },
  })

  return loadCharacter(characterId)
}
