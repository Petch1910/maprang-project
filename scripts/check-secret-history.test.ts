import { describe, expect, test } from 'bun:test'
import { collectSecretHistoryFindingsFromGitLog, runSecretHistoryCheck } from './check-secret-history'

const commitA = 'a'.repeat(40)
const commitB = 'b'.repeat(40)

describe('secret history scanner', () => {
  test('detects secret patterns in added and removed diff lines without returning secret values', () => {
    const openRouterKey = `sk-or-v1-${'x'.repeat(40)}`
    const claudeCodeKey = `ccsk-${'y'.repeat(40)}`
    const findings = collectSecretHistoryFindingsFromGitLog(`
${commitA}
diff --git a/.claude/settings.json b/.claude/settings.json
--- a/.claude/settings.json
+++ b/.claude/settings.json
+{"apiKey":"${claudeCodeKey}"}
${commitB}
diff --git a/apps/backend/.env b/apps/backend/.env
--- a/apps/backend/.env
+++ b/apps/backend/.env
-OPENROUTER_API_KEY=${openRouterKey}
`)

    expect(findings).toEqual([
      {
        commit: commitA,
        file: '.claude/settings.json',
        name: 'Claude Code key',
        change: 'added',
      },
      {
        commit: commitB,
        file: 'apps/backend/.env',
        name: 'OpenRouter key',
        change: 'removed',
      },
    ])
    expect(JSON.stringify(findings)).not.toContain(openRouterKey)
    expect(JSON.stringify(findings)).not.toContain(claudeCodeKey)
  })

  test('caps runner output and does not print secret values', async () => {
    const errors: string[] = []
    const lines: string[] = []
    const secretValue = `sk-proj-${'z'.repeat(40)}`

    const exitCode = await runSecretHistoryCheck(
      (line) => lines.push(line),
      (line) => errors.push(line),
      async () => [
        {
          commit: commitA,
          file: 'docs/leaked.md',
          name: 'OpenAI project key',
          change: 'added',
          secretValue,
        },
      ],
    )
    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('OpenAI project key')
    expect(errors.join('\n')).not.toContain(secretValue)
  })
})
