import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const assetsDir = join(root, 'apps/frontend/dist/assets')

export type BundleBudget = {
  mainIndexKb: number
  chatRoomKb: number
  anyChunkKb: number
}

export type BundleSize = {
  file: string
  bytes: number
}

export const budgets: BundleBudget = {
  mainIndexKb: 350,
  chatRoomKb: 260,
  anyChunkKb: 500,
}

export function kb(bytes: number) {
  return bytes / 1024
}

export function formatKb(bytes: number) {
  return `${kb(bytes).toFixed(1)}KB`
}

export function evaluateFrontendBundleBudgets(sizes: BundleSize[], budget: BundleBudget = budgets) {
  const mainIndex = sizes.find((item) => /^index-[\w-]+\.js$/.test(item.file))
  const chatRoom = sizes.find((item) => /^ChatRoomPage-[\w-]+\.js$/.test(item.file))
  const oversized = sizes.filter((item) => kb(item.bytes) > budget.anyChunkKb)
  const failures: string[] = []

  if (!mainIndex) {
    failures.push('main index bundle was not found in apps/frontend/dist/assets')
  } else if (kb(mainIndex.bytes) > budget.mainIndexKb) {
    failures.push(`main index bundle is ${formatKb(mainIndex.bytes)}, expected <= ${budget.mainIndexKb}KB`)
  }

  if (!chatRoom) {
    failures.push('ChatRoomPage chunk was not found; chat/workspace code may have been pulled into the main bundle')
  } else if (kb(chatRoom.bytes) > budget.chatRoomKb) {
    failures.push(`ChatRoomPage chunk is ${formatKb(chatRoom.bytes)}, expected <= ${budget.chatRoomKb}KB`)
  }

  if (oversized.length > 0) {
    failures.push(
      `oversized frontend chunk(s): ${oversized.map((item) => `${item.file} ${formatKb(item.bytes)}`).join(', ')}`,
    )
  }

  const largest = [...sizes].sort((a, b) => b.bytes - a.bytes).slice(0, 6)

  return {
    mainIndex,
    chatRoom,
    oversized,
    largest,
    failures,
  }
}

export async function readFrontendBundleSizes(dir = assetsDir) {
  const files = await readdir(dir)
  const jsFiles = files.filter((file) => file.endsWith('.js'))
  return Promise.all(
    jsFiles.map(async (file) => ({
      file,
      bytes: (await stat(join(dir, file))).size,
    })),
  )
}

export async function runFrontendBundleCheck() {
  const sizes = await readFrontendBundleSizes()
  const result = evaluateFrontendBundleBudgets(sizes)

  console.log('Frontend bundle budget:')
  console.log(`- main index: ${result.mainIndex ? formatKb(result.mainIndex.bytes) : 'missing'} / ${budgets.mainIndexKb}KB`)
  console.log(`- chat route: ${result.chatRoom ? formatKb(result.chatRoom.bytes) : 'missing'} / ${budgets.chatRoomKb}KB`)
  console.log(`- largest chunks: ${result.largest.map((item) => `${item.file} ${formatKb(item.bytes)}`).join(', ')}`)

  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(`fail - ${failure}`)
    process.exit(1)
  }

  console.log('ok - frontend bundle budget passed')
}

if (import.meta.main) await runFrontendBundleCheck()
