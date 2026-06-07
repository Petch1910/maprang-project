export type SafeClipboardLike = {
  writeText?: (text: string) => Promise<void> | void
}

export function getSafeClipboard() {
  try {
    if (typeof navigator === 'undefined') return null
    return navigator.clipboard ?? null
  } catch {
    return null
  }
}

export async function safeWriteClipboardText(clipboard: SafeClipboardLike | null | undefined, text: string) {
  if (!clipboard?.writeText) return false

  try {
    await clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
