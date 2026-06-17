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
  const localChecks = deployChecks.filter((check) => check.scope === 'local')
  const productionChecks = deployChecks.filter((check) => check.scope === 'production' || check.scope === 'frontend')
  const liveProviderChecks = productionChecks.filter(
    (check) => check.action.includes('CHAT_PROVIDER_LIVE_VERIFIED') || check.action.includes('IMAGE_GENERATION_LIVE_VERIFIED'),
  )
  const liveProviderCheckSet = new Set(liveProviderChecks)
  const localBlockers = localChecks.filter((check) => !check.ok)
  const stagingBlockers = productionChecks.filter((check) => !check.ok && !liveProviderCheckSet.has(check))
  const liveProviderBlockers = liveProviderChecks.filter((check) => !check.ok)
  const productionBlockers = productionChecks.filter((check) => !check.ok)

  return [
    {
      title: '1. Local server',
      ok: localBlockers.length === 0,
      command: 'bun run local:doctor + bun run qa:full',
      detail:
        localBlockers.length === 0
          ? 'เครื่องนี้พร้อมเป็น local server baseline แล้ว ใช้ qa:full เป็น gate หลักก่อนให้คนลองเล่น'
          : `${blockerSummary(localBlockers)} ก่อนถือว่า local server พร้อมเล่น`,
    },
    {
      title: '2. Ngrok preview / staging',
      ok: stagingBlockers.length === 0,
      command: 'bun run ngrok:proxy + bun run staging:verify + bun run e2e:smoke',
      detail:
        stagingBlockers.length === 0
          ? 'ถ้าต้องให้คนนอกลอง ให้เปิด Ngrok proxy แล้วรัน staging/e2e smoke กับ HTTPS origin เดียว'
          : `${blockerSummary(stagingBlockers)} ก่อน จากนั้นตั้ง E2E_BASE_URL/E2E_API_BASE_URL เป็น Ngrok หรือ deployed origin แล้วรัน e2e smoke`,
    },
    {
      title: '3. Live provider smoke',
      ok: liveProviderBlockers.length === 0,
      command: 'bun run api:smoke:live',
      detail:
        liveProviderBlockers.length === 0
          ? 'ผู้ให้บริการจริงผ่านแล้ว ให้เก็บ handoffEvidence และคงค่าธงยืนยันเฉพาะ env ที่ smoke ผ่านจริง'
          : `${blockerSummary(liveProviderBlockers)} แล้วคัด JSON handoffEvidence ลง RELEASE_HANDOFF.md ก่อนตั้งค่าธงยืนยัน`,
    },
    {
      title: '4. Cloud production',
      ok: productionBlockers.length === 0,
      command: 'bun run production:check',
      detail:
        productionBlockers.length === 0
          ? 'พร้อมรัน production check รอบสุดท้ายกับโดเมนหลังบ้านและหน้าบ้านจริง'
          : `${blockerSummary(productionBlockers)} ก่อนรัน production check ซ้ำ`,
    },
  ]
}
