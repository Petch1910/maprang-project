import { runLocalEvalSuite } from '../apps/backend/src/eval.service'

const run = await runLocalEvalSuite()

for (const result of run.results) {
  console.log(`eval - ${result.id}: ${result.estimatedTokens} estimated prompt tokens`)
}

if (!run.passed) {
  console.error('Local eval failed:')
  for (const failure of run.failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`ok - local eval passed (${run.scenarioCount} scenarios)`)
