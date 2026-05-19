import { describe, expect, test } from 'bun:test'
import { formatLocalEvalRun } from './eval-local'

describe('local eval output formatting', () => {
  test('prints scenario token lines and pass summary', () => {
    const output = formatLocalEvalRun({
      passed: true,
      scenarioCount: 2,
      failures: [],
      results: [
        { id: 'roleplay-depth', estimatedTokens: 1200 },
        { id: 'prompt-injection', estimatedTokens: 900 },
      ],
    })

    expect(output).toEqual({
      exitCode: 0,
      stdout: [
        'eval - roleplay-depth: 1200 estimated prompt tokens',
        'eval - prompt-injection: 900 estimated prompt tokens',
        'ok - local eval passed (2 scenarios)',
      ],
      stderr: [],
    })
  })

  test('keeps failures on stderr and returns a nonzero exit code', () => {
    const output = formatLocalEvalRun({
      passed: false,
      scenarioCount: 1,
      failures: ['scenario-a: missing required text "Scene Objective"'],
      results: [{ id: 'scenario-a', estimatedTokens: 777 }],
    })

    expect(output.exitCode).toBe(1)
    expect(output.stdout).toEqual(['eval - scenario-a: 777 estimated prompt tokens'])
    expect(output.stderr).toEqual([
      'Local eval failed:',
      '- scenario-a: missing required text "Scene Objective"',
    ])
  })
})
