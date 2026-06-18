type CharacterVisualInput = {
  id?: string | null
  name?: string | null
  src?: string | null
}

const palettes = [
  ['#ac4bff', '#34d5ff', '#0a0c1f', '#171327', '#ffe6d7'],
  ['#f99c00', '#ac4bff', '#111827', '#2a1724', '#f5d6bd'],
  ['#22c55e', '#06b6d4', '#0f172a', '#122c2d', '#f1c7b6'],
  ['#ec4899', '#8b5cf6', '#111827', '#2b1430', '#ffe0cf'],
  ['#f43f5e', '#f59e0b', '#111827', '#31151c', '#efc3ad'],
  ['#38bdf8', '#6366f1', '#0a0c1f', '#111b35', '#e8c5b8'],
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
  const [from, via, to, hair, skin] = palettes[hash % palettes.length]
  const hairSweep = hash % 2 === 0 ? 'M126 236c12-92 65-154 141-154 75 0 128 55 145 151-43-33-98-52-164-48-45 3-86 21-122 51z' : 'M104 252c10-105 69-174 158-174 78 0 139 59 151 156-60-55-142-68-218-41-38 14-68 35-91 59z'
  const shoulderPath =
    hash % 3 === 0
      ? 'M82 635c20-143 91-212 178-212 90 0 163 72 181 212H82z'
      : 'M71 635c31-133 96-201 189-201 95 0 160 70 187 201H71z'
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
        <linearGradient id="body" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${via}" stop-opacity=".92"/>
          <stop offset="1" stop-color="${from}" stop-opacity=".78"/>
        </linearGradient>
      </defs>
      <rect width="512" height="680" rx="52" fill="url(#bg)"/>
      <rect width="512" height="680" rx="52" fill="url(#glow)"/>
      <path d="M58 642c29-155 113-238 201-238 92 0 174 84 203 238H58z" fill="#050816" opacity=".5"/>
      <path d="${shoulderPath}" fill="url(#body)" opacity=".92"/>
      <path d="M154 435c20 46 60 75 105 75 47 0 89-31 108-78-28-16-66-27-108-27-40 0-77 11-105 30z" fill="#ffffff" opacity=".13"/>
      <path d="${hairSweep}" fill="${hair}" opacity=".98"/>
      <ellipse cx="260" cy="254" rx="102" ry="121" fill="${skin}"/>
      <path d="M154 239c36-62 111-88 196-54 12 5 28 15 42 27-25-89-77-136-140-136-76 0-130 57-149 151 15-11 32-20 51-28z" fill="${hair}"/>
      <path d="M146 244c23-38 67-71 118-78 54-7 98 11 131 46-15-76-67-126-138-126-77 0-135 58-149 147 11 1 24 5 38 11z" fill="${hair}" opacity=".72"/>
      <path d="M175 291c22 15 46 15 69 0" fill="none" stroke="#17111f" stroke-opacity=".52" stroke-width="10" stroke-linecap="round"/>
      <path d="M279 291c22 15 47 15 70 0" fill="none" stroke="#17111f" stroke-opacity=".52" stroke-width="10" stroke-linecap="round"/>
      <path d="M228 355c19 16 45 17 66 1" fill="none" stroke="#8f4f5c" stroke-opacity=".42" stroke-width="9" stroke-linecap="round"/>
      <path d="M112 132c77-61 220-63 305-4" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="24" stroke-linecap="round"/>
      <circle cx="160" cy="170" r="42" fill="#fff" opacity=".08"/>
      <circle cx="386" cy="128" r="24" fill="#fff" opacity=".1"/>
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function characterImageUrl({ id, name, src }: CharacterVisualInput) {
  if (src && !isGenericLocalHero(src)) return src
  return generatedCharacterImageUrl({ id, name })
}
