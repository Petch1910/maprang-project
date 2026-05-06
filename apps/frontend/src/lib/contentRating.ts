import type { Character } from './api'
import type { ContentRating } from '../store/slices/contentSlice'

const ratingRank: Record<ContentRating, number> = {
  general: 0,
  teen_romance: 1,
  mature_18: 2,
  restricted_18: 3,
}

export function characterRating(character: Pick<Character, 'tags'>): ContentRating {
  const tags = new Set(character.tags.map((tag) => tag.toLowerCase()))
  if (tags.has('nc') || tags.has('red-flag')) return 'restricted_18'
  if (tags.has('mafia') || tags.has('vampire') || tags.has('enemy') || tags.has('hostile')) return 'mature_18'
  if (tags.has('romance') || tags.has('lover') || tags.has('crush') || tags.has('slow-burn')) return 'teen_romance'
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
