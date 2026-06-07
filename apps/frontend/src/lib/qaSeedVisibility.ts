import type { Character, ChatSummary } from './api'
import { safeGetStorageItem } from './safeStorage'

export const QA_SEED_VISIBILITY_STORAGE_KEY = 'maprang:showQaSeed'

const qaSeedCharacterIds = new Set([
  '8644f2ce-8f6f-4c12-ab16-861081471303',
  '4cc56e00-5d6f-4a48-acf4-20b13e8be376',
  '9d8017aa-7abb-4c83-a940-b676dc509b82',
])

const qaSeedChatIds = new Set([
  '61aaecf2-a85b-4e01-a7ee-0973eef62699',
  'aaaaaaaa-1111-4111-8111-aaaaaaaa1111',
  'aaaaaaaa-2222-4222-8222-aaaaaaaa2222',
  'bbbbbbbb-1111-4111-8111-bbbbbbbb1111',
  'bbbbbbbb-2222-4222-8222-bbbbbbbb2222',
  'cccccccc-1111-4111-8111-cccccccc1111',
  'cccccccc-2222-4222-8222-cccccccc2222',
  'dddddddd-1111-4111-8111-dddddddd1111',
  'dddddddd-2222-4222-8222-dddddddd2222',
  'eeeeeeee-1111-4111-8111-eeeeeeee1111',
  'eeeeeeee-2222-4222-8222-eeeeeeee2222',
  'ffffffff-1111-4111-8111-ffffffff1111',
  'ffffffff-2222-4222-8222-ffffffff2222',
])

export function canShowQaSeedData() {
  if (typeof window === 'undefined') return false
  if (import.meta.env.PROD) return false
  return safeGetStorageItem(window.localStorage, QA_SEED_VISIBILITY_STORAGE_KEY) === '1'
}

export function isQaSeedCharacterId(characterId?: string | null) {
  return Boolean(characterId && qaSeedCharacterIds.has(characterId))
}

export function isQaSeedChatId(chatId?: string | null) {
  return Boolean(chatId && qaSeedChatIds.has(chatId))
}

export function isQaSeedCharacter(character: Pick<Character, 'id' | 'name' | 'tags'>) {
  if (isQaSeedCharacterId(character.id)) return true
  if (character.name.startsWith('QA Smoke ')) return true
  return character.tags.some((tag) => tag.toLowerCase() === 'qa')
}

export function isQaSeedChatSummary(chat: Pick<ChatSummary, 'id' | 'characterName' | 'title'>) {
  if (isQaSeedChatId(chat.id)) return true
  if (chat.characterName.startsWith('QA Smoke ')) return true
  return chat.title?.startsWith('QA Smoke ') ?? false
}

export function isVisibleCharacter(character: Character) {
  return canShowQaSeedData() || !isQaSeedCharacter(character)
}

export function isVisibleChatSummary(chat: ChatSummary) {
  return canShowQaSeedData() || !isQaSeedChatSummary(chat)
}

export function filterVisibleCharacters(characters: Character[]) {
  return characters.filter(isVisibleCharacter)
}

export function filterVisibleChatSummaries(chats: ChatSummary[]) {
  return chats.filter(isVisibleChatSummary)
}
