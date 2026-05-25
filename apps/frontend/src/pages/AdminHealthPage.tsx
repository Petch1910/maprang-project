import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CheckCircle2, CircleAlert, RefreshCw, ShieldCheck } from 'lucide-react'
import { SystemStatus } from '../components/SystemStatus'
import { fetchHealthStatus, type HealthStatus } from '../lib/api'
import { API_BASE_URL, frontendEnvWarnings, hasRealEnvValue, isLocalOrPlaceholderUrl, RAW_API_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/env'
import { routeMenuAuditRows, routeMenuAuditStatusLabel, type RouteMenuAuditStatus } from '../lib/routeMenuAudit'

type DeployCheck = {
  label: string
  ok: boolean
  detail: string
  action: string
  scope: 'local' | 'production' | 'frontend'
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
        ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
      }`}
    >
      {ok ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
      {ok ? 'พร้อม' : 'ต้องเช็ค'}
    </span>
  )
}

function auditStatusClass(status: RouteMenuAuditStatus) {
  if (status === 'ready') return 'bg-emerald-50 text-emerald-800'
  if (status === 'guarded') return 'bg-sky-50 text-sky-800'
  if (status === 'needs-staging') return 'bg-amber-50 text-amber-900'
  return 'bg-slate-100 text-slate-700'
}

function checkScopeLabel(scope: DeployCheck['scope']) {
  if (scope === 'local') return 'เครื่องนี้'
  if (scope === 'frontend') return 'หน้าบ้าน'
  return 'โปรดักชัน'
}

function checkScopeClass(scope: DeployCheck['scope']) {
  if (scope === 'local') return 'bg-emerald-50 text-emerald-800'
  if (scope === 'frontend') return 'bg-sky-50 text-sky-800'
  return 'bg-amber-50 text-amber-900'
}

function buildDeployChecks(healthStatus: HealthStatus | null): DeployCheck[] {
  const frontendWarnings = frontendEnvWarnings()
  const hasFrontendSupabase = hasRealEnvValue(SUPABASE_URL) && hasRealEnvValue(SUPABASE_ANON_KEY)
  const hasBackendUrl = hasRealEnvValue(RAW_API_BASE_URL) && !isLocalOrPlaceholderUrl(API_BASE_URL)
  const checks = healthStatus?.checks
  const security = healthStatus?.security
  const model = healthStatus?.model
  const chatProvider = model?.chatProvider
  const imageGeneration = model?.imageGeneration
  const structuredKnowledge = healthStatus?.knowledge?.structured
  const providerRetry = model?.providerRetry
  const backendEnvMissing = healthStatus?.env?.missingRequired ?? []
  const backendEnvInvalid = healthStatus?.env?.invalid ?? []
  const maxOutputTokens = model?.maxOutputTokens ?? 0
  const minRoleplayReplyChars = model?.minRoleplayReplyChars ?? 0
  const replyBudgetMeetsBaseline = Boolean(model && maxOutputTokens >= 1200 && minRoleplayReplyChars >= 320)
  const replyBudgetMeetsRecommended = Boolean(model && maxOutputTokens >= 1600 && minRoleplayReplyChars >= 420)
  const isProductionMode = healthStatus?.env?.mode === 'production'
  const chatProductionReady = Boolean(chatProvider?.productionReady ?? chatProvider?.liveVerified)
  const imageProductionReady = Boolean(imageGeneration?.productionReady ?? imageGeneration?.liveVerified)

  return [
    {
      label: 'ฐานข้อมูลเชื่อมต่อ',
      ok: Boolean(checks?.databaseConfigured && checks.databaseConnected),
      detail: checks?.databaseConnected ? 'ระบบหลังบ้านต่อฐานข้อมูลได้แล้ว' : 'ตั้ง DATABASE_URL แล้วรัน migration และ smoke กับ DB จริง',
      action: checks?.databaseConnected ? 'เช็คซ้ำด้วย bun run smoke:local ก่อนส่งสเตจจิง' : 'ตั้ง DATABASE_URL, รัน bunx prisma migrate deploy แล้วรัน bun run smoke:local',
      scope: 'local',
    },
    {
      label: 'ตรวจค่าระบบหลังบ้าน',
      ok: backendEnvMissing.length === 0 && backendEnvInvalid.length === 0,
      detail:
        backendEnvMissing.length === 0 && backendEnvInvalid.length === 0
          ? 'ค่าระบบหลังบ้านไม่มีค่าบังคับที่ขาดหรือค่าผิดรูปแบบ'
          : [...backendEnvMissing.map((name) => `ขาด ${name}`), ...backendEnvInvalid].join(' / '),
      action:
        backendEnvMissing.length === 0 && backendEnvInvalid.length === 0
          ? 'ล็อกค่าชุดนี้ไว้ในตัวจัดการ secret ของโฮสต์'
          : 'แก้ secret ของโฮสต์หลังบ้าน แล้วรัน bun run deploy:doctor และ bun run production:check ซ้ำ',
      scope: 'production',
    },
    {
      label: 'คลังความรู้',
      ok: Boolean(structuredKnowledge?.ok),
      detail: structuredKnowledge?.ok
        ? `คลังความรู้พร้อมใช้งาน (${structuredKnowledge.fileCount} ไฟล์)`
        : structuredKnowledge
          ? [...structuredKnowledge.missing.map((name) => `ขาด ${name}`), ...structuredKnowledge.errors].join(' / ')
          : 'รอคำตอบสถานะจากระบบหลังบ้าน',
      action: structuredKnowledge?.ok ? 'รัน bun run knowledge:audit ใน CI ต่อเนื่อง' : 'แก้ไฟล์ knowledge/structured แล้วรัน bun run knowledge:audit',
      scope: isProductionMode ? 'production' : 'local',
    },
    {
      label: 'คีย์ OpenRouter',
      ok: Boolean(checks?.openRouterConfigured),
      detail: checks?.openRouterConfigured
        ? 'ตั้งคีย์แล้ว แต่ยังต้องให้ smoke:chat หรือ api:smoke:live ผ่านเพื่อยืนยันโควตา รุ่นโมเดล และเครือข่ายจริง'
        : 'ตั้ง OPENROUTER_API_KEY ก่อนทดสอบแชทจริง',
      action: checks?.openRouterConfigured ? 'รัน bun run smoke:chat กับสเตจจิงเพื่อยืนยันผู้ให้บริการจริง' : 'ตั้ง OPENROUTER_API_KEY ที่ขึ้นต้น sk-or- ใน secret ของโฮสต์หลังบ้าน',
      scope: 'local',
    },
    {
      label: 'ทดสอบแชทจริง',
      ok: chatProductionReady,
      detail: chatProductionReady
        ? 'ยืนยันการทดสอบแชทจริงแล้ว'
        : checks?.openRouterConfigured || chatProvider?.configured
          ? `รัน ${chatProvider?.liveSmokeCommand ?? 'bun run smoke:chat'} หรือ bun run api:smoke:live กับสเตจจิงหรือโปรดักชันให้ผ่าน ถ้าได้รหัสผู้ให้บริการล้มเหลว ต้องเช็คโควตา OpenRouter, สิทธิ์โมเดล, คีย์ และเครือข่าย`
          : 'ยังไม่มี OPENROUTER_API_KEY จึงยังทดสอบแชทจริงไม่ได้',
      action: chatProductionReady
        ? 'คง CHAT_PROVIDER_LIVE_VERIFIED=1 ไว้เฉพาะสภาพแวดล้อมที่ smoke ผ่านจริง'
        : `รัน ${chatProvider?.liveSmokeCommand ?? 'bun run smoke:chat'} กับสเตจจิง ถ้าผ่านแล้วค่อยตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1`,
      scope: 'production',
    },
    {
      label: 'งบคำตอบแชท',
      ok: replyBudgetMeetsBaseline,
      detail: model
        ? `ใช้ ${model.name}, คำตอบสูงสุด ${model.maxOutputTokens ?? 'ค่าเริ่มต้น'} โทเคน, บทบาทสมมุติขั้นต่ำ ${model.minRoleplayReplyChars ?? 'ค่าเริ่มต้น'} ตัวอักษร, ความสุ่ม ${model.temperature ?? 'ค่าเริ่มต้น'}, ลองซ้ำแชท ${providerRetry?.chatAttempts ?? 'ค่าเริ่มต้น'} ครั้ง`
        : 'รอคำตอบสถานะจากระบบหลังบ้าน',
      action: !model
        ? 'รอสถานะระบบหลังบ้าน แล้วเช็คค่า MODEL_MAX_OUTPUT_TOKENS และ MODEL_MIN_ROLEPLAY_REPLY_CHARS'
        : !replyBudgetMeetsBaseline
          ? 'ตั้งอย่างน้อย MODEL_MAX_OUTPUT_TOKENS=1200 และ MODEL_MIN_ROLEPLAY_REPLY_CHARS=320 ก่อนส่งสเตจจิง'
          : replyBudgetMeetsRecommended
            ? 'ค่าความยาวตอบกลับอยู่ระดับแนะนำสำหรับบทบาทสมมุติแล้ว'
            : 'ผ่านเกณฑ์ขั้นต่ำแล้ว แต่แนะนำปรับเป็น MODEL_MAX_OUTPUT_TOKENS=1600 และ MODEL_MIN_ROLEPLAY_REPLY_CHARS=420 เพื่อให้บอทตอบมีเนื้อขึ้น',
      scope: 'local',
    },
    {
      label: 'ผู้ให้บริการรูปภาพ',
      ok: Boolean(checks?.imageGenerationConfigured || imageGeneration?.configured),
      detail:
        checks?.imageGenerationConfigured || imageGeneration?.configured
          ? `ตั้งค่า ${imageGeneration?.model ?? 'ผู้ให้บริการ'} แล้ว สถานะ ${imageGeneration?.status ?? 'needs_live_smoke'} ต้องผ่านการทดสอบจริงเพื่อยืนยันวงเงิน/โควตาก่อนใช้งานจริง`
          : 'ยังใช้ภาพตัวอย่างสำรอง ต้องตั้ง IMAGE_GENERATION_API_KEY ก่อนใช้งานจริง',
      action:
        checks?.imageGenerationConfigured || imageGeneration?.configured
          ? 'รัน bun run smoke:image:live เพื่อยืนยันว่าผู้ให้บริการสร้างภาพจริง'
          : 'ตั้ง IMAGE_GENERATION_API_KEY หรือ OPENAI_API_KEY ใน secret ของโฮสต์หลังบ้าน',
      scope: 'local',
    },
    {
      label: 'ทดสอบสร้างรูปจริง',
      ok: imageProductionReady,
      detail:
        imageProductionReady
          ? 'ยืนยันการทดสอบสร้างรูปจริงแล้ว'
          : isProductionMode
            ? `รัน ${imageGeneration?.liveSmokeCommand ?? 'bun run smoke:image:live'} หรือ bun run api:smoke:live กับสเตจจิงหรือโปรดักชันให้ผ่าน ถ้าเจอปัญหาวงเงินหรือโควตา ต้องเพิ่มวงเงินผู้ให้บริการก่อน แล้วค่อยตั้ง IMAGE_GENERATION_LIVE_VERIFIED=1`
            : `สภาพแวดล้อมเครื่องยังไม่บังคับ แต่ก่อนโปรดักชันต้องรัน ${imageGeneration?.liveSmokeCommand ?? 'bun run smoke:image:live'} ให้ผ่าน ถ้าเจอปัญหาวงเงินหรือโควตา ต้องเพิ่มวงเงินผู้ให้บริการก่อน`,
      action: imageProductionReady
        ? 'คง IMAGE_GENERATION_LIVE_VERIFIED=1 ไว้เฉพาะสภาพแวดล้อมที่ smoke ผ่านจริง'
        : `รัน ${imageGeneration?.liveSmokeCommand ?? 'bun run smoke:image:live'} หลังเพิ่มวงเงินหรือโควตา แล้วค่อยตั้ง IMAGE_GENERATION_LIVE_VERIFIED=1`,
      scope: 'production',
    },
    {
      label: 'ยืนยันตัวตน Supabase',
      ok: Boolean(checks?.supabaseAuthConfigured && hasFrontendSupabase),
      detail: checks?.supabaseAuthConfigured && hasFrontendSupabase ? 'ระบบหลังบ้านและหน้าบ้านมีค่าการยืนยันตัวตน Supabase แล้ว' : 'ต้องมี SUPABASE_URL/JWT issuer และ VITE_SUPABASE_*',
      action:
        checks?.supabaseAuthConfigured && hasFrontendSupabase
          ? 'ทดสอบล็อกอิน/เซสชันกับโดเมนสเตจจิงอีกครั้ง'
          : 'ตั้ง SUPABASE_URL, SUPABASE_JWT_ISSUER, VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ให้ครบ',
      scope: 'local',
    },
    {
      label: 'คลังรูป signed URL',
      ok: security?.avatarStorage === 'supabase' && security.avatarStorageAccess === 'signed',
      detail:
        security?.avatarStorage === 'supabase' && security.avatarStorageAccess === 'signed'
          ? `bucket ใช้ signed URL ${security.signedUrlExpiresIn ?? 3600}s`
          : 'ก่อนใช้งานจริงควรใช้ Supabase bucket private + signed URL',
      action:
        security?.avatarStorage === 'supabase' && security.avatarStorageAccess === 'signed'
          ? 'รัน bun run supabase:storage:check กับสเตจจิงหรือโปรดักชันก่อนเปิดใช้'
          : 'รัน bun run supabase:storage:setup แล้วตั้ง SUPABASE_STORAGE_ACCESS=signed',
      scope: 'production',
    },
    {
      label: 'CORS ใช้งานจริง',
      ok: Boolean(security?.corsOrigins.length && security.corsOrigins.every((origin) => !isLocalOrPlaceholderUrl(origin))),
      detail:
        security?.corsOrigins.length && security.corsOrigins.every((origin) => !isLocalOrPlaceholderUrl(origin))
          ? security.corsOrigins.join(', ')
          : 'สเตจจิง/โปรดักชันต้องเปลี่ยน CORS_ORIGINS เป็นโดเมนจริง',
      action:
        security?.corsOrigins.length && security.corsOrigins.every((origin) => !isLocalOrPlaceholderUrl(origin))
          ? 'คง CORS ให้เหลือเฉพาะโดเมนหน้าบ้านจริง'
          : 'ตั้ง CORS_ORIGINS=https://<frontend-domain> และเอา localhost/loopback ออกจากโปรดักชัน',
      scope: 'production',
    },
    {
      label: 'URL หลังบ้านของหน้าเว็บ',
      ok: hasBackendUrl,
      detail: hasBackendUrl ? API_BASE_URL : 'ตั้ง VITE_API_BASE_URL เป็น URL ระบบหลังบ้านสเตจจิง/โปรดักชันจริง',
      action: hasBackendUrl ? 'เช็คด้วย smoke ผ่านเบราว์เซอร์ว่าหน้าบ้านเรียกโดเมนระบบหลังบ้านจริง' : 'ตั้ง VITE_API_BASE_URL=https://<backend-domain> ใน env ของโฮสต์หน้าบ้าน',
      scope: 'frontend',
    },
    {
      label: 'คำเตือน env หน้าบ้าน',
      ok: frontendWarnings.length === 0,
      detail: frontendWarnings.length === 0 ? 'ไม่มีคำเตือนฝั่งหน้าบ้าน' : frontendWarnings.join(' / '),
      action:
        frontendWarnings.length === 0
          ? 'ล็อก env หน้าบ้านชุดนี้ไว้ก่อน build โปรดักชัน'
          : 'แก้ VITE_API_BASE_URL, VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ตามคำเตือน',
      scope: 'frontend',
    },
  ]
}

const postureLabels: Array<{
  key: keyof NonNullable<HealthStatus['securityPosture']>
  label: string
  group: 'CIA' | 'AAA'
}> = [
  { key: 'confidentiality', label: 'ความลับข้อมูล', group: 'CIA' },
  { key: 'integrity', label: 'ความถูกต้องของข้อมูล', group: 'CIA' },
  { key: 'availability', label: 'ความพร้อมใช้งาน', group: 'CIA' },
  { key: 'authentication', label: 'การยืนยันตัวตน', group: 'AAA' },
  { key: 'authorization', label: 'สิทธิ์การเข้าถึง', group: 'AAA' },
  { key: 'accounting', label: 'บันทึกและตรวจสอบย้อนหลัง', group: 'AAA' },
]

export function AdminHealthPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState('กำลังโหลดสถานะระบบ...')

  const loadHealth = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchHealthStatus()
      setHealthStatus(data)
      setNote(data.ok ? 'โหลดสถานะระบบแล้ว' : 'ระบบหลังบ้านยังไม่พร้อมเต็ม ต้องดูเช็กลิสต์ด้านล่าง')
    } catch {
      setHealthStatus(null)
      setNote('ติดต่อสถานะระบบหลังบ้านไม่ได้ ตรวจว่าระบบหลังบ้านเปิดอยู่และ VITE_API_BASE_URL ถูกต้อง')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHealth()
  }, [loadHealth])

  const deployChecks = useMemo(() => buildDeployChecks(healthStatus), [healthStatus])
  const readyCount = deployChecks.filter((check) => check.ok).length
  const localChecks = deployChecks.filter((check) => check.scope === 'local')
  const productionChecks = deployChecks.filter((check) => check.scope === 'production' || check.scope === 'frontend')
  const localReadyCount = localChecks.filter((check) => check.ok).length
  const productionReadyCount = productionChecks.filter((check) => check.ok).length
  const productionBlockers = productionChecks.filter((check) => !check.ok)
  const productionReady = productionBlockers.length === 0
  const auditReadyCount = routeMenuAuditRows.filter((row) => row.status === 'ready' || row.status === 'guarded').length
  const postureRows = postureLabels.map((item) => ({
    ...item,
    ok: healthStatus?.securityPosture?.[item.key]?.ok ?? false,
    detail: healthStatus?.securityPosture?.[item.key]?.detail ?? 'รอคำตอบสถานะจากระบบหลังบ้าน',
  }))
  const postureReadyCount = postureRows.filter((row) => row.ok).length
  const refreshDisabledReason = isLoading ? 'กำลังโหลดสถานะระบบ' : ''

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
              <ShieldCheck size={16} />
              ตรวจระบบผู้ดูแล
            </p>
            <h1 className="m-0 mt-2 text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">
              ตรวจความพร้อมก่อนสเตจจิง/โปรดักชัน
            </h1>
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              หน้านี้รวมสถานะระบบหลังบ้าน ค่าแวดล้อม Supabase พื้นที่เก็บรูปแบบ signed URL ผู้ให้บริการสร้างรูป และการตรวจเส้นทาง/เมนู
              เพื่อกันปุ่มหลอกหรือ config พลาดก่อน deploy จริง
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-auto">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              aria-disabled={isLoading}
              data-testid="admin-health-refresh"
              disabled={isLoading}
              onClick={() => void loadHealth()}
              title={refreshDisabledReason || 'รีเฟรชสถานะระบบ'}
              type="button"
            >
              <RefreshCw size={16} />
              รีเฟรช
            </button>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              to="/admin/prompt-inspector"
            >
              ตรวจพรอมป์
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              to="/admin/evals"
            >
              ทดสอบคุณภาพ
            </Link>
          </div>
        </div>
        {note && <p className="m-0 mt-4 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{note}</p>}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-emerald-950">
          <p className="m-0 text-xs font-black tracking-widest uppercase">ความพร้อมเครื่องนี้</p>
          <p className="m-0 mt-2 text-2xl font-black">
            {localReadyCount}/{localChecks.length}
          </p>
          <p className="m-0 mt-1 text-sm font-bold leading-6">
            {localReadyCount === localChecks.length ? 'ระบบในเครื่องพร้อมทดสอบ flow หลักแล้ว' : 'ยังมีค่าพื้นฐานในเครื่องที่ต้องแก้ก่อน QA'}
          </p>
        </article>
        <article className="rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-amber-950">
          <p className="m-0 text-xs font-black tracking-widest uppercase">ด่านก่อนโปรดักชัน</p>
          <p className="m-0 mt-2 text-2xl font-black">
            {productionReadyCount}/{productionChecks.length}
          </p>
          <p className="m-0 mt-1 text-sm font-bold leading-6">
            {productionBlockers.length === 0
              ? 'ค่าฝั่ง deploy พร้อมแล้ว เหลือ smoke กับสภาพแวดล้อมจริง'
              : `ยังค้าง ${productionBlockers.map((check) => check.label).join(', ')}`}
          </p>
        </article>
        <article className="rounded-2xl border border-sky-500/20 bg-sky-50 p-4 text-sky-950">
          <p className="m-0 text-xs font-black tracking-widest uppercase">ด่าน QA</p>
          <p className="m-0 mt-2 text-2xl font-black">qa:full</p>
          <p className="m-0 mt-1 text-sm font-bold leading-6">
            ใช้เช็คระบบหลังบ้าน หน้าบ้าน smoke เส้นทาง console error และจอล้นบนมือถือก่อนส่งสเตจจิง
          </p>
        </article>
      </section>

      <section
        className={`rounded-2xl border p-4 shadow-sm ${
          productionReady ? 'border-emerald-500/20 bg-emerald-50 text-emerald-950' : 'border-amber-500/25 bg-amber-50 text-amber-950'
        }`}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="m-0 text-sm font-black">สรุปด่านค้างก่อนโปรดักชัน</p>
            <p className="m-0 mt-1 text-sm font-bold leading-6">
              {productionReady
                ? 'พร้อมสำหรับด่านสุดท้ายแล้ว ให้รัน smoke โปรดักชันกับโดเมนระบบหลังบ้าน/หน้าบ้านจริงอีกครั้ง'
                : `ยังค้าง ${productionBlockers.length} ข้อก่อน deploy จริง แก้ตามรายการนี้ก่อนค่อยรันด่านโปรดักชันซ้ำ`}
            </p>
          </div>
          <code className="inline-flex min-h-9 items-center rounded-xl bg-white/75 px-3 text-xs font-black text-slate-800 shadow-sm">
            bun run production:check
          </code>
        </div>

        {!productionReady && (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {productionBlockers.map((check) => (
              <article className="rounded-xl border border-amber-900/10 bg-white/70 p-3" key={check.label}>
                <div className="flex items-start justify-between gap-3">
                  <p className="m-0 text-sm font-black text-amber-950">{check.label}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${checkScopeClass(check.scope)}`}>
                    {checkScopeLabel(check.scope)}
                  </span>
                </div>
                <p className="m-0 mt-2 text-xs font-bold leading-5 text-amber-900/80">{check.detail}</p>
                <p className="m-0 mt-2 rounded-lg bg-white/70 p-2 text-xs font-black leading-5 text-amber-950">
                  ขั้นต่อไป: {check.action}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
              <ShieldCheck size={17} />
              สถานะความปลอดภัย CIA / AAA
            </p>
            <p className="m-0 mt-1 text-xs font-bold text-slate-400">
              พร้อมแล้ว {postureReadyCount}/{postureRows.length} หมวด
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            ความลับ / ความถูกต้อง / ความพร้อมใช้งาน + ยืนยันตัวตน / สิทธิ์ / Audit
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {postureRows.map((row) => (
            <article className="rounded-xl border border-slate-900/10 bg-slate-50 p-3" key={row.key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-500">{row.group}</span>
                  <p className="m-0 mt-2 text-sm font-black text-slate-950">{row.label}</p>
                </div>
                <StatusPill ok={row.ok} />
              </div>
              <p className="m-0 mt-2 text-xs font-bold leading-5 text-slate-500">{row.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SystemStatus healthStatus={healthStatus} isLoading={isLoading} onRefresh={loadHealth} />

        <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
                <Activity size={17} />
                เช็กลิสต์ deploy
              </p>
              <p className="m-0 mt-1 text-xs font-bold text-slate-400">
                พร้อมแล้ว {readyCount}/{deployChecks.length} ข้อ
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              API: {API_BASE_URL}
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {deployChecks.map((check) => (
              <article className="rounded-xl border border-slate-900/10 bg-slate-50 p-3" key={check.label}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-black text-slate-950">{check.label}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ${checkScopeClass(check.scope)}`}>
                      {checkScopeLabel(check.scope)}
                    </span>
                  </div>
                  <StatusPill ok={check.ok} />
                </div>
                <p className="m-0 mt-2 text-xs font-bold leading-5 text-slate-500">{check.detail}</p>
                <p className="m-0 mt-2 rounded-lg bg-white p-2 text-xs font-black leading-5 text-slate-700">
                  ขั้นต่อไป: {check.action}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-900/10 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-900/10 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-sm font-black text-slate-950">ตรวจเส้นทาง/เมนู</p>
            <p className="m-0 mt-1 text-xs font-bold text-slate-400">
              ปุ่มและเมนูหลักพร้อมใช้งานแล้ว {auditReadyCount}/{routeMenuAuditRows.length} รายการ ที่เหลือเป็นด่านสเตจจิงหรือฟีเจอร์เผื่ออนาคต
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-900/10 bg-white px-3 text-xs font-black text-slate-700">
            STAGING_RUNBOOK.md
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="px-4 py-3">พื้นที่</th>
                <th className="px-4 py-3">เส้นทาง</th>
                <th className="px-4 py-3">ปุ่ม/เมนู</th>
                <th className="px-4 py-3">ผลลัพธ์จริง</th>
                <th className="px-4 py-3">เงื่อนไขปิดปุ่ม</th>
                <th className="px-4 py-3">สถานะว่าง</th>
                <th className="px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/10">
              {routeMenuAuditRows.map((row) => (
                <tr className="align-top" key={`${row.area}-${row.route}`}>
                  <td className="px-4 py-3 font-black text-slate-950">{row.area}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{row.route}</td>
                  <td className="px-4 py-3 font-bold leading-6 text-slate-700">{row.control}</td>
                  <td className="px-4 py-3 leading-6 text-slate-600">{row.result}</td>
                  <td className="px-4 py-3 leading-6 text-slate-600">{row.disabledReason}</td>
                  <td className="px-4 py-3 leading-6 text-slate-600">{row.emptyState}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${auditStatusClass(row.status)}`}>
                      {routeMenuAuditStatusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="m-0 font-black">ด่านสเตจจิงก่อนโปรดักชัน</p>
        <p className="m-0 mt-1">
          ใช้ Supabase project จริงสำหรับสเตจจิง, bucket avatars แบบ private + signed URL, ระบบหลังบ้านบน Render/Railway,
          โดเมนหน้าบ้านทดลอง, CORS โดเมนจริง แล้วรัน `bun run qa:full` และ `bun run production:check` กับ URL สเตจจิง
          ก่อนปล่อยโปรดักชัน
        </p>
      </section>
    </div>
  )
}
