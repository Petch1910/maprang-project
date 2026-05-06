export type ContentRating = 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'

const ratingRank: Record<ContentRating, number> = {
  general: 0,
  teen_romance: 1,
  mature_18: 2,
  restricted_18: 3,
}

export function contentRatingFromTags(tags: string[]): ContentRating {
  const normalized = new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  if (normalized.has('nc') || normalized.has('red-flag')) return 'restricted_18'
  if (normalized.has('mafia') || normalized.has('vampire') || normalized.has('enemy') || normalized.has('hostile')) {
    return 'mature_18'
  }
  if (normalized.has('romance') || normalized.has('lover') || normalized.has('crush') || normalized.has('slow-burn')) {
    return 'teen_romance'
  }
  return 'general'
}

export function ratingAllowed(rating: ContentRating, maxRating: ContentRating) {
  return ratingRank[rating] <= ratingRank[maxRating]
}

export function normalizeMaxRating(value?: string): ContentRating {
  if (value === 'general' || value === 'teen_romance' || value === 'mature_18' || value === 'restricted_18') return value
  return 'teen_romance'
}
