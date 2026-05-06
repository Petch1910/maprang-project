import type { HealthStatus } from '../lib/api'
import { frontendEnvWarnings } from '../lib/env'

type SystemStatusProps = {
  healthStatus: HealthStatus | null
  onRefresh: () => Promise<void>
}

function Dot({ ok }: { ok: boolean }) {
  return <span className={`size-2 rounded-full ${ok ? 'bg-green-500' : 'bg-amber-500'}`} />
}

export function SystemStatus({ healthStatus, onRefresh }: SystemStatusProps) {
  const checks = healthStatus?.checks
  const frontendWarnings = frontendEnvWarnings()

  return (
    <section className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-[0_20px_60px_rgba(61,79,112,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-slate-500 uppercase">ระบบ</p>
          <h2 className="m-0 text-lg font-bold text-slate-900">สถานะ</h2>
        </div>
        <button
          className="min-h-8 rounded-full border border-slate-900/10 bg-white px-3 text-xs font-bold text-slate-700"
          onClick={onRefresh}
          type="button"
        >
          รีเฟรช
        </button>
      </div>

      <div className="flex flex-col gap-2 text-sm font-bold text-slate-600">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(checks?.databaseConfigured)} />
            DATABASE_URL
          </span>
          <span>{checks?.databaseConfigured ? 'ตั้งค่าแล้ว' : 'ยังขาด'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(checks?.databaseConnected)} />
            ฐานข้อมูล
          </span>
          <span>{checks?.databaseConnected ? 'เชื่อมต่อแล้ว' : 'ยังไม่พร้อม'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(checks?.openRouterConfigured)} />
            OpenRouter
          </span>
          <span>{checks?.openRouterConfigured ? 'ตั้งค่าแล้ว' : 'ยังขาด'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(checks?.supabaseAuthConfigured || checks?.adminAuthConfigured)} />
            ยืนยันตัวตน
          </span>
          <span>{healthStatus?.security?.authMode ?? 'local-dev-header'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={healthStatus?.security?.avatarStorage === 'supabase'} />
            ที่เก็บรูปตัวละคร
          </span>
          <span>{healthStatus?.security?.avatarStorage ?? 'local'}</span>
        </div>
      </div>

      {healthStatus?.model && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-bold text-slate-500">
          <div className="truncate text-slate-700">{healthStatus.model.name}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <span>input ${healthStatus.model.inputCostPer1M}/1M</span>
            <span>output ${healthStatus.model.outputCostPer1M}/1M</span>
            <span>สูงสุด {healthStatus.model.maxInputChars.toLocaleString()} ตัวอักษร</span>
          </div>
        </div>
      )}

      {healthStatus?.env && healthStatus.env.missingRecommended.length > 0 && (
        <p className="mt-3 mb-0 line-clamp-3 text-xs leading-relaxed text-slate-500">
          env แนะนำที่ยังขาด: {healthStatus.env.missingRecommended.join(', ')}
        </p>
      )}

      {healthStatus?.env && (healthStatus.env.missingRequired.length > 0 || (healthStatus.env.invalid?.length ?? 0) > 0) && (
        <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-50 p-3 text-xs leading-relaxed text-rose-800">
          <p className="m-0 font-black">Backend env ยังไม่พร้อม production</p>
          {healthStatus.env.missingRequired.length > 0 && <p className="m-0 mt-1">ขาด: {healthStatus.env.missingRequired.join(', ')}</p>}
          {(healthStatus.env.invalid?.length ?? 0) > 0 && <p className="m-0 mt-1">ผิดค่า: {healthStatus.env.invalid?.join(', ')}</p>}
        </div>
      )}

      {frontendWarnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <p className="m-0 font-black">Frontend env ควรตรวจเพิ่ม</p>
          <p className="m-0 mt-1">{frontendWarnings.join(' / ')}</p>
        </div>
      )}

      {healthStatus?.databaseError && (
        <p className="mt-3 mb-0 line-clamp-3 text-xs leading-relaxed text-amber-700">{healthStatus.databaseError}</p>
      )}
    </section>
  )
}
