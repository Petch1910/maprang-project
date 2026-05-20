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
    failures.push('ไม่พบ bundle หลักใน apps/frontend/dist/assets')
  } else if (kb(mainIndex.bytes) > budget.mainIndexKb) {
    failures.push(`bundle หลักมีขนาด ${formatKb(mainIndex.bytes)}, ต้องไม่เกิน ${budget.mainIndexKb}KB`)
  }

  if (!chatRoom) {
    failures.push('ไม่พบ chunk หน้า ChatRoomPage; โค้ด chat/workspace อาจถูกรวมเข้า bundle หลัก')
  } else if (kb(chatRoom.bytes) > budget.chatRoomKb) {
    failures.push(`chunk หน้า ChatRoomPage มีขนาด ${formatKb(chatRoom.bytes)}, ต้องไม่เกิน ${budget.chatRoomKb}KB`)
  }

  if (oversized.length > 0) {
    failures.push(
      `พบ chunk ฝั่งหน้าบ้านที่ใหญ่เกินกำหนด: ${oversized.map((item) => `${item.file} ${formatKb(item.bytes)}`).join(', ')}`,
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

export async function runFrontendBundleCheck(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
  readSizes: () => Promise<BundleSize[]> = readFrontendBundleSizes,
) {
  const sizes = await readSizes()
  const result = evaluateFrontendBundleBudgets(sizes)

  writeLine('งบขนาด bundle ฝั่ง frontend:')
  writeLine(`- bundle หลัก: ${result.mainIndex ? formatKb(result.mainIndex.bytes) : 'ไม่พบ'} / ${budgets.mainIndexKb}KB`)
  writeLine(`- chunk หน้าแชท: ${result.chatRoom ? formatKb(result.chatRoom.bytes) : 'ไม่พบ'} / ${budgets.chatRoomKb}KB`)
  writeLine(`- chunk ใหญ่สุด: ${result.largest.map((item) => `${item.file} ${formatKb(item.bytes)}`).join(', ')}`)

  if (result.failures.length > 0) {
    for (const failure of result.failures) writeError(`ไม่ผ่าน - ${failure}`)
    return 1
  }

  writeLine('ผ่าน - frontend bundle budget ผ่านแล้ว')
  return 0
}

if (import.meta.main) process.exit(await runFrontendBundleCheck())
