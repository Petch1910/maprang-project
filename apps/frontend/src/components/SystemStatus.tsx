import type { HealthStatus } from '../lib/api'
import { frontendEnvWarnings } from '../lib/env'

type SystemStatusProps = {
  healthStatus: HealthStatus | null
  isLoading?: boolean
  onRefresh: () => Promise<void>
}

function Dot({ ok }: { ok: boolean }) {
  return <span className={`size-2 rounded-full ${ok ? 'bg-green-500' : 'bg-amber-500'}`} />
}

function authModeLabel(mode?: NonNullable<HealthStatus['security']>['authMode']) {
  if (mode === 'supabase-jwt') return 'Supabase'
  if (mode === 'local-dev-header') return 'โหมดในเครื่อง'
  return 'ยังไม่ทราบ'
}

function storageLabel(storage?: NonNullable<HealthStatus['security']>['avatarStorage']) {
  if (storage === 'supabase') return 'Supabase'
  if (storage === 'local') return 'ในเครื่อง'
  return 'ยังไม่ทราบ'
}

function storageAccessLabel(access?: NonNullable<HealthStatus['security']>['avatarStorageAccess']) {
  if (access === 'signed') return 'signed URL'
  if (access === 'public') return 'public read'
  if (access === 'local') return 'ในเครื่อง'
  return 'ยังไม่ทราบ'
}

function providerStatusLabel(status?: string) {
  if (status === 'verified') return 'ยืนยันแล้ว'
  if (status === 'needs_live_smoke') return 'รอทดสอบจริง'
  if (status === 'missing_provider') return 'ยังไม่ตั้งค่า'
  return status ?? 'ยังไม่ทราบ'
}

export function SystemStatus({ healthStatus, isLoading = false, onRefresh }: SystemStatusProps) {
  const checks = healthStatus?.checks
  const frontendWarnings = frontendEnvWarnings()
  const chatProvider = healthStatus?.model?.chatProvider
  const imageGeneration = healthStatus?.model?.imageGeneration
  const structuredKnowledge = healthStatus?.knowledge?.structured
  const chatProductionReady = Boolean(chatProvider?.productionReady ?? chatProvider?.liveVerified)
  const chatRuntimeIsLocal = chatProvider?.activeRuntimeProvider === 'local' || chatProvider?.forcedLocal === true
  const imageConfigured = Boolean(checks?.imageGenerationConfigured || imageGeneration?.configured)
  const imageProductionReady = Boolean(imageGeneration?.productionReady ?? imageGeneration?.liveVerified)
  const chatStatusLabel = chatProductionReady
    ? 'ยืนยันแล้ว'
    : chatRuntimeIsLocal
      ? 'โหมดในเครื่องพร้อมเล่น'
      : checks?.openRouterConfigured
        ? 'ตั้งค่าแล้ว รอทดสอบจริง'
        : 'ยังขาด'
  const chatRuntimeLabel = chatRuntimeIsLocal
    ? `โหมดในเครื่อง${chatProvider?.forcedLocal ? ' (บังคับใช้)' : ''}`
    : chatProvider?.activeRuntimeProvider === 'openrouter'
      ? 'OpenRouter'
      : chatProvider?.activeRuntimeProvider ?? 'ยังไม่ทราบ'
  const imageStatusLabel = imageProductionReady ? 'ยืนยันแล้ว' : imageConfigured ? 'ตั้งค่าแล้ว รอทดสอบจริง' : 'ใช้ภาพร่างระบบ'
  const refreshDisabledReason = isLoading ? 'กำลังโหลดสถานะระบบ' : ''

  return (
    <section className="rounded-lg border border-white/10 bg-[#18181d]/90 p-4 text-white shadow-[0_18px_58px_rgba(0,0,0,0.18)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-white/42 uppercase">ระบบ</p>
          <h2 className="m-0 text-lg font-bold text-white">สถานะ</h2>
        </div>
        <button type="button"
          aria-disabled={isLoading}
          className="min-h-8 rounded-full border border-white/10 bg-white/7 px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
          data-testid="system-status-refresh"
          disabled={isLoading}
          onClick={onRefresh}
          title={refreshDisabledReason || 'รีเฟรชสถานะระบบ'}
        >
          รีเฟรช
        </button>
      </div>

      <div className="flex flex-col gap-2 text-sm font-bold text-white/62">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(checks?.databaseConfigured)} />
            URL ฐานข้อมูล
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
            <Dot ok={Boolean(checks?.openRouterConfigured || chatRuntimeIsLocal)} />
            AI แชท
          </span>
          <span>{chatStatusLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(chatProductionReady || chatRuntimeIsLocal)} />
            Runtime แชท
          </span>
          <span>{chatRuntimeLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={imageConfigured} />
            AI สร้างรูป
          </span>
          <span>{imageStatusLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(structuredKnowledge?.ok)} />
            คลังความรู้
          </span>
          <span>{structuredKnowledge?.ok ? `${structuredKnowledge.fileCount} ไฟล์` : 'ต้องตรวจ'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={Boolean(checks?.supabaseAuthConfigured || checks?.adminAuthConfigured)} />
            ยืนยันตัวตน
          </span>
          <span>{authModeLabel(healthStatus?.security?.authMode)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={healthStatus?.security?.avatarStorage === 'supabase'} />
            ที่เก็บรูปตัวละคร
          </span>
          <span>{storageLabel(healthStatus?.security?.avatarStorage)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <Dot ok={healthStatus?.security?.avatarStorageAccess === 'signed' || healthStatus?.security?.avatarStorageAccess === 'local'} />
            สิทธิ์เปิดรูป
          </span>
          <span>{storageAccessLabel(healthStatus?.security?.avatarStorageAccess)}</span>
        </div>
      </div>

      {healthStatus?.model && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs font-bold text-white/52">
          <div className="truncate text-white/78">{healthStatus.model.name}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <span>ขาเข้า ${healthStatus.model.inputCostPer1M}/1M</span>
            <span>ขาออก ${healthStatus.model.outputCostPer1M}/1M</span>
            <span>สูงสุด {healthStatus.model.maxInputChars.toLocaleString()} ตัวอักษร</span>
            {typeof healthStatus.model.minRoleplayReplyChars === 'number' && (
              <span>บทบาทสมมุติขั้นต่ำ {healthStatus.model.minRoleplayReplyChars.toLocaleString()} ตัวอักษร</span>
            )}
            {typeof healthStatus.model.promptBudgetTokens === 'number' && (
              <span>งบพรอมป์ {healthStatus.model.promptBudgetTokens.toLocaleString()} โทเคน</span>
            )}
            {typeof healthStatus.model.promptHistoryMaxMessages === 'number' && (
              <span>ประวัติ {healthStatus.model.promptHistoryMaxMessages.toLocaleString()} ข้อความ</span>
            )}
            {healthStatus.model.providerRetry && (
              <span>
                ลองซ้ำแชท {healthStatus.model.providerRetry.chatAttempts} ครั้ง / ดราฟต์{' '}
                {healthStatus.model.providerRetry.creatorDraftAttempts} ครั้ง
              </span>
            )}
            {healthStatus.model.chatProvider?.status && <span>แชท {providerStatusLabel(healthStatus.model.chatProvider.status)}</span>}
            {healthStatus.model.chatProvider?.activeRuntimeProvider && <span>runtime {chatRuntimeLabel}</span>}
            {healthStatus.model.chatProvider?.localFallbackEnabled && (
              <span>แชทในเครื่องพร้อมใช้</span>
            )}
            <span>รูป {healthStatus.model.imageGeneration?.model ?? 'ยังไม่ตั้งค่า'}</span>
            {healthStatus.model.imageGeneration?.status && (
              <span>สถานะรูป {providerStatusLabel(healthStatus.model.imageGeneration.status)}</span>
            )}
            {structuredKnowledge && <span>คลังความรู้ {structuredKnowledge.ok ? 'พร้อม' : 'ต้องตรวจ'}</span>}
            {healthStatus.security?.signedUrlExpiresIn && <span>signed URL {healthStatus.security.signedUrlExpiresIn} วินาที</span>}
          </div>
        </div>
      )}

      {healthStatus?.env && healthStatus.env.missingRecommended.length > 0 && (
        <p className="mt-3 mb-0 line-clamp-3 text-xs font-bold leading-relaxed text-white/52">
          ค่าระบบแนะนำที่ยังขาด: {healthStatus.env.missingRecommended.join(', ')}
        </p>
      )}

      {healthStatus?.env && (healthStatus.env.missingRequired.length > 0 || (healthStatus.env.invalid?.length ?? 0) > 0) && (
        <div className="mt-3 rounded-lg border border-rose-300/25 bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-100">
          <p className="m-0 font-black">ค่าระบบใช้งานจริงยังไม่พร้อม</p>
          {healthStatus.env.missingRequired.length > 0 && <p className="m-0 mt-1">ขาด: {healthStatus.env.missingRequired.join(', ')}</p>}
          {(healthStatus.env.invalid?.length ?? 0) > 0 && <p className="m-0 mt-1">ผิดค่า: {healthStatus.env.invalid?.join(', ')}</p>}
        </div>
      )}

      {frontendWarnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
          <p className="m-0 font-black">ค่าหน้าเว็บควรตรวจเพิ่ม</p>
          <p className="m-0 mt-1">{frontendWarnings.join(' / ')}</p>
        </div>
      )}

      {structuredKnowledge && !structuredKnowledge.ok && (
        <div className="mt-3 rounded-lg border border-rose-300/25 bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-100">
          <p className="m-0 font-black">คลังความรู้ต้องแก้ไข</p>
          <p className="m-0 mt-1">
            {[...structuredKnowledge.missing.map((name) => `ขาด ${name}`), ...structuredKnowledge.errors].join(' / ') ||
              'รัน bun run knowledge:audit'}
          </p>
        </div>
      )}

      {healthStatus?.databaseError && (
        <p className="mt-3 mb-0 line-clamp-3 text-xs font-bold leading-relaxed text-amber-100/78">{healthStatus.databaseError}</p>
      )}
    </section>
  )
}
