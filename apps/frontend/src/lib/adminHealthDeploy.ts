export type DeployCheck = {
  label: string
  ok: boolean
  detail: string
  action: string
  scope: 'local' | 'production' | 'frontend'
}

export type DeployPhaseStep = {
  title: string
  ok: boolean
  command: string
  detail: string
}

function blockerSummary(blockers: DeployCheck[]) {
  if (blockers.length === 0) return 'ผ่านแล้ว'
  const names = blockers
    .slice(0, 3)
    .map((check) => check.label)
    .join(', ')
  return blockers.length > 3 ? `ยังค้าง ${blockers.length} ข้อ: ${names} และรายการอื่น` : `ยังค้าง ${blockers.length} ข้อ: ${names}`
}

export function buildDeployPhaseSteps(deployChecks: DeployCheck[]): DeployPhaseStep[] {
  const productionChecks = deployChecks.filter((check) => check.scope === 'production' || check.scope === 'frontend')
  const liveProviderChecks = productionChecks.filter(
    (check) => check.action.includes('CHAT_PROVIDER_LIVE_VERIFIED') || check.action.includes('IMAGE_GENERATION_LIVE_VERIFIED'),
  )
  const liveProviderCheckSet = new Set(liveProviderChecks)
  const stagingBlockers = productionChecks.filter((check) => !check.ok && !liveProviderCheckSet.has(check))
  const liveProviderBlockers = liveProviderChecks.filter((check) => !check.ok)
  const productionBlockers = productionChecks.filter((check) => !check.ok)

  return [
    {
      title: '1. สเตจจิงและโดเมนจริง',
      ok: stagingBlockers.length === 0,
      command: 'bun run staging:verify + bun run e2e:smoke',
      detail:
        stagingBlockers.length === 0
          ? 'ด่านสเตจจิงฝั่ง config พร้อมแล้ว ให้เก็บหลักฐาน URL, CORS, auth, storage และ e2e smoke ลง RELEASE_HANDOFF.md'
          : `${blockerSummary(stagingBlockers)} ก่อน จากนั้นตั้ง E2E_BASE_URL/E2E_API_BASE_URL เป็น deployed origins แล้วรัน e2e smoke`,
    },
    {
      title: '2. ทดสอบผู้ให้บริการจริง',
      ok: liveProviderBlockers.length === 0,
      command: 'bun run api:smoke:live',
      detail:
        liveProviderBlockers.length === 0
          ? 'ผู้ให้บริการจริงผ่านแล้ว ให้เก็บ handoffEvidence และคงค่าธงยืนยันเฉพาะ env ที่ smoke ผ่านจริง'
          : `${blockerSummary(liveProviderBlockers)} แล้วคัด JSON handoffEvidence ลง RELEASE_HANDOFF.md ก่อนตั้งค่าธงยืนยัน`,
    },
    {
      title: '3. เช็กก่อนปล่อยโปรดักชัน',
      ok: productionBlockers.length === 0,
      command: 'bun run production:check',
      detail:
        productionBlockers.length === 0
          ? 'พร้อมรัน production check รอบสุดท้ายกับโดเมนหลังบ้านและหน้าบ้านจริง'
          : `${blockerSummary(productionBlockers)} ก่อนรัน production check ซ้ำ`,
    },
  ]
}
