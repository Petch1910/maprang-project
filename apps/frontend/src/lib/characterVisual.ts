type CharacterVisualInput = {
  id?: string | null
  name?: string | null
  src?: string | null
}

const palettes = [
  ['#ac4bff', '#34d5ff', '#0a0c1f'],
  ['#f99c00', '#ac4bff', '#111827'],
  ['#22c55e', '#06b6d4', '#0f172a'],
  ['#ec4899', '#8b5cf6', '#111827'],
  ['#f43f5e', '#f59e0b', '#111827'],
  ['#38bdf8', '#6366f1', '#0a0c1f'],
]

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function isGenericLocalHero(src: string) {
  return src.includes('/src/assets/hero.png') || /\/assets\/hero-[A-Za-z0-9_-]+\.png$/.test(src)
}

export function generatedCharacterImageUrl({ id, name }: Omit<CharacterVisualInput, 'src'>) {
  const seed = `${id ?? ''}:${name ?? 'Maprang'}`
  const hash = hashText(seed)
  const [from, via, to] = palettes[hash % palettes.length]
  const initial = (name?.trim().slice(0, 1) || 'M').toUpperCase()
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 680">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${from}"/>
          <stop offset=".55" stop-color="${via}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="25%" r="55%">
          <stop stop-color="#ffffff" stop-opacity=".42"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="512" height="680" rx="52" fill="url(#bg)"/>
      <rect width="512" height="680" rx="52" fill="url(#glow)"/>
      <circle cx="256" cy="206" r="106" fill="#fff" opacity=".78"/>
      <path d="M110 585c14-138 88-215 146-215s132 77 146 215" fill="#fff" opacity=".72"/>
      <path d="M96 121c74-65 236-67 320 0" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="26" stroke-linecap="round"/>
      <text x="256" y="624" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="900" fill="#ffffff" opacity=".96">${initial}</text>
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function characterImageUrl({ id, name, src }: CharacterVisualInput) {
  if (src && !isGenericLocalHero(src)) return src
  return generatedCharacterImageUrl({ id, name })
}
