export type TrustedMessageHandler<T = unknown> = (event: MessageEvent<T>) => void

export function normalizeTrustedMessageOrigin(origin: string) {
  try {
    const url = new URL(origin)
    const hasUnsafeShape =
      url.protocol !== 'https:' ||
      Boolean(url.username) ||
      Boolean(url.password) ||
      (url.pathname !== '/' && url.pathname !== '') ||
      Boolean(url.search) ||
      Boolean(url.hash)

    if (hasUnsafeShape) return null
    return url.origin
  } catch {
    return null
  }
}

export function isTrustedMessageOrigin(eventOrigin: string, trustedOrigins: readonly string[]) {
  const normalizedEventOrigin = normalizeTrustedMessageOrigin(eventOrigin)
  if (!normalizedEventOrigin) return false

  return trustedOrigins.some((origin) => normalizeTrustedMessageOrigin(origin) === normalizedEventOrigin)
}

export function postMessageToTrustedOrigin(
  targetWindow: Pick<Window, 'postMessage'> | null | undefined,
  message: unknown,
  targetOrigin: string,
) {
  const normalizedTargetOrigin = normalizeTrustedMessageOrigin(targetOrigin)
  if (!targetWindow || !normalizedTargetOrigin) return false

  targetWindow.postMessage(message, normalizedTargetOrigin)
  return true
}

export function addTrustedMessageListener<T = unknown>(
  trustedOrigins: readonly string[],
  handler: TrustedMessageHandler<T>,
  options?: boolean | AddEventListenerOptions,
) {
  if (typeof window === 'undefined') return () => {}

  const listener = (event: MessageEvent<T>) => {
    if (!isTrustedMessageOrigin(event.origin, trustedOrigins)) return
    handler(event)
  }

  window.addEventListener('message', listener, options)
  return () => {
    window.removeEventListener('message', listener, options)
  }
}
