import 'dotenv/config'
import { validateRuntimeEnv } from './env'

const status = validateRuntimeEnv()

console.log(
  JSON.stringify(
    {
      ok: status.ok,
      mode: status.mode,
      missingRequired: status.missingRequired,
      missingRecommended: status.missingRecommended,
      invalid: status.invalid,
    },
    null,
    2,
  ),
)

if (status.mode === 'production' && (status.missingRequired.length > 0 || status.invalid.length > 0)) {
  process.exit(1)
}
