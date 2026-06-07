import { runLocalEvalSuite, type LocalEvalRun } from '../apps/backend/src/eval.service'

export function formatLocalEvalRun(run: Pick<LocalEvalRun, 'passed' | 'scenarioCount' | 'failures' | 'results'>) {
  const stdout = run.results.map((result) => `ประเมิน - ${result.id}: ประมาณ ${result.estimatedTokens} โทเคนของพรอมป์`)
  const stderr: string[] = []

  if (!run.passed) {
    stderr.push('ตรวจ eval ในเครื่องไม่ผ่าน:')
    for (const failure of run.failures) stderr.push(`- ${failure}`)
    return { exitCode: 1, stdout, stderr }
  }

  stdout.push(`ผ่าน - ตรวจ eval ในเครื่องผ่าน (${run.scenarioCount} สถานการณ์)`)
  return { exitCode: 0, stdout, stderr }
}

export async function runEvalLocal() {
  const run = await runLocalEvalSuite()
  const output = formatLocalEvalRun(run)
  for (const line of output.stdout) console.log(line)
  for (const line of output.stderr) console.error(line)
  return output.exitCode
}

if (import.meta.main) {
  process.exit(await runEvalLocal())
}
