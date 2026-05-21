const frontendErrorSecretPatterns = [
  /sk-(?:or|proj|live|test|ant)-[A-Za-z0-9_-]{12,}/gi,
  /(?:postgres(?:ql)?|mysql|mongodb):\/\/[^\s"'`]+/gi,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
]

function errorMessageForClassification(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error !== 'object' || error === null || !('message' in error)) return ''

  const message = (error as { message?: unknown }).message
  return typeof message === 'string' ? message : ''
}

export function safeErrorTextForClassification(error: unknown, maxLength = 300) {
  const rawMessage = errorMessageForClassification(error)
  if (!rawMessage) return ''
  const redacted = frontendErrorSecretPatterns.reduce(
    (message, pattern) => message.replace(pattern, '[redacted]'),
    rawMessage,
  )
  return redacted.slice(0, maxLength).toLowerCase()
}
