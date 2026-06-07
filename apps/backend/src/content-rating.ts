export type ContentRating = 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'

const ratingRank: Record<ContentRating, number> = {
  general: 0,
  teen_romance: 1,
  mature_18: 2,
  restricted_18: 3,
}

export function contentRatingFromTags(tags: string[]): ContentRating {
  const normalized = new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  if (
    normalized.has('nc') ||
    normalized.has('red-flag') ||
    normalized.has('toxic-partner') ||
    normalized.has('toxic-spouse') ||
    normalized.has('แฟน toxic') ||
    normalized.has('คู่ครอง toxic')
  ) {
    return 'restricted_18'
  }
  if (
    normalized.has('mafia') ||
    normalized.has('vampire') ||
    normalized.has('enemy') ||
    normalized.has('hostile') ||
    normalized.has('disliked') ||
    normalized.has('ศัตรู') ||
    normalized.has('ไม่ถูกกัน')
  ) {
    return 'mature_18'
  }
  if (
    normalized.has('romance') ||
    normalized.has('lover') ||
    normalized.has('crush') ||
    normalized.has('friend-crush') ||
    normalized.has('dating-trial') ||
    normalized.has('talking-stage') ||
    normalized.has('partner') ||
    normalized.has('life-partner') ||
    normalized.has('spouse') ||
    normalized.has('soulmate') ||
    normalized.has('slow-burn') ||
    normalized.has('แอบชอบ') ||
    normalized.has('แฟน') ||
    normalized.has('คนรัก') ||
    normalized.has('คู่ชีวิต') ||
    normalized.has('คู่ครอง') ||
    normalized.has('คู่แท้')
  ) {
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

export function clampMaxRating(requested: ContentRating | undefined, allowed: ContentRating) {
  const normalized = normalizeMaxRating(requested)
  return ratingAllowed(normalized, allowed) ? normalized : allowed
}
