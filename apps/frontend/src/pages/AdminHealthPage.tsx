import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Database,
  Image,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Router,
  Server,
  ShieldCheck,
} from 'lucide-react'
import {
  ApiError,
  clearAdminApiKey,
  fetchAdminProcessMining,
  fetchHealthStatus,
  setAdminApiKey,
  type AdminProcessMiningSummary,
  type HealthStatus,
} from '../lib/api'
import { buildDeployPhaseSteps, type DeployCheck } from '../lib/adminHealthDeploy'
import {
  API_BASE_URL,
  frontendEnvWarnings,
  hasRealEnvValue,
  isLocalOrPlaceholderUrl,
  RAW_API_BASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from '../lib/env'
import { safeGetStorageItem } from '../lib/safeStorage'

function getStoredAdminKey() {
  if (typeof window === 'undefined') return ''
  return safeGetStorageItem(window.localStorage, 'maprang:adminKey') || ''
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
        ok ? 'border border-emerald-300/25 bg-emerald-400/12 text-emerald-100' : 'border border-amber-300/25 bg-amber-400/12 text-amber-100'
      }`}
    >
      {ok ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
      {ok ? 'พร้อม' : 'ต้องเช็ก'}
    </span>
  )
}

function scopeLabel(scope: DeployCheck['scope']) {
  if (scope === 'local') return 'เครื่องนี้'
  if (scope === 'frontend') return 'หน้าบ้าน'
  return 'ปล่อยจริง'
}

function scopeClass(scope: DeployCheck['scope']) {
  if (scope === 'local') return 'border border-emerald-300/25 bg-emerald-400/12 text-emerald-100'
  if (scope === 'frontend') return 'border border-sky-300/25 bg-sky-400/12 text-sky-100'
  return 'border border-amber-300/25 bg-amber-400/12 text-amber-100'
}

function providerStatusLabel(status?: string) {
  if (status === 'verified') return 'ยืนยันแล้ว'
  if (status === 'needs_live_smoke') return 'รอทดสอบจริง'
  if (status === 'missing_provider') return 'ยังไม่ตั้งค่า'
  return status ?? 'ไม่ทราบ'
}

function authModeLabel(mode?: NonNullable<HealthStatus['security']>['authMode']) {
  if (mode === 'supabase-jwt') return 'Supabase'
  if (mode === 'local-dev-header') return 'โหมดในเครื่อง'
  return 'ไม่ทราบ'
}

function storageLabel(storage?: NonNullable<HealthStatus['security']>['avatarStorage']) {
  if (storage === 'supabase') return 'Supabase'
  if (storage === 'local') return 'ในเครื่อง'
  return 'ไม่ทราบ'
}

function storageAccessLabel(access?: NonNullable<HealthStatus['security']>['avatarStorageAccess']) {
  if (access === 'signed') return 'signed URL'
  if (access === 'public') return 'public read'
  if (access === 'local') return 'ในเครื่อง'
  return 'ไม่ทราบ'
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('th-TH')
}

function buildChecks(healthStatus: HealthStatus | null): DeployCheck[] {
  const frontendWarnings = frontendEnvWarnings()
  const hasFrontendSupabase = hasRealEnvValue(SUPABASE_URL) && hasRealEnvValue(SUPABASE_ANON_KEY)
  const hasBackendUrl = hasRealEnvValue(RAW_API_BASE_URL) && !isLocalOrPlaceholderUrl(API_BASE_URL)
  const checks = healthStatus?.checks
  const security = healthStatus?.security
  const model = healthStatus?.model
  const chatProvider = model?.chatProvider
  const imageGeneration = model?.imageGeneration
  const narrativeEngine = model?.narrativeEngine
  const structuredKnowledge = healthStatus?.knowledge?.structured
  const chatRuntimeIsLocal = chatProvider?.activeRuntimeProvider === 'local' || chatProvider?.forcedLocal === true
  const chatProductionReady = Boolean(chatProvider?.productionReady ?? chatProvider?.liveVerified)
  const imageProductionReady = Boolean(imageGeneration?.productionReady ?? imageGeneration?.liveVerified)
  const backendEnvMissing = healthStatus?.env?.missingRequired ?? []
  const backendEnvInvalid = healthStatus?.env?.invalid ?? []
  const maxOutputTokens = model?.maxOutputTokens ?? 0
  const minRoleplayReplyChars = model?.minRoleplayReplyChars ?? 0
  const replyBudgetOk = Boolean(model && maxOutputTokens >= 1200 && minRoleplayReplyChars >= 320)
  const narrativeEngineReady = Boolean(
    narrativeEngine?.enabled &&
      narrativeEngine.promptInspectorVisible &&
      narrativeEngine.chatQualityMetadata &&
      narrativeEngine.dimensions.length >= 7,
  )
  const narrativeEngineCheck: DeployCheck = {
    label: 'Narrative Engine',
    ok: narrativeEngineReady,
    detail: narrativeEngine?.enabled
      ? `${narrativeEngine.workflow} / ${narrativeEngine.dimensions.length} quality dimensions`
      : 'narrative planning and quality metadata are not reported by backend health',
    action: narrativeEngineReady
      ? 'ตรวจคุณภาพบทได้จาก Chat rail และ /admin/prompt-inspector'
      : 'เปิด narrative-engine.service ใน backend แล้วรัน backend check',
    scope: 'local',
  }

  return [
    narrativeEngineCheck,
    {
      label: 'ฐานข้อมูลเชื่อมต่อ',
      ok: Boolean(checks?.databaseConfigured && checks.databaseConnected),
      detail: checks?.databaseConnected ? 'หลังบ้านเชื่อมฐานข้อมูลได้แล้ว' : 'ตั้ง DATABASE_URL แล้วรัน migration/smoke กับฐานข้อมูลจริง',
      action: checks?.databaseConnected ? 'รัน smoke ซ้ำก่อนให้คนอื่นลองเล่น' : 'ตั้ง DATABASE_URL แล้วรัน bun run smoke:local',
      scope: 'local',
    },
    {
      label: 'ค่าระบบหลังบ้าน',
      ok: backendEnvMissing.length === 0 && backendEnvInvalid.length === 0,
      detail:
        backendEnvMissing.length === 0 && backendEnvInvalid.length === 0
          ? 'ไม่มีค่าจำเป็นที่ขาดหรือผิดรูปแบบ'
          : [...backendEnvMissing.map((name) => `ขาด ${name}`), ...backendEnvInvalid].join(' / '),
      action: backendEnvMissing.length === 0 && backendEnvInvalid.length === 0 ? 'ล็อกชุดค่าไว้ในตัวจัดการ secret' : 'แก้ secret แล้วรัน deploy doctor',
      scope: 'production',
    },
    {
      label: 'คลังความรู้',
      ok: Boolean(structuredKnowledge?.ok),
      detail: structuredKnowledge?.ok ? `พร้อมใช้งาน ${structuredKnowledge.fileCount} ไฟล์` : 'ต้องรัน knowledge audit และแก้ไฟล์ที่ขาด',
      action: structuredKnowledge?.ok ? 'รัน knowledge audit ใน CI ต่อเนื่อง' : 'รัน bun run knowledge:audit',
      scope: 'local',
    },
    {
      label: 'แชทในเครื่อง',
      ok: chatRuntimeIsLocal,
      detail: chatRuntimeIsLocal ? 'โหมดจำลองในเครื่องพร้อมเล่นโดยไม่ใช้เครดิตผู้ให้บริการ' : 'ยังไม่ได้เปิด runtime ในเครื่อง',
      action: chatRuntimeIsLocal ? 'ใช้ qa:local หรือ api:smoke ตรวจ normal/stream ซ้ำได้' : 'ตั้ง LOCAL_CHAT_PROVIDER=1 หรือ CHAT_PROVIDER=local',
      scope: 'local',
    },
    {
      label: 'ทดสอบแชทจริง',
      ok: chatProductionReady,
      detail: chatProductionReady ? 'ยืนยัน live smoke แล้ว' : checks?.openRouterConfigured || chatProvider?.configured ? 'ตั้ง provider แล้ว แต่ยังต้องรัน live smoke' : 'ยังไม่มี provider key สำหรับแชทจริง',
      action: chatProductionReady ? 'คง flag เฉพาะ env ที่ smoke ผ่านจริง' : `รัน ${chatProvider?.liveSmokeCommand ?? 'bun run smoke:chat'} แล้วค่อยตั้ง flag`,
      scope: 'production',
    },
    {
      label: 'งบคำตอบแชท',
      ok: replyBudgetOk,
      detail: model ? `สูงสุด ${maxOutputTokens} โทเคน / ขั้นต่ำ ${minRoleplayReplyChars} ตัวอักษร` : 'รอสถานะโมเดลจากหลังบ้าน',
      action: replyBudgetOk ? 'ผ่านเกณฑ์ขั้นต่ำแล้ว' : 'ตั้ง MODEL_MAX_OUTPUT_TOKENS>=1200 และ MODEL_MIN_ROLEPLAY_REPLY_CHARS>=320',
      scope: 'local',
    },
    {
      label: 'ผู้ให้บริการสร้างรูป',
      ok: Boolean(checks?.imageGenerationConfigured || imageGeneration?.configured),
      detail: checks?.imageGenerationConfigured || imageGeneration?.configured ? `ตั้งค่า ${imageGeneration?.model ?? 'ระบบสร้างรูป'} แล้ว` : 'ยังใช้ภาพร่างของระบบ',
      action: checks?.imageGenerationConfigured || imageGeneration?.configured ? 'รัน smoke:image:live เพื่อยืนยัน quota' : 'ตั้ง IMAGE_GENERATION_API_KEY หรือ provider key',
      scope: 'local',
    },
    {
      label: 'ทดสอบสร้างรูปจริง',
      ok: imageProductionReady,
      detail: imageProductionReady ? 'ยืนยัน live smoke แล้ว' : 'ต้องรัน live image smoke ก่อนนับว่าพร้อมปล่อยจริง',
      action: imageProductionReady ? 'เก็บหลักฐาน handoff' : `รัน ${imageGeneration?.liveSmokeCommand ?? 'bun run smoke:image:live'}`,
      scope: 'production',
    },
    {
      label: 'ยืนยันตัวตน Supabase',
      ok: Boolean(checks?.supabaseAuthConfigured && hasFrontendSupabase),
      detail: checks?.supabaseAuthConfigured && hasFrontendSupabase ? 'หน้าบ้านและหลังบ้านมีค่า Supabase แล้ว' : 'ต้องตั้ง SUPABASE_* และ VITE_SUPABASE_* ให้ครบ',
      action: checks?.supabaseAuthConfigured && hasFrontendSupabase ? 'ทดสอบ login กับ origin จริงอีกครั้ง' : 'ตั้งค่าทั้งสองฝั่งให้ตรงกัน',
      scope: 'frontend',
    },
    {
      label: 'คลังรูป signed URL',
      ok: security?.avatarStorage === 'supabase' && security.avatarStorageAccess === 'signed',
      detail: security?.avatarStorage === 'supabase' && security.avatarStorageAccess === 'signed' ? `signed URL ${security.signedUrlExpiresIn ?? 3600}s` : 'ก่อนปล่อยจริงควรใช้ bucket private + signed URL',
      action: security?.avatarStorage === 'supabase' && security.avatarStorageAccess === 'signed' ? 'รัน storage smoke กับ env จริง' : 'ตั้ง SUPABASE_STORAGE_ACCESS=signed',
      scope: 'production',
    },
    {
      label: 'CORS ของโดเมนจริง',
      ok: Boolean(security?.corsOrigins.length && security.corsOrigins.every((origin) => !isLocalOrPlaceholderUrl(origin))),
      detail: security?.corsOrigins.length ? security.corsOrigins.join(', ') : 'ยังไม่มี CORS_ORIGINS',
      action: 'ตั้ง CORS_ORIGINS เป็น frontend origin จริงเท่านั้นก่อนปล่อยจริง',
      scope: 'production',
    },
    {
      label: 'URL หลังบ้านของหน้าบ้าน',
      ok: hasBackendUrl,
      detail: hasBackendUrl ? API_BASE_URL : 'ยังใช้ local/placeholder URL',
      action: hasBackendUrl ? 'ใช้ค่านี้กับ staging smoke' : 'ตั้ง VITE_API_BASE_URL เป็น HTTPS backend จริง',
      scope: 'frontend',
    },
    {
      label: 'คำเตือน env หน้าบ้าน',
      ok: frontendWarnings.length === 0,
      detail: frontendWarnings.length === 0 ? 'ไม่มีคำเตือน env หน้าบ้าน' : frontendWarnings.join(' / '),
      action: frontendWarnings.length === 0 ? 'พร้อมตรวจรอบถัดไป' : 'แก้ค่า .env ฝั่ง frontend',
      scope: 'frontend',
    },
  ]
}

function routeAuditRows() {
  return [
    { area: 'สำรวจ', route: '/', status: 'พร้อม', detail: 'ค้นหา หมวดหมู่ การ์ดตัวละคร และเล่นต่อทำงานจริง' },
    { area: 'แชท', route: '/chat', status: 'พร้อมในเครื่อง', detail: 'ส่งข้อความ local, scene notice, report, และเมนูแชทมี action หรือ confirm' },
    { area: 'สร้างตัวละคร', route: '/create', status: 'พร้อมในเครื่อง', detail: 'สร้างร่าง อัปโหลด ลิงก์รูป ตรวจความพร้อม และเผยแพร่ผ่านหลังบ้าน' },
    { area: 'ผู้ช่วยสร้างภาพ', route: '/ai-creator', status: 'พร้อมในเครื่อง', detail: 'มีสถานะกำลังโหลด ถูกจำกัด ภาพสำรอง คลังผลงาน แกลเลอรี และนำงานกลับมาใช้ต่อ' },
    { area: 'เครดิตใช้งาน', route: '/wallet', status: 'พร้อม', detail: 'ดูยอดเครดิต ใช้งานล่าสุด และโหมด developer key โดยไม่เก็บ raw key ถาวร' },
    { area: 'อีเวนต์', route: '/events', status: 'พร้อม', detail: 'รวม pending scene และพากลับเข้าแชทได้' },
    { area: 'ผู้ดูแลรายงาน', route: '/moderation', status: 'มีสิทธิ์เท่านั้น', detail: 'ต้องมี ADMIN_API_KEY ก่อนเรียก action ผู้ดูแล' },
    { area: 'ตัวตรวจพรอมป์', route: '/admin/prompt-inspector', status: 'มีสิทธิ์เท่านั้น', detail: 'ตรวจพรอมป์และส่วนต่างได้ด้วย ADMIN_API_KEY' },
    { area: 'ชุดวัดผล', route: '/admin/evals', status: 'มีสิทธิ์เท่านั้น', detail: 'รันชุดทดสอบ local แบบผลลัพธ์คาดเดาได้' },
  ]
}

function AnalyticsPanel({
  analytics,
  analyticsNote,
  days,
  isLoading,
  onDaysChange,
  onRefresh,
}: {
  analytics: AdminProcessMiningSummary | null
  analyticsNote: string
  days: number
  isLoading: boolean
  onDaysChange: (days: number) => void
  onRefresh: () => void
}) {
  const maxCount = Math.max(1, ...(analytics?.eventCounts.map((event) => event.count) ?? [1]))
  const funnel = analytics?.funnel

  return (
    <section className="missai-card rounded-2xl p-5" data-testid="admin-process-mining-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-lg font-black text-white">
            <BarChart3 size={18} className="text-[#ac4bff]" />
            วิเคราะห์กระบวนการใช้งาน
          </h2>
          <p className="m-0 mt-1 text-sm font-bold leading-6 text-white/55">
            อ่านจาก AnalyticsEvent และ ContextSnapshot แบบปิดข้อมูลลับ เพื่อดู flow แชทจริง, first reply, report และพรอมป์ที่ระบบสร้าง
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 7, 30].map((option) => (
            <button
              className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                days === option ? 'bg-[#ac4bff] text-white shadow-[0_0_22px_rgba(172,75,255,0.35)]' : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
              }`}
              key={option}
              onClick={() => onDaysChange(option)}
              type="button"
            >
              {option} วัน
            </button>
          ))}
          <button
            className="missai-button-secondary min-h-9 rounded-xl px-3 text-xs"
            disabled={isLoading}
            onClick={onRefresh}
            title={isLoading ? 'กำลังโหลดข้อมูลกระบวนการใช้งาน' : 'รีเฟรชข้อมูลกระบวนการใช้งาน'}
            type="button"
          >
            <RefreshCw size={14} />
            รีเฟรช
          </button>
        </div>
      </div>

      <p className="missai-empty m-0 mt-4 px-3 py-2 text-sm text-white/70">{analyticsNote}</p>

      {analytics ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ['เห็นตัวละคร', analytics.funnel.characterImpressions],
              ['เปิดโปรไฟล์', analytics.funnel.characterDetailViews],
              ['เริ่มแชท', analytics.funnel.chatStarts],
              ['รอบสนทนา', analytics.funnel.chatTurns],
              ['ตอบแรก', analytics.funnel.firstReplies],
              ['รายงาน', analytics.funnel.reports],
            ].map(([label, value]) => (
              <article className="rounded-2xl border border-white/10 bg-[#080a1a]/58 p-4" key={String(label)}>
                <p className="m-0 text-xs font-black text-white/42">{label}</p>
                <p className="font-display m-0 mt-2 text-2xl font-black text-white">{Number(value).toLocaleString()}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-2xl border border-white/10 bg-[#080a1a]/58 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="m-0 text-sm font-black text-white">จำนวนเหตุการณ์</h3>
                <span className="text-xs font-bold text-white/42">อัปเดต {formatDateTime(analytics.generatedAt)}</span>
              </div>
              {analytics.eventCounts.length === 0 ? (
                <p className="missai-empty m-0 mt-3 p-3 text-sm text-white/55">ยังไม่มี event ในช่วงเวลานี้</p>
              ) : (
                <div className="mt-4 grid gap-2">
                  {analytics.eventCounts.map((event) => (
                    <div className="grid grid-cols-[150px_minmax(0,1fr)_64px] items-center gap-3" key={event.eventName}>
                      <span className="truncate text-xs font-black text-white/70">{event.eventName}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-linear-to-r from-[#ac4bff] to-[#34d5ff]" style={{ width: `${Math.max(4, (event.count / maxCount) * 100)}%` }} />
                      </div>
                      <span className="text-right text-xs font-black text-white">{event.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#080a1a]/58 p-4">
              <h3 className="m-0 text-sm font-black text-white">ภาพรวมบริบทที่บันทึก</h3>
              <p className="m-0 mt-1 text-xs font-bold text-white/45">
                ทั้งหมด {analytics.contextSnapshots.count.toLocaleString()} ชุด / แชท {funnel?.uniqueChats.toLocaleString() ?? 0} / ตัวละคร {funnel?.uniqueCharacters.toLocaleString() ?? 0}
              </p>
              <div className="mt-3 grid gap-2">
                {analytics.contextSnapshots.latest.length === 0 ? (
                  <p className="missai-empty m-0 p-3 text-sm text-white/55">ยังไม่มี snapshot จากแชท</p>
                ) : (
                  analytics.contextSnapshots.latest.slice(0, 5).map((snapshot) => (
                    <article className="rounded-xl border border-white/10 bg-black/20 p-3" key={snapshot.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="m-0 truncate text-xs font-black text-white">{snapshot.modelRoute}</p>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-black text-white/55">{snapshot.promptTokensEstimate.toLocaleString()} tokens</span>
                      </div>
                      <p className="m-0 mt-1 text-[11px] font-bold text-white/42">
                        {snapshot.replyProfile} / lore {snapshot.loreCount} / {formatDateTime(snapshot.createdAt)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#080a1a]/58 p-4">
            <h3 className="m-0 text-sm font-black text-white">เหตุการณ์ล่าสุด</h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
              {analytics.recentEvents.length === 0 ? (
                <p className="missai-empty m-0 p-3 text-sm text-white/55">ยังไม่มี event ล่าสุด</p>
              ) : (
                analytics.recentEvents.slice(0, 8).map((event) => (
                  <article className="grid gap-2 border-b border-white/10 p-3 last:border-b-0 sm:grid-cols-[150px_120px_minmax(0,1fr)_160px]" key={event.id}>
                    <p className="m-0 text-xs font-black text-white">{event.eventName}</p>
                    <p className="m-0 text-xs font-bold text-[#d9b3ff]">{event.source}</p>
                    <p className="m-0 truncate text-xs font-bold text-white/52">{event.route || event.entityType || event.chatId || '-'}</p>
                    <p className="m-0 text-xs font-bold text-white/42">{formatDateTime(event.createdAt)}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

export function AdminHealthPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [analytics, setAnalytics] = useState<AdminProcessMiningSummary | null>(null)
  const [adminKeyInput, setAdminKeyInput] = useState(getStoredAdminKey)
  const [analyticsDays, setAnalyticsDays] = useState(7)
  const [isLoadingHealth, setIsLoadingHealth] = useState(false)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [healthNote, setHealthNote] = useState('กำลังโหลดสถานะระบบ...')
  const [analyticsNote, setAnalyticsNote] = useState('ใส่ ADMIN_API_KEY แล้วรีเฟรชเพื่ออ่านข้อมูล process-mining')

  const loadHealth = useCallback(async () => {
    setIsLoadingHealth(true)
    try {
      const data = await fetchHealthStatus()
      setHealthStatus(data)
      setHealthNote('สถานะระบบอัปเดตแล้ว')
    } catch {
      setHealthStatus(null)
      setHealthNote('โหลดสถานะระบบไม่สำเร็จ ตรวจว่า backend local เปิดอยู่ที่พอร์ต 3000')
    } finally {
      setIsLoadingHealth(false)
    }
  }, [])

  const loadAnalytics = useCallback(async () => {
    if (!getStoredAdminKey().trim()) {
      setAnalytics(null)
      setAnalyticsNote('ต้องบันทึก ADMIN_API_KEY ก่อนอ่านข้อมูล process-mining')
      return
    }

    setIsLoadingAnalytics(true)
    try {
      const data = await fetchAdminProcessMining(analyticsDays)
      setAnalytics(data)
      setAnalyticsNote(`โหลดข้อมูล ${data.days} วันล่าสุดแล้ว`)
    } catch (error) {
      setAnalytics(null)
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setAnalyticsNote('ADMIN_API_KEY ไม่ถูกต้องหรือยังไม่ได้บันทึก')
      } else {
        setAnalyticsNote('โหลด process-mining ไม่สำเร็จ ตรวจ backend, DB และ migration AnalyticsEvent/ContextSnapshot')
      }
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [analyticsDays])

  useEffect(() => {
    void loadHealth()
  }, [loadHealth])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const checks = useMemo(() => buildChecks(healthStatus), [healthStatus])
  const blockers = checks.filter((check) => !check.ok)
  const localReady = checks.filter((check) => check.scope === 'local').every((check) => check.ok)
  const productionReady = checks.every((check) => check.ok)
  const chatProvider = healthStatus?.model?.chatProvider
  const chatRuntimeIsLocal = chatProvider?.activeRuntimeProvider === 'local' || chatProvider?.forcedLocal === true

  const phaseSteps = buildDeployPhaseSteps(checks)

  function saveAdminKey() {
    const key = adminKeyInput.trim()
    if (!key) {
      clearAdminApiKey()
      setAdminKeyInput('')
      setAnalytics(null)
      setAnalyticsNote('ล้าง ADMIN_API_KEY แล้ว')
      return
    }

    setAdminApiKey(key)
    setAdminKeyInput(key)
    setAnalyticsNote('บันทึก ADMIN_API_KEY แล้ว กำลังโหลดข้อมูล')
    void loadAnalytics()
  }

  return (
    <main className="missai-shell space-y-5 text-white">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-[#ac4bff] uppercase">
            <Activity size={15} />
            ตรวจระบบ
          </p>
          <h1 className="font-display mt-2 text-3xl font-black">สรุปงานค้างก่อนปล่อยจริง</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-white/58">
            หน้านี้อ่านสถานะจากหลังบ้าน แยกสิ่งที่เล่น local ได้แล้วออกจาก blocker ที่ต้องใช้ credential, domain หรือ provider ภายนอกจริง
          </p>
        </div>
        <button
          className="missai-button-secondary"
          disabled={isLoadingHealth}
          onClick={() => void loadHealth()}
          title={isLoadingHealth ? 'กำลังโหลดสถานะระบบ' : 'รีเฟรชสถานะระบบ'}
          type="button"
        >
          <RefreshCw size={16} />
          รีเฟรช
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">สถานะระบบ</p>
          <p className="font-display mt-2 text-2xl font-black text-white">{healthStatus?.ok ? 'ออนไลน์' : 'ต้องเช็ก'}</p>
          <p className="mt-1 text-xs font-bold text-white/45">{healthNote}</p>
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">เซิร์ฟเวอร์ในเครื่อง</p>
          <p className="font-display mt-2 text-2xl font-black text-[#f9c86d]">{localReady ? 'พร้อมเล่นในเครื่อง' : 'ยังไม่ครบ'}</p>
          {chatRuntimeIsLocal && <p className="mt-1 text-xs font-bold text-emerald-200">แชทในเครื่องพร้อมใช้</p>}
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">งานค้าง</p>
          <p className="font-display mt-2 text-2xl font-black text-white">{blockers.length.toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold text-white/45">{productionReady ? 'ไม่มีด่านค้าง' : 'ยังมีงานก่อนปล่อยจริง'}</p>
        </div>
      </section>

      <section className="missai-card rounded-2xl p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="m-0 flex items-center gap-2 text-lg font-black text-white">
              <KeyRound size={18} className="text-[#ac4bff]" />
              สิทธิ์ผู้ดูแล
            </h2>
            <p className="m-0 mt-1 text-sm font-bold text-white/55">ใช้สำหรับ process-mining, prompt inspector, evals และ moderation action</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:w-[620px]">
            <input
              className="missai-input min-h-11 rounded-xl px-3 text-sm"
              data-testid="admin-health-admin-key-input"
              onChange={(event) => setAdminKeyInput(event.target.value)}
              placeholder="วาง ADMIN_API_KEY"
              type="password"
              value={adminKeyInput}
            />
            <button className="missai-button-secondary min-h-11 rounded-xl bg-white px-4 text-sm text-slate-950 hover:bg-white/90" onClick={saveAdminKey} type="button">
              บันทึก
            </button>
            <button
              className="missai-button-secondary min-h-11 rounded-xl px-4 text-sm"
              onClick={() => {
                clearAdminApiKey()
                setAdminKeyInput('')
                setAnalytics(null)
                setAnalyticsNote('ล้าง ADMIN_API_KEY แล้ว')
              }}
              type="button"
            >
              ล้าง
            </button>
          </div>
        </div>
      </section>

      <AnalyticsPanel
        analytics={analytics}
        analyticsNote={analyticsNote}
        days={analyticsDays}
        isLoading={isLoadingAnalytics}
        onDaysChange={setAnalyticsDays}
        onRefresh={() => void loadAnalytics()}
      />

      <section className="missai-card rounded-2xl p-5">
        <h2 className="m-0 flex items-center gap-2 text-lg font-black text-white">
          <ShieldCheck size={18} className="text-[#ac4bff]" />
          เช็กลิสต์ deploy
        </h2>
        <div className="mt-4 grid gap-3">
          {checks.map((check) => (
            <article className="rounded-2xl border border-white/10 bg-[#080a1a]/58 p-4" key={`${check.scope}-${check.label}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill ok={check.ok} />
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${scopeClass(check.scope)}`}>{scopeLabel(check.scope)}</span>
                  </div>
                  <h3 className="mt-3 text-base font-black text-white">{check.label}</h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-white/55">{check.detail}</p>
                </div>
                <p className="m-0 max-w-md text-xs font-bold leading-5 text-white/42">{check.action}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="missai-card rounded-2xl p-5">
        <h2 className="m-0 flex items-center gap-2 text-lg font-black text-white">
          <Server size={18} className="text-[#ac4bff]" />
          ลำดับงานก่อนปล่อยจริง
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {phaseSteps.map((step) => (
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4" key={step.title}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="m-0 text-sm font-black text-white">{step.title}</h3>
                <StatusPill ok={step.ok} />
              </div>
              <code className="mt-3 block overflow-x-auto rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-[#f9c86d]">{step.command}</code>
              <p className="m-0 mt-3 text-xs font-bold leading-5 text-white/50">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="missai-card rounded-2xl p-5">
          <h2 className="m-0 flex items-center gap-2 text-lg font-black text-white">
            <Router size={18} className="text-[#ac4bff]" />
            ตรวจเส้นทาง/เมนู
          </h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            {routeAuditRows().map((row) => (
              <article className="grid gap-2 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[160px_130px_minmax(0,1fr)]" key={`${row.area}-${row.route}`}>
                <p className="m-0 text-sm font-black text-white">{row.area}</p>
                <p className="m-0 text-xs font-bold text-[#d9b3ff]">{row.route}</p>
                <p className="m-0 text-xs font-bold leading-5 text-white/52">
                  <span className="mr-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-emerald-200">{row.status}</span>
                  {row.detail}
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="missai-card rounded-2xl p-4">
            <h3 className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <Database size={17} className="text-[#ac4bff]" />
              ฐานข้อมูล
            </h3>
            <p className="mt-2 text-xs font-bold leading-5 text-white/52">
              {healthStatus?.checks.databaseConnected ? 'เชื่อมต่อฐานข้อมูลแล้ว' : healthStatus?.databaseError ?? 'ยังไม่ทราบสถานะฐานข้อมูล'}
            </p>
          </section>
          <section className="missai-card rounded-2xl p-4">
            <h3 className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <Image size={17} className="text-[#ac4bff]" />
              รูปและสตอเรจ
            </h3>
            <p className="mt-2 text-xs font-bold leading-5 text-white/52">
              คลังรูป: {storageLabel(healthStatus?.security?.avatarStorage)} / สิทธิ์เข้าถึง: {storageAccessLabel(healthStatus?.security?.avatarStorageAccess)} / รูปภาพ:{' '}
              {providerStatusLabel(healthStatus?.model?.imageGeneration?.status)}
            </p>
          </section>
          <section className="missai-card rounded-2xl p-4" data-testid="admin-health-narrative-engine">
            <h3 className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <BrainCircuit size={17} className="text-[#ac4bff]" />
              Narrative Engine
            </h3>
            <p className="mt-2 text-xs font-bold leading-5 text-white/52">
              {healthStatus?.model?.narrativeEngine?.enabled
                ? `${healthStatus.model.narrativeEngine.workflow} / ${healthStatus.model.narrativeEngine.dimensions.length} มิติคุณภาพ`
                : 'รอสถานะ Narrative Engine จาก backend'}
            </p>
          </section>
          <section className="missai-card rounded-2xl p-4">
            <h3 className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <LockKeyhole size={17} className="text-[#ac4bff]" />
              ความปลอดภัย
            </h3>
            <p className="mt-2 text-xs font-bold leading-5 text-white/52">
              ยืนยันตัวตน: {authModeLabel(healthStatus?.security?.authMode)} / ผู้ดูแล: {healthStatus?.security?.adminGuard ?? 'ไม่ทราบ'}
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}
