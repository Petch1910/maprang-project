const frontendErrorSecretPatterns = [
  /sk-(?:or|proj|live|test|ant)-[A-Za-z0-9_-]{12,}/gi,
  /(?:postgres(?:ql)?|mysql|mongodb):\/\/[^\s"'`]+/gi,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
]

export function safeErrorTextForClassification(error: unknown, maxLength = 300) {
  if (!(error instanceof Error)) return ''
  const redacted = frontendErrorSecretPatterns.reduce(
    (message, pattern) => message.replace(pattern, '[redacted]'),
    error.message,
  )
  return redacted.slice(0, maxLength).toLowerCase()
}
