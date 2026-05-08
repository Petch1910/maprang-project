import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const assetsDir = join(root, 'apps/frontend/dist/assets')

const budgets = {
  mainIndexKb: 350,
  chatRoomKb: 260,
  anyChunkKb: 500,
}

function kb(bytes: number) {
  return bytes / 1024
}

function formatKb(bytes: number) {
  return `${kb(bytes).toFixed(1)}KB`
}

const files = await readdir(assetsDir)
const jsFiles = files.filter((file) => file.endsWith('.js'))

const sizes = await Promise.all(
  jsFiles.map(async (file) => ({
    file,
    bytes: (await stat(join(assetsDir, file))).size,
  })),
)

const mainIndex = sizes.find((item) => /^index-[\w-]+\.js$/.test(item.file))
const chatRoom = sizes.find((item) => /^ChatRoomPage-[\w-]+\.js$/.test(item.file))
const oversized = sizes.filter((item) => kb(item.bytes) > budgets.anyChunkKb)

const failures: string[] = []

if (!mainIndex) {
  failures.push('main index bundle was not found in apps/frontend/dist/assets')
} else if (kb(mainIndex.bytes) > budgets.mainIndexKb) {
  failures.push(`main index bundle is ${formatKb(mainIndex.bytes)}, expected <= ${budgets.mainIndexKb}KB`)
}

if (!chatRoom) {
  failures.push('ChatRoomPage chunk was not found; chat/workspace code may have been pulled into the main bundle')
} else if (kb(chatRoom.bytes) > budgets.chatRoomKb) {
  failures.push(`ChatRoomPage chunk is ${formatKb(chatRoom.bytes)}, expected <= ${budgets.chatRoomKb}KB`)
}

if (oversized.length > 0) {
  failures.push(
    `oversized frontend chunk(s): ${oversized.map((item) => `${item.file} ${formatKb(item.bytes)}`).join(', ')}`,
  )
}

const largest = [...sizes].sort((a, b) => b.bytes - a.bytes).slice(0, 6)

console.log('Frontend bundle budget:')
console.log(`- main index: ${mainIndex ? formatKb(mainIndex.bytes) : 'missing'} / ${budgets.mainIndexKb}KB`)
console.log(`- chat route: ${chatRoom ? formatKb(chatRoom.bytes) : 'missing'} / ${budgets.chatRoomKb}KB`)
console.log(`- largest chunks: ${largest.map((item) => `${item.file} ${formatKb(item.bytes)}`).join(', ')}`)

if (failures.length > 0) {
  for (const failure of failures) console.error(`fail - ${failure}`)
  process.exit(1)
}

console.log('ok - frontend bundle budget passed')
