import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Filter, KeyRound, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import {
  applyAdminReportAction,
  ApiError,
  clearAdminApiKey,
  fetchAdminAuditLogs,
  fetchAdminReports,
  logUnexpectedError,
  setAdminApiKey,
  updateAdminReportStatus,
  type AdminAuditLog,
  type ReportAdminAction,
  type ReportStatus,
  type ReportSummary,
  type ReportTargetType,
} from '../lib/api'
import { canShowQaSeedData, isQaSeedCharacterId, isQaSeedChatId } from '../lib/qaSeedVisibility'
import { safeErrorTextForClassification } from '../lib/safeError'
import { safeGetStorageItem } from '../lib/safeStorage'

const statuses: Array<ReportStatus | ''> = ['', 'PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED']
const targetTypes: Array<ReportTargetType | ''> = ['', 'CHARACTER', 'MESSAGE', 'GENERATION_OUTPUT']

function formatDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusStyle(status: ReportStatus) {
  const styles: Record<ReportStatus, string> = {
    PENDING: 'border-amber-300/25 bg-amber-400/12 text-amber-100',
    REVIEWED: 'border-sky-300/25 bg-sky-400/12 text-sky-100',
    RESOLVED: 'border-emerald-300/25 bg-emerald-400/12 text-emerald-100',
    REJECTED: 'border-white/10 bg-white/7 text-white/65',
  }
  return styles[status]
}

function statusLabel(status: ReportStatus | '') {
  const labels: Record<ReportStatus, string> = {
    PENDING: 'รอตรวจ',
    REVIEWED: 'ตรวจแล้ว',
    RESOLVED: 'จัดการแล้ว',
    REJECTED: 'ปฏิเสธ',
  }
  return status ? labels[status] : 'ทุกสถานะ'
}

function targetLabel(targetType: ReportTargetType | '') {
  const labels: Record<ReportTargetType, string> = {
    CHARACTER: 'ตัวละคร',
    MESSAGE: 'ข้อความ',
    GENERATION_OUTPUT: 'ผลงานสร้าง',
  }
  return targetType ? labels[targetType] : 'ทุกประเภท'
}

function getApiErrorStatus(error: unknown) {
  if (error instanceof ApiError) return error.status
  if (typeof error === 'object' && error && 'status' in error) {
    const status = Number((error as { status?: number | string }).status)
    return Number.isFinite(status) ? status : undefined
  }
  return undefined
}

function isExpectedAdminAuthError(error: unknown) {
  const status = getApiErrorStatus(error)
  if (status === 401 || status === 403) return true
  const message = safeErrorTextForClassification(error)
  return message.includes('admin_unauthorized') || message.includes('unauthorized') || message.includes('forbidden')
}

function apiErrorMessage(error: unknown) {
  const status = getApiErrorStatus(error)
  if (status === 401 || status === 403) return 'ต้องบันทึก ADMIN_API_KEY ก่อนเปิดคิวรายงาน'
  return 'โหลดรายการรายงานไม่สำเร็จ'
}

function reportTitle(report: ReportSummary) {
  if (report.targetType === 'CHARACTER') return report.character?.name ?? `ตัวละคร ${report.characterId ?? ''}`
  if (report.targetType === 'GENERATION_OUTPUT') {
    return report.generationOutput?.kind === 'video' ? 'รายงานวิดีโอที่สร้าง' : 'รายงานรูปภาพที่สร้าง'
  }
  return `รายงานข้อความจาก ${report.message?.role ?? 'ข้อความ'}`
}

function reportBody(report: ReportSummary) {
  if (report.targetType === 'CHARACTER') {
    return report.details ?? 'ตัวละครนี้ถูกแจ้งให้ผู้ดูแลตรวจสอบ'
  }
  if (report.targetType === 'GENERATION_OUTPUT') {
    return report.details ?? `ผลงานสร้างนี้ถูกแจ้งให้ตรวจสอบ สถานะปัจจุบัน: ${report.generationOutput?.visibility ?? 'ไม่ทราบ'}`
  }
  return report.message?.content ?? report.details ?? 'ไม่พบเนื้อหาข้อความนี้แล้ว'
}

function reportTargetPath(report: ReportSummary) {
  if (report.targetType === 'CHARACTER' && report.characterId) return `/characters/${report.characterId}`
  if (report.message?.chatId) return `/chat/${report.message.chatId}`
  if (report.targetType === 'GENERATION_OUTPUT') return '/ai-creator'
  return null
}

function isQaSeedReport(report: ReportSummary) {
  if (isQaSeedCharacterId(report.characterId)) return true
  if (isQaSeedChatId(report.message?.chatId)) return true
  if (report.details?.includes('QA seed')) return true
  return false
}

function auditActionLabel(action: AdminAuditLog['action']) {
  const labels: Record<AdminAuditLog['action'], string> = {
    REPORT_STATUS_UPDATE: 'เปลี่ยนสถานะรายงาน',
    HIDE_CHARACTER: 'ซ่อนตัวละคร',
    ARCHIVE_MESSAGE: 'จัดเก็บข้อความ',
    HIDE_GENERATION_OUTPUT: 'ซ่อนผลงานสร้าง',
    TOKEN_ADJUSTMENT: 'ปรับเครดิต',
  }
  return labels[action] ?? action
}

function actionForReport(report: ReportSummary): ReportAdminAction | null {
  if (report.targetType === 'CHARACTER') return 'HIDE_CHARACTER'
  if (report.targetType === 'MESSAGE') return 'ARCHIVE_MESSAGE'
  if (report.targetType === 'GENERATION_OUTPUT') return 'HIDE_GENERATION_OUTPUT'
  return null
}

function actionLabel(action: ReportAdminAction) {
  if (action === 'HIDE_CHARACTER') return 'ซ่อนตัวละคร'
  if (action === 'ARCHIVE_MESSAGE') return 'จัดเก็บข้อความ'
  return 'ซ่อนผลงาน'
}

export function AdminModerationPage() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [status, setStatus] = useState<ReportStatus | ''>('PENDING')
  const [targetType, setTargetType] = useState<ReportTargetType | ''>('')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [adminKeyInput, setAdminKeyInput] = useState(() =>
    typeof window === 'undefined' ? '' : safeGetStorageItem(window.localStorage, 'maprang:adminKey') || '',
  )
  const [note, setNote] = useState(() =>
    typeof window !== 'undefined' && safeGetStorageItem(window.localStorage, 'maprang:adminKey')
      ? 'กำลังโหลดคิวรายงาน...'
      : 'บันทึก ADMIN_API_KEY ก่อนเปิดคิวรายงาน',
  )

  const hasAdminKey = adminKeyInput.trim().length > 0
  const normalizedSearch = search.trim().toLowerCase()
  const pendingCount = useMemo(() => reports.filter((report) => report.status === 'PENDING').length, [reports])
  const reviewedCount = useMemo(() => reports.filter((report) => report.status === 'REVIEWED').length, [reports])
  const completedCount = useMemo(
    () => reports.filter((report) => report.status === 'RESOLVED' || report.status === 'REJECTED').length,
    [reports],
  )

  const visibleReports = useMemo(() => {
    const base = canShowQaSeedData() ? reports : reports.filter((report) => !isQaSeedReport(report))
    if (!normalizedSearch) return base
    return base.filter((report) =>
      [
        reportTitle(report),
        reportBody(report),
        report.reason,
        report.reporter?.username,
        report.reporter?.email,
        report.id,
        report.characterId,
        report.messageId,
        report.generationOutputId,
        report.generationOutput?.kind,
        report.generationOutput?.visibility,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [normalizedSearch, reports])

  const loadReports = useCallback(async () => {
    const storedAdminKey = typeof window === 'undefined' ? '' : safeGetStorageItem(window.localStorage, 'maprang:adminKey') || ''
    if (!storedAdminKey.trim()) {
      setReports([])
      setAuditLogs([])
      setNote('บันทึก ADMIN_API_KEY ก่อนเปิดคิวรายงาน')
      return
    }
    setIsLoading(true)
    try {
      const [reportsPayload, auditPayload] = await Promise.all([
        fetchAdminReports({ status, targetType, limit: 80 }),
        fetchAdminAuditLogs(40),
      ])
      setReports(reportsPayload.reports)
      setAuditLogs(auditPayload.logs)
      setNote(`โหลดคิวรายงานแล้ว ${reportsPayload.reports.length.toLocaleString()} รายการ`)
    } catch (error) {
      if (!isExpectedAdminAuthError(error)) logUnexpectedError('โหลดคิวรายงานไม่สำเร็จ:', error)
      setReports([])
      setAuditLogs([])
      setNote(apiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [status, targetType])

  function saveAdminKey() {
    const key = adminKeyInput.trim()
    if (!key) {
      clearAdminApiKey()
      setAdminKeyInput('')
      setReports([])
      setAuditLogs([])
      setNote('ล้าง ADMIN_API_KEY แล้ว')
      return
    }
    setAdminApiKey(key)
    setAdminKeyInput(key)
    setNote('บันทึก ADMIN_API_KEY แล้ว กำลังโหลดคิวรายงาน...')
    void loadReports()
  }

  function removeAdminKey() {
    clearAdminApiKey()
    setAdminKeyInput('')
    setReports([])
    setAuditLogs([])
    setNote('ล้าง ADMIN_API_KEY แล้ว')
  }

  async function changeStatus(reportId: string, nextStatus: ReportStatus) {
    if (updatingId) return
    setUpdatingId(reportId)
    try {
      const payload = await updateAdminReportStatus(reportId, nextStatus)
      setReports((items) => items.map((item) => (item.id === reportId ? payload.report : item)))
      setNote(`เปลี่ยนสถานะเป็น ${statusLabel(nextStatus)} แล้ว`)
      const auditPayload = await fetchAdminAuditLogs(40)
      setAuditLogs(auditPayload.logs)
    } catch (error) {
      logUnexpectedError('เปลี่ยนสถานะรายงานไม่สำเร็จ:', error)
      setNote('เปลี่ยนสถานะรายงานไม่สำเร็จ')
    } finally {
      setUpdatingId('')
    }
  }

  async function applyAction(report: ReportSummary) {
    const action = actionForReport(report)
    if (!action || updatingId) return
    setUpdatingId(report.id)
    try {
      const payload = await applyAdminReportAction(report.id, action)
      setReports((items) => items.map((item) => (item.id === report.id ? payload.report : item)))
      setNote(`${actionLabel(action)} แล้ว`)
      const auditPayload = await fetchAdminAuditLogs(40)
      setAuditLogs(auditPayload.logs)
    } catch (error) {
      logUnexpectedError('จัดการรายงานไม่สำเร็จ:', error)
      setNote('จัดการรายงานไม่สำเร็จ')
    } finally {
      setUpdatingId('')
    }
  }

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  return (
    <main className="missai-shell space-y-5 text-white">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-[#ac4bff] uppercase">
            <ShieldCheck size={15} />
            ผู้ดูแล
          </p>
          <h1 className="font-display mt-2 text-3xl font-black">คิวรายงาน</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-white/58">
            ตรวจรายงานจากตัวละคร ข้อความ และผลงานสร้าง พร้อมบันทึกประวัติคำสั่งผู้ดูแลทุกครั้ง
          </p>
        </div>
        <button
          className="missai-button-secondary"
          disabled={isLoading}
          onClick={() => void loadReports()}
          title={isLoading ? 'กำลังโหลดคิวรายงาน' : 'รีเฟรชคิวรายงาน'}
          type="button"
        >
          <RefreshCw size={16} />
          รีเฟรช
        </button>
      </header>

      <section className="missai-card rounded-2xl p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
              <KeyRound size={17} className="text-[#ac4bff]" />
              สิทธิ์ผู้ดูแลสำหรับเครื่องนี้
            </p>
            <p className="m-0 mt-1 text-sm font-bold leading-6 text-white/55">{note}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              className="missai-input min-h-11 rounded-xl px-3 text-sm"
              onChange={(event) => setAdminKeyInput(event.target.value)}
              placeholder="วาง ADMIN_API_KEY"
              type="password"
              value={adminKeyInput}
            />
            <button className="missai-button-secondary bg-white text-slate-950 hover:bg-white/90" onClick={saveAdminKey} type="button">
              บันทึก
            </button>
            <button className="missai-button-secondary" onClick={removeAdminKey} type="button">
              <X size={16} />
              ล้าง
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">รอตรวจ</p>
          <p className="font-display mt-2 text-3xl font-black text-amber-200">{pendingCount.toLocaleString()}</p>
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">ตรวจแล้ว</p>
          <p className="font-display mt-2 text-3xl font-black text-sky-200">{reviewedCount.toLocaleString()}</p>
        </div>
        <div className="missai-card rounded-2xl p-4">
          <p className="m-0 text-sm font-black text-white/48">ปิดเคส</p>
          <p className="font-display mt-2 text-3xl font-black text-emerald-200">{completedCount.toLocaleString()}</p>
        </div>
      </section>

      <section className="missai-card grid gap-3 rounded-2xl p-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#080a1a]/60 px-3 text-white/45">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหารายงาน ผู้แจ้ง เหตุผล หรือเนื้อหา"
            value={search}
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#080a1a]/60 px-3 text-white/60">
          <Filter size={16} />
          <select className="bg-transparent text-sm font-bold text-white outline-none" onChange={(event) => setStatus(event.target.value as ReportStatus | '')} value={status}>
            {statuses.map((item) => (
              <option className="bg-slate-950 text-white" key={item || 'all-status'} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#080a1a]/60 px-3 text-white/60">
          <Filter size={16} />
          <select className="bg-transparent text-sm font-bold text-white outline-none" onChange={(event) => setTargetType(event.target.value as ReportTargetType | '')} value={targetType}>
            {targetTypes.map((item) => (
              <option className="bg-slate-950 text-white" key={item || 'all-type'} value={item}>
                {targetLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!hasAdminKey ? (
        <section className="missai-card rounded-2xl border-amber-500/20 bg-amber-500/10 p-5 text-amber-100">
          <p className="m-0 flex items-center gap-2 text-sm font-black">
            <AlertTriangle size={17} />
            ต้องมี ADMIN_API_KEY ก่อนเปิดคิวรายงาน
          </p>
          <p className="m-0 mt-2 text-sm font-bold leading-6 text-amber-100/75">
            ปุ่มและคิวรายงานถูกล็อกไว้เพื่อป้องกันการเรียกคำสั่งผู้ดูแลโดยไม่มีสิทธิ์
          </p>
        </section>
      ) : isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/5" key={item} />
          ))}
        </div>
      ) : visibleReports.length === 0 ? (
        <section className="missai-card rounded-2xl p-5 text-white/58">
          <p className="m-0 text-sm font-bold">ไม่พบรายงานในเงื่อนไขนี้</p>
        </section>
      ) : (
        <section className="grid gap-3">
          {visibleReports.map((report) => {
            const path = reportTargetPath(report)
            const action = actionForReport(report)
            const isUpdating = updatingId === report.id
            return (
              <article className="missai-card rounded-2xl p-4" key={report.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusStyle(report.status)}`}>
                        {statusLabel(report.status)}
                      </span>
                      <span className="missai-badge text-white/65">{targetLabel(report.targetType)}</span>
                      <span className="text-xs font-bold text-white/38">{formatDate(report.createdAt)}</span>
                    </div>
                    <h2 className="mt-3 text-lg font-black text-white">{reportTitle(report)}</h2>
                    <p className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-white/58">{reportBody(report)}</p>
                    <p className="mt-2 text-xs font-bold text-white/40">
                      เหตุผล: {report.reason} / ผู้แจ้ง: {report.reporter?.username ?? report.reporter?.email ?? 'ไม่ระบุ'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {path ? (
                      <Link className="missai-button-secondary min-h-10 px-3 text-xs" to={path}>
                        เปิดเป้าหมาย
                      </Link>
                    ) : (
                      <span className="missai-button-secondary min-h-10 px-3 text-xs opacity-50" title="รายงานนี้ไม่มีเป้าหมายที่เปิดได้">
                        ไม่มีลิงก์เป้าหมาย
                      </span>
                    )}
                    <button
                      className="missai-button-secondary min-h-10 px-3 text-xs"
                      disabled={isUpdating}
                      onClick={() => void changeStatus(report.id, 'REVIEWED')}
                      title={isUpdating ? 'กำลังอัปเดตรายงานนี้' : 'เปลี่ยนเป็นตรวจแล้ว'}
                      type="button"
                    >
                      ตรวจแล้ว
                    </button>
                    <button
                      className="missai-button-secondary min-h-10 px-3 text-xs"
                      disabled={isUpdating}
                      onClick={() => void changeStatus(report.id, 'RESOLVED')}
                      title={isUpdating ? 'กำลังอัปเดตรายงานนี้' : 'เปลี่ยนเป็นปิดเคส'}
                      type="button"
                    >
                      ปิดเคส
                    </button>
                    <button className="missai-button-danger min-h-10 px-3 text-xs" disabled={isUpdating || !action} onClick={() => void applyAction(report)} title={action ? actionLabel(action) : 'รายงานนี้ไม่มีคำสั่งที่รองรับ'} type="button">
                      {action ? actionLabel(action) : 'ไม่มีคำสั่ง'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}

      <section className="missai-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/10 p-4">
          <p className="m-0 flex items-center gap-2 text-sm font-black text-white">
            <CheckCircle2 size={17} className="text-[#ac4bff]" />
            ประวัติคำสั่งผู้ดูแล
          </p>
          <p className="m-0 mt-1 text-xs font-bold text-white/45">แสดงรายการล่าสุดจากบันทึกตรวจสอบ</p>
        </div>
        {!hasAdminKey ? (
          <div className="p-5 text-sm font-bold text-white/55">บันทึก ADMIN_API_KEY ก่อนดูบันทึกตรวจสอบ</div>
        ) : auditLogs.length === 0 ? (
          <div className="p-5 text-sm font-bold text-white/55">ยังไม่มีรายการบันทึกตรวจสอบ</div>
        ) : (
          <div className="divide-y divide-white/10">
            {auditLogs.map((log) => (
              <article className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={log.id}>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-black text-white">{auditActionLabel(log.action)}</p>
                  <p className="m-0 mt-1 truncate text-xs font-bold text-white/45">
                    {log.targetType} / {log.targetId}
                  </p>
                </div>
                <span className="text-xs font-bold text-white/38">{formatDate(log.createdAt)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
