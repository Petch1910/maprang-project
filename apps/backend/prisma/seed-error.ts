export function summarizeSeedError(error: unknown) {
  if (!(error instanceof Error)) return { type: typeof error }

  const errorWithCode = error as Error & { code?: unknown }
  const code = typeof errorWithCode.code === 'string' ? errorWithCode.code : undefined
  return {
    name: error.name || 'Error',
    ...(code ? { code } : {}),
  }
}
