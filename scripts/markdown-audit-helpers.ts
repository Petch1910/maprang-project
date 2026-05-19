import { normalize } from 'node:path'

export function missingIncludes(content: string, values: string[]) {
  return values.filter((value) => !content.includes(value))
}

export function collectLocalMarkdownLinks(content: string) {
  const links: string[] = []
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g

  for (const match of content.matchAll(linkPattern)) {
    const target = match[1]?.trim()
    if (!target || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#')) continue
    if (target.startsWith('mailto:') || target.includes('://')) continue
    links.push(target.split('#')[0] ?? target)
  }

  return links
}

export function pathIsInside(parent: string, child: string) {
  const normalizedParent = normalize(parent)
  const normalizedChild = normalize(child)
  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}\\`) ||
    normalizedChild.startsWith(`${normalizedParent}/`)
  )
}
