import { getPrisma } from './db'

export type LoreInput = {
  keyword: string
  aliases?: string[]
  content: string
  priority?: number
  hierarchyLevel?: number
  parentLoreId?: string | null
}

export type LorePatchInput = Partial<LoreInput>

export function publicLoreEntry(entry: {
  id: string
  characterId: string
  keyword: string
  aliases: string[]
  content: string
  priority: number
  hierarchyLevel: number
  parentLoreId: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: entry.id,
    characterId: entry.characterId,
    keyword: entry.keyword,
    aliases: entry.aliases,
    content: entry.content,
    priority: entry.priority,
    hierarchyLevel: entry.hierarchyLevel,
    parentLoreId: entry.parentLoreId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

function normalizeAliases(aliases?: string[]) {
  return [...new Set((aliases ?? []).map((alias) => alias.trim()).filter(Boolean))]
}

export async function listLoreEntries(characterId: string) {
  const prisma = getPrisma()
  if (!prisma) return null

  const entries = await prisma.loreEntry.findMany({
    where: {
      characterId,
      deletedAt: null,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  })

  return entries.map(publicLoreEntry)
}

export async function loadLoreEntry(entryId: string) {
  const prisma = getPrisma()
  if (!prisma) return null

  return prisma.loreEntry.findFirst({
    where: {
      id: entryId,
      deletedAt: null,
    },
    include: {
      character: true,
    },
  })
}

export async function createLoreEntry(characterId: string, input: LoreInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const entry = await prisma.loreEntry.create({
    data: {
      characterId,
      keyword: input.keyword,
      aliases: normalizeAliases(input.aliases),
      content: input.content,
      priority: input.priority ?? 0,
      hierarchyLevel: input.hierarchyLevel ?? 0,
      parentLoreId: input.parentLoreId ?? null,
    },
  })

  return publicLoreEntry(entry)
}

export async function updateLoreEntry(entryId: string, input: LorePatchInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const entry = await prisma.loreEntry.update({
    where: { id: entryId },
    data: {
      ...(input.keyword !== undefined ? { keyword: input.keyword } : {}),
      ...(input.aliases !== undefined ? { aliases: normalizeAliases(input.aliases) } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.hierarchyLevel !== undefined ? { hierarchyLevel: input.hierarchyLevel } : {}),
      ...(input.parentLoreId !== undefined ? { parentLoreId: input.parentLoreId } : {}),
    },
  })

  return publicLoreEntry(entry)
}

export async function softDeleteLoreEntry(entryId: string) {
  const prisma = getPrisma()
  if (!prisma) return false

  await prisma.loreEntry.update({
    where: { id: entryId },
    data: {
      deletedAt: new Date(),
    },
  })

  return true
}
