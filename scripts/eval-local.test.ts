import { describe, expect, test } from 'bun:test'
import { formatLocalEvalRun } from './eval-local'

const sampleNarrativeQuality = {
  source: 'ainovel-inspired' as const,
  score: 90,
  dimensions: {
    continuity: 90,
    characterVoice: 90,
    sceneProgression: 90,
    relationshipAwareness: 90,
    emotionalDepth: 90,
    sensoryGrounding: 90,
    playerAgency: 90,
  },
  intent: 'conversation' as const,
  checkpoint: 'turn' as const,
  notes: [],
}

describe('local eval output formatting', () => {
  test('prints scenario token lines and pass summary', () => {
    const output = formatLocalEvalRun({
      passed: true,
      scenarioCount: 2,
      failures: [],
      results: [
        { id: 'roleplay-depth', estimatedTokens: 1200, localReplyChars: 900, localReplyQuality: sampleNarrativeQuality },
        { id: 'prompt-injection', estimatedTokens: 900, localReplyChars: 880, localReplyQuality: sampleNarrativeQuality },
      ],
    })

    expect(output).toEqual({
      exitCode: 0,
      stdout: [
        'ประเมิน - roleplay-depth: ประมาณ 1200 โทเคนของพรอมป์',
        'ประเมิน - prompt-injection: ประมาณ 900 โทเคนของพรอมป์',
        'ผ่าน - ตรวจ eval ในเครื่องผ่าน (2 สถานการณ์)',
      ],
      stderr: [],
    })
  })

  test('keeps failures on stderr and returns a nonzero exit code', () => {
    const output = formatLocalEvalRun({
      passed: false,
      scenarioCount: 1,
      failures: ['scenario-a: ไม่พบข้อความที่ต้องมี "เป้าหมายของฉาก"'],
      results: [{ id: 'scenario-a', estimatedTokens: 777, localReplyChars: 700, localReplyQuality: sampleNarrativeQuality }],
    })

    expect(output.exitCode).toBe(1)
    expect(output.stdout).toEqual(['ประเมิน - scenario-a: ประมาณ 777 โทเคนของพรอมป์'])
    expect(output.stderr).toEqual([
      'ตรวจ eval ในเครื่องไม่ผ่าน:',
      '- scenario-a: ไม่พบข้อความที่ต้องมี "เป้าหมายของฉาก"',
    ])
  })
})
