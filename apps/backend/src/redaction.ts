export type RedactionResult = {
  text: string
  count: number
}

export function redactSensitiveText(value: string): RedactionResult {
  let count = 0
  let text = value
  const replace = (pattern: RegExp, replacement = '[REDACTED_SECRET]') => {
    text = text.replace(pattern, () => {
      count += 1
      return replacement
    })
  }

  replace(/\bsk-(?:or-v1|proj)-[A-Za-z0-9_-]{12,}\b/g)
  replace(/\bsk-ant-[A-Za-z0-9_-]{12,}\b/g)
  replace(/\bhf_[A-Za-z0-9]{20,}\b/g)
  replace(/\bsk_live_[A-Za-z0-9]{16,}\b/g)
  replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{20,})\b/g)
  replace(/\bAIza[A-Za-z0-9_-]{35}\b/g)
  replace(/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g)
  replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g)
  replace(/\bpostgres(?:ql)?:\/\/[^\s"'`]+/gi, 'postgresql://[REDACTED_SECRET]')
  replace(/\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL)[A-Z0-9_]*\s*=\s*[^\s"'`]+/g)
  replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)

  return { text, count }
}

export function redactUnknownDiagnosticText(error: unknown, maxLength = 500) {
  if (error instanceof Error) return redactSensitiveText(error.message).text.slice(0, maxLength)
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return redactSensitiveText(message).text.slice(0, maxLength)
    const errorField = (error as { error?: unknown }).error
    if (typeof errorField === 'string') return redactSensitiveText(errorField).text.slice(0, maxLength)
    return ''
  }
  return redactSensitiveText(String(error)).text.slice(0, maxLength)
}
