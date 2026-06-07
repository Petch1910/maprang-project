import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  FlaskConical,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import {
  ApiError,
  clearAdminApiKey,
  fetchAdminLocalEvals,
  logUnexpectedError,
  setAdminApiKey,
  type EvalScenarioResult,
  type LocalEvalRun,
} from '../lib/api'
import { safeGetStorageItem } from '../lib/safeStorage'

function getStoredAdminKey() {
  if (typeof window === 'undefined') return ''
  return safeGetStorageItem(window.localStorage, 'maprang:adminKey') || ''
}

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return 'ต้องบันทึก ADMIN_API_KEY ก่อนรันชุดทดสอบ'
  }
  if (error instanceof ApiError && error.status >= 500) return 'หลังบ้านรันชุดทดสอบไม่สำเร็จ ตรวจไฟล์ evals/golden-roleplay.json'
  return 'โหลดผลชุดทดสอบไม่สำเร็จ ลองรีเฟรชหรือเช็คหลังบ้าน'
}

function statusClass(passed: boolean) {
  return passed
    ? 'border border-emerald-300/25 bg-emerald-400/12 text-emerald-100'
    : 'border border-rose-300/25 bg-rose-400/12 text-rose-100'
}

function StatCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'amber' | 'emerald' | 'rose' | 'sky' }) {
  const toneClass = {
    amber: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
    emerald: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    rose: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
    sky: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
    slate: 'border-white/10 bg-[#18181d]/90 text-white',
  }[tone]

  return (
    <article className={`rounded-lg border p-4 shadow-[0_18px_58px_rgba(0,0,0,0.18)] ${toneClass}`}>
      <p className="m-0 text-xs font-black tracking-widest uppercase opacity-70">{label}</p>
      <p className="m-0 mt-2 text-2xl font-black tracking-normal">{value}</p>
    </article>
  )
}

function ScenarioCard({ result }: { result: EvalScenarioResult }) {
  const failedChecks = result.checks.filter((check) => check.status === 'fail')

  return (
    <details
      className="rounded-lg border border-white/10 bg-[#18181d]/90 p-4 text-white shadow-[0_18px_58px_rgba(0,0,0,0.18)]"
      data-testid="admin-evals-scenario"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${statusClass(result.passed)}`}>
                {result.passed ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
                {result.passed ? 'ผ่าน' : 'ไม่ผ่าน'}
              </span>
              <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1 text-xs font-black text-white/65">
                {result.estimatedTokens.toLocaleString()} โทเคน
              </span>
            </div>
            <p className="m-0 mt-3 text-base font-black text-white">{result.title}</p>
            <p className="m-0 mt-1 font-mono text-xs font-bold text-white/42">{result.id}</p>
          </div>
          <p className="m-0 text-sm font-bold text-white/52">
            ผ่าน {result.checks.length - failedChecks.length}/{result.checks.length} เช็ก
          </p>
        </div>
      </summary>

      {result.failures.length > 0 && (
        <section className="mt-4 rounded-lg border border-rose-300/25 bg-rose-400/10 p-3 text-rose-100">
          <p className="m-0 flex items-center gap-2 text-sm font-black">
            <AlertTriangle size={16} />
            จุดที่ไม่ผ่าน
          </p>
          <ul className="m-0 mt-2 grid gap-1 pl-5 text-sm font-bold leading-6">
            {result.failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 grid gap-2">
        {result.checks.map((check) => (
          <article className="rounded-lg border border-white/10 bg-white/5 p-3" key={`${result.id}-${check.label}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="m-0 text-sm font-black text-white">{check.label}</p>
                <p className="m-0 mt-1 text-xs font-bold leading-5 text-white/52">{check.detail}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${statusClass(check.status === 'pass')}`}>
                {check.status === 'pass' ? 'ผ่าน' : 'ไม่ผ่าน'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </details>
  )
}

export function AdminEvalsPage() {
  const [adminKeyInput, setAdminKeyInput] = useState(getStoredAdminKey)
  const [run, setRun] = useState<LocalEvalRun | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [note, setNote] = useState('บันทึก ADMIN_API_KEY แล้วกดรันชุดทดสอบเพื่อตรวจคุณภาพพรอมป์และบริบท')

  const hasAdminKey = adminKeyInput.trim().length > 0
  const runDisabledReason = isLoading ? 'กำลังรันชุดทดสอบ' : !hasAdminKey ? 'บันทึก ADMIN_API_KEY ก่อนรันชุดทดสอบ' : ''
  const failedScenarios = useMemo(() => run?.results.filter((result) => !result.passed) ?? [], [run])

  const loadEvals = useCallback(async () => {
    if (!hasAdminKey) {
      setNote('ต้องบันทึก ADMIN_API_KEY ก่อนรันชุดทดสอบ')
      return
    }

    setIsLoading(true)
    try {
      const data = await fetchAdminLocalEvals()
      setRun(data)
      setNote(data.passed ? `ชุดทดสอบผ่าน ${data.passCount}/${data.scenarioCount} เคส` : `ชุดทดสอบไม่ผ่าน ${data.failCount} เคส`)
    } catch (error) {
      logUnexpectedError('โหลดชุดทดสอบผู้ดูแลไม่สำเร็จ:', error)
      setRun(null)
      setNote(apiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [hasAdminKey])

  useEffect(() => {
    if (hasAdminKey) void loadEvals()
  }, [hasAdminKey, loadEvals])

  function saveAdminKey() {
    const key = adminKeyInput.trim()
    if (!key) {
      clearAdminApiKey()
      setAdminKeyInput('')
      setRun(null)
      setNote('ล้าง ADMIN_API_KEY แล้ว')
      return
    }
    setAdminApiKey(key)
    setAdminKeyInput(key)
    setNote('บันทึก ADMIN_API_KEY แล้ว')
  }

  function clearKey() {
    clearAdminApiKey()
    setAdminKeyInput('')
    setRun(null)
    setNote('ล้าง ADMIN_API_KEY แล้ว')
  }

  return (
    <div className="space-y-5 p-4 text-white sm:p-6 lg:p-8">
      <section className="rounded-lg border border-white/10 bg-[#18181d]/92 p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-white/42 uppercase">
              <FlaskConical size={16} />
              ชุดทดสอบอัตโนมัติ
            </p>
            <h1 className="m-0 mt-2 text-2xl font-black tracking-normal text-white sm:text-3xl">ทดสอบคุณภาพพรอมป์และบริบท</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm font-bold leading-6 text-white/58">
              รันชุด golden roleplay แบบคงผลลัพธ์ เพื่อตรวจว่ากฎคุมพรอมป์ คลังความรู้ ความสัมพันธ์ ฉาก และงบโทเคน
              ยังอยู่ในกรอบเดิมก่อนแก้ระบบต่อหรือปล่อย staging
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:w-[560px]">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-black text-white/48">ADMIN_API_KEY</span>
              <input
                className="min-h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-amber-400/70"
                data-testid="admin-evals-admin-key-input"
                onChange={(event) => setAdminKeyInput(event.target.value)}
                placeholder="วางคีย์ผู้ดูแล"
                type="password"
                value={adminKeyInput}
              />
            </label>
            <button
              className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-white/90"
              data-testid="admin-evals-admin-key-save"
              onClick={saveAdminKey}
              type="button"
            >
              <KeyRound size={16} />
              บันทึก
            </button>
            <button
              className="mt-auto min-h-11 rounded-lg border border-white/10 bg-white/6 px-4 text-sm font-black text-white/76 transition hover:bg-white/10 hover:text-white"
              onClick={clearKey}
              type="button"
            >
              ล้าง
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-sm font-bold text-white/70" data-testid="admin-evals-note">
            {note}
          </p>
          <button
            aria-disabled={Boolean(runDisabledReason)}
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-black text-white transition hover:bg-orange-400 disabled:opacity-60"
            data-testid="admin-evals-run"
            disabled={Boolean(runDisabledReason)}
            onClick={() => void loadEvals()}
            title={runDisabledReason || 'รันชุดทดสอบคุณภาพพรอมป์และบริบท'}
            type="button"
          >
            {isLoading ? <Loader2 className="animate-spin" size={17} /> : <RefreshCw size={17} />}
            รันชุดทดสอบ
          </button>
        </div>
      </section>

      {run ? (
        <div className="space-y-5" data-testid="admin-evals-output">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="สถานะ" value={run.passed ? 'ผ่าน' : 'ไม่ผ่าน'} tone={run.passed ? 'emerald' : 'rose'} />
            <StatCard label="ชุดทดสอบ" value={`${run.passCount}/${run.scenarioCount}`} tone="sky" />
            <StatCard label="โทเคนรวม" value={run.totalEstimatedTokens.toLocaleString()} tone="amber" />
            <StatCard label="ชุดที่ใช้สูงสุด" value={run.maxEstimatedTokens.toLocaleString()} />
            <StatCard label="ไม่ผ่าน" value={run.failCount.toLocaleString()} tone={run.failCount > 0 ? 'rose' : 'emerald'} />
          </section>

          <section
            className={`rounded-lg border p-4 shadow-[0_18px_58px_rgba(0,0,0,0.18)] ${
              run.passed ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : 'border-rose-300/25 bg-rose-400/10 text-rose-100'
            }`}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="m-0 flex items-center gap-2 text-sm font-black">
                  <ShieldCheck size={17} />
                  {run.suite.name}
                </p>
                <p className="m-0 mt-1 text-sm font-bold leading-6">
                  {run.suite.description || 'ชุดตรวจ regression ของพรอมป์และบริบทแบบคงผลลัพธ์'}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/22 px-3 py-1 text-xs font-black">
                updated {run.suite.updatedAt || '-'} · run {new Date(run.generatedAt).toLocaleString('th-TH')}
              </span>
            </div>
            {failedScenarios.length > 0 && (
              <p className="m-0 mt-3 rounded-lg border border-white/10 bg-white/7 p-3 text-sm font-bold">
                ต้องแก้ {failedScenarios.map((scenario) => scenario.id).join(', ')} ก่อนรวมงานหรือปล่อยขึ้นระบบ
              </p>
            )}
          </section>

          <section className="space-y-3">
            {run.results.map((result) => (
              <ScenarioCard key={result.id} result={result} />
            ))}
          </section>
        </div>
      ) : (
        <section className="grid min-h-[24rem] place-items-center rounded-lg border border-dashed border-white/15 bg-[#18181d]/90 p-8 text-center shadow-[0_18px_58px_rgba(0,0,0,0.18)]">
          <div className="max-w-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-lg border border-white/10 bg-white/7 text-white">
              <FlaskConical size={22} />
            </span>
            <h2 className="m-0 mt-4 text-xl font-black text-white">ยังไม่ได้รันชุดทดสอบ</h2>
            <p className="m-0 mt-2 text-sm font-bold leading-6 text-white/55">
              เมื่อรันแล้วจะเห็นผลแต่ละสถานการณ์ทดสอบ งบโทเคน จุดตรวจที่ผ่าน/ไม่ผ่าน และข้อผิดพลาดที่ต้องแก้
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
