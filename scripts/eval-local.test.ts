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
        'eval - roleplay-depth: ประมาณ 1200 โทเคนของพรอมป์',
        'eval - prompt-injection: ประมาณ 900 โทเคนของพรอมป์',
        'ok - local eval ผ่าน (2 สถานการณ์)',
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
    expect(output.stdout).toEqual(['eval - scenario-a: ประมาณ 777 โทเคนของพรอมป์'])
    expect(output.stderr).toEqual([
      'Local eval ไม่ผ่าน:',
      '- scenario-a: missing required text "Scene Objective"',
    ])
  })
})
