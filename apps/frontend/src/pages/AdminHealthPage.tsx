import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, CircleAlert, Database, Image, LockKeyhole, RefreshCw, Router, Server, ShieldCheck } from 'lucide-react'
import { fetchHealthStatus, type HealthStatus } from '../lib/api'
import { API_BASE_URL, frontendEnvWarnings, hasRealEnvValue, isLocalOrPlaceholderUrl, RAW_API_BASE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/env'

type HealthCheckRow = {
  label: string
  ok: boolean
  detail: string
  action: string
  scope: 'local' | 'frontend' | 'production'
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

function scopeLabel(scope: HealthCheckRow['scope']) {
  if (scope === 'local') return 'เครื่องนี้'
  if (scope === 'frontend') return 'หน้าบ้าน'
  return 'ปล่อยจริง'
}

function scopeClass(scope: HealthCheckRow['scope']) {
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

function buildChecks(healthStatus: HealthStatus | null): HealthCheckRow[] {
  const frontendWarnings = frontendEnvWarnings()
  const hasFrontendSupabase = hasRealEnvValue(SUPABASE_URL) && hasRealEnvValue(SUPABASE_ANON_KEY)
  const hasBackendUrl = hasRealEnvValue(RAW_API_BASE_URL) && !isLocalOrPlaceholderUrl(API_BASE_URL)
  const checks = healthStatus?.checks
  const security = healthStatus?.security
  const model = healthStatus?.model
  const chatProvider = model?.chatProvider
  const imageGeneration = model?.imageGeneration
  const structuredKnowledge = healthStatus?.knowledge?.structured
  const chatRuntimeIsLocal = chatProvider?.activeRuntimeProvider === 'local' || chatProvider?.forcedLocal === true
  const chatProductionReady = Boolean(chatProvider?.productionReady ?? chatProvider?.liveVerified)
  const imageProductionReady = Boolean(imageGeneration?.productionReady ?? imageGeneration?.liveVerified)
  const backendEnvMissing = healthStatus?.env?.missingRequired ?? []
  const backendEnvInvalid = healthStatus?.env?.invalid ?? []
  const maxOutputTokens = model?.maxOutputTokens ?? 0
  const minRoleplayReplyChars = model?.minRoleplayReplyChars ?? 0
  const replyBudgetOk = Boolean(model && maxOutputTokens >= 1200 && minRoleplayReplyChars >= 320)

  return [
    {
      label: 'ฐานข้อมูลเชื่อมต่อ',
      ok: Boolean(checks?.databaseConfigured && checks.databaseConnected),
      detail: checks?.databaseConnected ? 'ระบบหลังบ้านต่อฐานข้อมูลได้แล้ว' : 'ตั้ง DATABASE_URL แล้วรัน migration/smoke กับฐานข้อมูลจริง',
      action: checks?.databaseConnected ? 'รัน smoke ซ้ำก่อนเปิดให้คนอื่นลองเล่น' : 'ตั้ง DATABASE_URL แล้วรัน bun run smoke:local',
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
      detail: chatRuntimeIsLocal ? 'โหมดในเครื่องพร้อมเล่นและไม่ต้องใช้เครดิตผู้ให้บริการ' : 'ยังไม่ได้เปิด runtime ในเครื่อง',
      action: chatRuntimeIsLocal ? 'ใช้ qa:local หรือ api:smoke ตรวจ normal/stream ซ้ำได้' : 'ตั้ง LOCAL_CHAT_PROVIDER=1 หรือ CHAT_PROVIDER=local',
      scope: 'local',
    },
    {
      label: 'ทดสอบแชทจริง',
      ok: chatProductionReady,
      detail: chatProductionReady ? 'ยืนยัน live smoke แล้ว' : checks?.openRouterConfigured || chatProvider?.configured ? 'ตั้ง provider แล้ว แต่ยังต้องรัน live smoke' : 'ยังไม่มีคีย์ provider สำหรับแชทจริง',
      action: chatProductionReady ? 'คง flag เฉพาะ env ที่ smoke ผ่านจริง' : `รัน ${chatProvider?.liveSmokeCommand ?? 'bun run smoke:chat'} แล้วค่อยตั้ง flag`,
      scope: 'production',
    },
    {
      label: 'งบคำตอบแชท',
      ok: replyBudgetOk,
      detail: model ? `สูงสุด ${maxOutputTokens} โทเคน / ขั้นต่ำ ${minRoleplayReplyChars} ตัวอักษร` : 'รอสถานะโมเดลจากระบบหลังบ้าน',
      action: replyBudgetOk ? 'ผ่านเกณฑ์ขั้นต่ำแล้ว' : 'ตั้ง MODEL_MAX_OUTPUT_TOKENS>=1200 และ MODEL_MIN_ROLEPLAY_REPLY_CHARS>=320',
      scope: 'local',
    },
    {
      label: 'ผู้ให้บริการสร้างรูป',
      ok: Boolean(checks?.imageGenerationConfigured || imageGeneration?.configured),
      detail: checks?.imageGenerationConfigured || imageGeneration?.configured ? `ตั้งค่า ${imageGeneration?.model ?? 'ผู้ให้บริการ'} แล้ว` : 'ยังใช้ภาพ fallback ของระบบ',
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
    { area: 'แถบแชท', route: '/chat', status: 'พร้อม', detail: 'เมนูสามจุด ปักหมุด จัดเก็บ เลือก และลบมีผลจริงหรือมี confirm' },
    { area: 'สร้างตัวละคร', route: '/create', status: 'พร้อมในเครื่อง', detail: 'สร้างร่าง อัปโหลด ลิงก์รูป ตรวจความพร้อม และเผยแพร่ผ่านระบบหลังบ้าน' },
    { area: 'ผู้สร้างภาพ AI', route: '/ai-creator', status: 'พร้อมในเครื่อง', detail: 'มีสถานะถูกล็อก กำลังโหลด ภาพสำรอง คลังผลงาน แกลเลอรี และนำไปใช้ซ้ำครบ' },
    { area: 'กระเป๋าโทเคน', route: '/wallet', status: 'พร้อม', detail: 'โหลดการใช้งาน ธุรกรรม คีย์ผู้ดูแล และปรับโทเคนแบบมีตัวกันพลาด' },
    { area: 'ผู้ดูแลรายงาน', route: '/moderation', status: 'มีสิทธิ์เท่านั้น', detail: 'ต้องมี ADMIN_API_KEY ก่อนเรียกคำสั่งผู้ดูแล' },
  ]
}

export function AdminHealthPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState('กำลังโหลดสถานะระบบ...')

  const loadHealth = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchHealthStatus()
      setHealthStatus(data)
      setNote('สถานะระบบอัปเดตแล้ว')
    } catch {
      setHealthStatus(null)
      setNote('โหลดสถานะระบบไม่สำเร็จ ตรวจว่า backend local เปิดอยู่ที่พอร์ต 3000')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHealth()
  }, [loadHealth])

  const checks = useMemo(() => buildChecks(healthStatus), [healthStatus])
  const blockers = checks.filter((check) => !check.ok)
  const localReady = checks.filter((check) => check.scope === 'local').every((check) => check.ok)
  const productionReady = checks.every((check) => check.ok)
  const chatProvider = healthStatus?.model?.chatProvider
  const chatRuntimeIsLocal = chatProvider?.activeRuntimeProvider === 'local' || chatProvider?.forcedLocal === true

  const phaseSteps = [
    {
      title: '1. Local server',
      ok: localReady,
      command: 'bun run local:doctor + bun run qa:full',
      detail: localReady ? 'โหมดในเครื่องพร้อมเล่น' : 'ปิด blocker ของเครื่องนี้ก่อนให้คนอื่นลองเล่น',
    },
    {
      title: '2. Ngrok preview / staging',
      ok: blockers.filter((check) => check.scope === 'frontend').length === 0,
      command: 'bun run staging:verify + bun run e2e:smoke',
      detail: 'ใช้เมื่ออยากให้คนอื่นลองผ่าน HTTPS โดยยังยึด local server เป็นฐาน',
    },
    {
      title: '3. Live provider smoke',
      ok: checks.filter((check) => check.label.includes('ทดสอบ')).every((check) => check.ok),
      command: 'bun run api:smoke:live',
      detail: 'ใช้เฉพาะตอนมีผู้ให้บริการจริงและต้องการพิสูจน์ว่าไม่ใช่ภาพหรือคำตอบสำรอง',
    },
    {
      title: '4. Production check',
      ok: productionReady,
      command: 'bun run production:check',
      detail: productionReady ? 'พร้อมตรวจปล่อยจริงรอบสุดท้าย' : 'ยังเหลืองานภายนอกก่อนปล่อยจริง',
    },
  ]

  return (
    <main className="missai-shell space-y-5 text-white">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-[#ac4bff] uppercase">
            <Activity size={15} />
            ตรวจระบบ
          </p>
          <h1 className="font-display mt-2 text-3xl font-black">สรุปด่านค้างก่อนปล่อยจริง</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-white/58">
            หน้านี้อ่านค่าสุขภาพระบบจากหลังบ้าน แล้วแยกชัดเจนว่าอะไรพร้อมสำหรับเครื่องนี้ และอะไรยังเป็นงานภายนอกก่อนปล่อยจริง
          </p>
        </div>
        <button
          className="missai-button-secondary"
          disabled={isLoading}
          onClick={() => void loadHealth()}
          title={isLoading ? 'กำลังโหลดสถานะระบบ' : 'รีเฟรชสถานะระบบ'}
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
          <p className="mt-1 text-xs font-bold text-white/45">{note}</p>
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">Local server</p>
          <p className="font-display mt-2 text-2xl font-black text-[#f9c86d]">
            {localReady ? 'โหมดในเครื่องพร้อมเล่น' : 'ยังไม่ครบ'}
          </p>
          {chatRuntimeIsLocal && <p className="mt-1 text-xs font-bold text-emerald-200">แชทในเครื่องพร้อมใช้</p>}
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">Blockers</p>
          <p className="font-display mt-2 text-2xl font-black text-white">{blockers.length.toLocaleString()}</p>
          <p className="mt-1 text-xs font-bold text-white/45">{productionReady ? 'ไม่มีด่านค้าง' : 'ยังมีงานก่อนปล่อยจริง'}</p>
        </div>
      </section>

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
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${scopeClass(check.scope)}`}>
                      {scopeLabel(check.scope)}
                    </span>
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
              <code className="mt-3 block overflow-x-auto rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-[#f9c86d]">
                {step.command}
              </code>
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
              <article className="grid gap-2 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[160px_120px_minmax(0,1fr)]" key={`${row.area}-${row.route}`}>
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
              storage: {storageLabel(healthStatus?.security?.avatarStorage)} / access: {storageAccessLabel(healthStatus?.security?.avatarStorageAccess)} / image: {providerStatusLabel(healthStatus?.model?.imageGeneration?.status)}
            </p>
          </section>
          <section className="missai-card rounded-2xl p-4">
            <h3 className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <LockKeyhole size={17} className="text-[#ac4bff]" />
              ความปลอดภัย
            </h3>
            <p className="mt-2 text-xs font-bold leading-5 text-white/52">
              auth: {authModeLabel(healthStatus?.security?.authMode)} / admin guard: {healthStatus?.security?.adminGuard ?? 'ไม่ทราบ'}
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}
