import type { Character } from './api'
import type { ContentRating } from '../store/types'

const ratingRank: Record<ContentRating, number> = {
  general: 0,
  teen_romance: 1,
  mature_18: 2,
  restricted_18: 3,
}

export function characterRating(character: Pick<Character, 'tags' | 'contentRating'>): ContentRating {
  if ('contentRating' in character && character.contentRating) return character.contentRating
  const tags = new Set(character.tags.map((tag) => tag.toLowerCase()))
  if (
    tags.has('nc') ||
    tags.has('red-flag') ||
    tags.has('toxic-partner') ||
    tags.has('toxic-spouse') ||
    tags.has('แฟน toxic') ||
    tags.has('คู่ครอง toxic')
  ) {
    return 'restricted_18'
  }
  if (
    tags.has('mafia') ||
    tags.has('vampire') ||
    tags.has('enemy') ||
    tags.has('hostile') ||
    tags.has('disliked') ||
    tags.has('ศัตรู') ||
    tags.has('ไม่ถูกกัน')
  ) {
    return 'mature_18'
  }
  if (
    tags.has('romance') ||
    tags.has('lover') ||
    tags.has('crush') ||
    tags.has('friend-crush') ||
    tags.has('dating-trial') ||
    tags.has('talking-stage') ||
    tags.has('partner') ||
    tags.has('life-partner') ||
    tags.has('spouse') ||
    tags.has('soulmate') ||
    tags.has('slow-burn') ||
    tags.has('แอบชอบ') ||
    tags.has('แฟน') ||
    tags.has('คนรัก') ||
    tags.has('คู่ชีวิต') ||
    tags.has('คู่ครอง') ||
    tags.has('คู่แท้')
  ) {
    return 'teen_romance'
  }
  return 'general'
}

export function canViewRating(rating: ContentRating, maxRating: ContentRating) {
  return ratingRank[rating] <= ratingRank[maxRating]
}

export function ratingLabel(rating: ContentRating) {
  const labels: Record<ContentRating, string> = {
    general: 'General',
    teen_romance: 'Teen romance',
    mature_18: 'Mature 18+',
    restricted_18: 'Restricted 18+',
  }
  return labels[rating]
}
