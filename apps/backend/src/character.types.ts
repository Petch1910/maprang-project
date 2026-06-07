import type { Character } from '@prisma/client'

export type CharacterWithTags = Character & {
  tags?: { tag: { name: string } }[]
  favoritedBy?: { userId: string }[]
  _count?: { favoritedBy: number }
}
