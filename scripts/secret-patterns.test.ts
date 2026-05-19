import { describe, expect, test } from 'bun:test'
import { isUnsafeTrackedEnvPath } from './check-secrets'
import { repoSecretPatterns, secretPatterns, type SecretPattern } from './secret-patterns'

function namesFor(patterns: SecretPattern[], content: string) {
  return patterns.filter((secret) => secret.pattern.test(content)).map((secret) => secret.name)
}

describe('secret pattern sets', () => {
  test('repo scan catches committed provider and platform token shapes', () => {
    const fakeOpenRouterKey = ['sk', 'or', 'v1', 'a'.repeat(32)].join('-')
    const fakeOpenAiProjectKey = ['sk', 'proj', 'b'.repeat(32)].join('-')
    const fakeGithubToken = `ghp_${'c'.repeat(36)}`
    const fakeGoogleApiKey = `AIza${'d'.repeat(35)}`
    const fakeSlackToken = `xoxb-${'1'.repeat(20)}`
    const fakePrivateKeyBlock = ['-----BEGIN ', 'FAKE PRIVATE KEY', '-----'].join('')
    const content = [
      fakeOpenRouterKey,
      fakeOpenAiProjectKey,
      fakeGithubToken,
      fakeGoogleApiKey,
      fakeSlackToken,
      fakePrivateKeyBlock,
    ].join('\n')

    expect(namesFor(repoSecretPatterns, content)).toEqual(
      expect.arrayContaining([
        'OpenRouter key',
        'OpenAI project key',
        'GitHub token',
        'Google API key',
        'Slack token',
        'Private key block',
      ]),
    )
  })

  test('repo scan allows placeholder docs that handoff and memory scans still reject', () => {
    const placeholderDocs = [
      'DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require',
      'SUPABASE_SERVICE_ROLE_KEY=service_role_placeholder_value_for_documentation',
    ].join('\n')

    expect(namesFor(repoSecretPatterns, placeholderDocs)).toEqual([])
    expect(namesFor(secretPatterns, placeholderDocs)).toEqual(
      expect.arrayContaining(['Postgres URL with password', 'Supabase service role value']),
    )
  })

  test('handoff and memory scans inherit repo secret coverage', () => {
    const fakeOpenRouterKey = ['sk', 'or', 'v1', 'e'.repeat(32)].join('-')
    const fakeGithubToken = `gho_${'f'.repeat(36)}`
    const content = [fakeOpenRouterKey, fakeGithubToken].join('\n')

    expect(namesFor(secretPatterns, content)).toEqual(
      expect.arrayContaining(['OpenRouter key', 'GitHub token']),
    )
  })

  test('tracked env file guard rejects real env files but allows templates', () => {
    expect(isUnsafeTrackedEnvPath('.env')).toBe(true)
    expect(isUnsafeTrackedEnvPath('apps/backend/.env')).toBe(true)
    expect(isUnsafeTrackedEnvPath('apps/frontend/.env.production')).toBe(true)
    expect(isUnsafeTrackedEnvPath('apps/frontend/.env.local')).toBe(true)
    expect(isUnsafeTrackedEnvPath('apps/backend/.env.example')).toBe(false)
    expect(isUnsafeTrackedEnvPath('apps/frontend/.env.production.example')).toBe(false)
  })
})
