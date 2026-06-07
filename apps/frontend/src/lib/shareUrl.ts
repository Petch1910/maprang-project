export function currentBrowserOrigin(fallbackOrigin = 'http://localhost:5173') {
  if (typeof window === 'undefined') return fallbackOrigin
  return window.location.origin
}

export function characterShareUrl(characterId: string, origin = currentBrowserOrigin()) {
  return new URL(`/characters/${encodeURIComponent(characterId)}`, `${origin.replace(/\/+$/, '')}/`).toString()
}
