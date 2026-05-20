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

const statuses: Array<ReportStatus | ''> = ['', 'PENDING', 'REVIEWED', 'RESOLVED', 'REJECTED']
const targetTypes: Array<ReportTargetType | ''> = ['', 'CHARACTER', 'MESSAGE']

function formatDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusStyle(status: ReportStatus) {
  const styles: Record<ReportStatus, string> = {
    PENDING: 'border-amber-300 bg-amber-50 text-amber-900',
    REVIEWED: 'border-sky-300 bg-sky-50 text-sky-900',
    RESOLVED: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    REJECTED: 'border-slate-300 bg-slate-50 text-slate-700',
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
  return error instanceof Error && /admin_unauthorized|unauthorized|forbidden/i.test(error.message)
}

function apiErrorMessage(error: unknown) {
  const status = getApiErrorStatus(error)
  if (status === 401 || status === 403) return 'ต้องบันทึก ADMIN_API_KEY ก่อนเปิดคิวรายงาน'
  return 'โหลดรายการรายงานไม่ได้'
}

function reportTitle(report: ReportSummary) {
  if (report.targetType === 'CHARACTER') return report.character?.name ?? `ตัวละคร ${report.characterId ?? ''}`
  return `รายงานข้อความจาก ${report.message?.role ?? 'ข้อความ'}`
}

function reportBody(report: ReportSummary) {
  if (report.targetType === 'CHARACTER') {
    return report.details ?? 'ตัวละครนี้ถูกรายงานให้ผู้ดูแลตรวจสอบ'
  }
  return report.message?.content ?? report.details ?? 'ไม่พบเนื้อหาข้อความนี้แล้ว'
}

function reportTargetPath(report: ReportSummary) {
  if (report.targetType === 'CHARACTER' && report.characterId) return `/characters/${report.characterId}`
  if (report.message?.chatId) return `/chat/${report.message.chatId}`
  return null
}

function auditActionLabel(action: AdminAuditLog['action']) {
  const labels: Record<AdminAuditLog['action'], string> = {
    REPORT_STATUS_UPDATE: 'เปลี่ยนสถานะรายงาน',
    HIDE_CHARACTER: 'ซ่อนตัวละคร',
    ARCHIVE_MESSAGE: 'จัดเก็บข้อความ',
    TOKEN_ADJUSTMENT: 'ปรับโทเคน',
  }
  return labels[action] ?? action
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
    typeof window === 'undefined' ? '' : window.localStorage.getItem('maprang:adminKey') || '',
  )
  const [note, setNote] = useState(() =>
    typeof window !== 'undefined' && window.localStorage.getItem('maprang:adminKey')
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
    if (!normalizedSearch) return reports
    return reports.filter((report) =>
      [
        reportTitle(report),
        reportBody(report),
        report.reason,
        report.reporter?.username,
        report.reporter?.email,
        report.id,
        report.characterId,
        report.messageId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [normalizedSearch, reports])

  const loadReports = useCallback(async () => {
    const storedAdminKey = typeof window === 'undefined' ? '' : window.localStorage.getItem('maprang:adminKey') || ''
    if (!storedAdminKey.trim()) {
      setReports([])
      setAuditLogs([])
      setNote('บันทึก ADMIN_API_KEY ก่อนเปิดคิวรายงาน')
      return
    }

    setIsLoading(true)
    try {
      const data = await fetchAdminReports({ status, targetType, limit: 80 })
      setReports(data.reports)
      const auditData = await fetchAdminAuditLogs(12)
      setAuditLogs(auditData.logs)
      setNote(data.reports.length > 0 ? `โหลดรายงานแล้ว ${data.reports.length} รายการ` : 'ไม่มีรายงานที่ตรงกับตัวกรองนี้')
    } catch (error) {
      if (!isExpectedAdminAuthError(error)) logUnexpectedError('โหลดคิวรายงานผู้ดูแลไม่สำเร็จ:', error)
      setReports([])
      setAuditLogs([])
      setNote(apiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [status, targetType])

  async function saveAdminKey() {
    const key = adminKeyInput.trim()
    if (!key) {
      clearAdminApiKey()
      setAdminKeyInput('')
      setNote('ล้าง ADMIN_API_KEY แล้ว')
      return
    }
    setAdminApiKey(key)
    setAdminKeyInput(key)
    setNote('บันทึก ADMIN_API_KEY แล้ว กำลังโหลดคิวรายงานใหม่...')
    await loadReports()
  }

  async function removeAdminKey() {
    clearAdminApiKey()
    setAdminKeyInput('')
    setReports([])
    setAuditLogs([])
    setNote('ล้าง ADMIN_API_KEY แล้ว')
  }

  async function changeStatus(reportId: string, nextStatus: ReportStatus) {
    setUpdatingId(reportId)
    try {
      const data = await updateAdminReportStatus(reportId, nextStatus)
      setReports((prev) => prev.map((report) => (report.id === reportId ? data.report : report)))
      const auditData = await fetchAdminAuditLogs(12)
      setAuditLogs(auditData.logs)
      setNote(`ปรับสถานะรายงานเป็น ${statusLabel(nextStatus)} แล้ว`)
    } catch (error) {
      logUnexpectedError('ปรับสถานะรายงานไม่สำเร็จ:', error)
      setNote(error instanceof ApiError && error.status === 403 ? 'ยังไม่ได้เปิดสิทธิ์ผู้ดูแล หรือรหัสผู้ดูแลไม่ถูกต้อง' : 'ปรับสถานะรายงานไม่ได้')
    } finally {
      setUpdatingId('')
    }
  }

  async function applyAction(reportId: string, action: ReportAdminAction) {
    setUpdatingId(reportId)
    try {
      const data = await applyAdminReportAction(reportId, action)
      setReports((prev) => prev.map((report) => (report.id === reportId ? data.report : report)))
      const auditData = await fetchAdminAuditLogs(12)
      setAuditLogs(auditData.logs)
      setNote(action === 'HIDE_CHARACTER' ? 'ซ่อนตัวละครและปิดรายงานแล้ว' : 'จัดเก็บข้อความและปิดรายงานแล้ว')
    } catch (error) {
      logUnexpectedError('ทำคำสั่งดูแลรายงานไม่สำเร็จ:', error)
      setNote(error instanceof ApiError && error.status === 403 ? 'ยังไม่ได้เปิดสิทธิ์ผู้ดูแล หรือรหัสผู้ดูแลไม่ถูกต้อง' : 'ทำคำสั่งดูแลรายงานไม่ได้')
    } finally {
      setUpdatingId('')
    }
  }

  useEffect(() => {
    loadReports()
  }, [loadReports])

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
              <ShieldCheck size={16} />
              ดูแลรายงาน
            </p>
            <h1 className="m-0 mt-2 text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">คิวรายงาน</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              ตรวจตัวละครและข้อความที่ถูกรายงานจากหน้าเดียว พร้อมเก็บประวัติการทำงานของผู้ดูแล
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:flex sm:items-center">
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm font-black text-amber-900">
              รอตรวจ {pendingCount}
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-sm font-black text-sky-900">
              ตรวจแล้ว {reviewedCount}
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-900">
              จบแล้ว {completedCount}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-end">
          <div>
            <p className="m-0 flex items-center gap-2 text-sm font-black text-slate-950">
              <KeyRound size={17} />
              สิทธิ์ผู้ดูแลสำหรับเครื่องนี้
            </p>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
              ใส่ `ADMIN_API_KEY` เพื่อเปิดคิวรายงานและคำสั่งผู้ดูแลบนเบราว์เซอร์นี้
            </p>
            <p
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                hasAdminKey ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
              }`}
            >
              {hasAdminKey ? 'มีคีย์ในเครื่องนี้แล้ว' : 'ยังไม่ได้ตั้งค่า ADMIN_API_KEY'}
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              className="min-h-11 min-w-0 rounded-xl border border-slate-900/10 px-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-500"
              onChange={(event) => setAdminKeyInput(event.target.value)}
              placeholder="วาง ADMIN_API_KEY"
              type="password"
              value={adminKeyInput}
            />
            <button
              className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              onClick={() => void saveAdminKey()}
              type="button"
            >
              บันทึกคีย์
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              onClick={() => void removeAdminKey()}
              type="button"
            >
              <X size={16} />
              ล้าง
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 text-slate-400 focus-within:border-amber-500">
            <Search size={17} />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหารายงาน เหตุผล ผู้รายงาน หรือรหัส"
              value={search}
            />
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select
              className="min-h-11 min-w-0 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-bold text-slate-700"
              onChange={(event) => setStatus(event.target.value as ReportStatus | '')}
              value={status}
            >
              {statuses.map((item) => (
                <option key={item || 'ALL'} value={item}>
                  {statusLabel(item)}
                </option>
              ))}
            </select>
            <select
              className="min-h-11 min-w-0 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-bold text-slate-700"
              onChange={(event) => setTargetType(event.target.value as ReportTargetType | '')}
              value={targetType}
            >
              {targetTypes.map((item) => (
                <option key={item || 'ALL'} value={item}>
                  {targetLabel(item)}
                </option>
              ))}
            </select>
            <button type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={isLoading || !hasAdminKey}
              onClick={loadReports}
              title={hasAdminKey ? 'โหลดคิวรายงานใหม่' : 'บันทึก ADMIN_API_KEY ก่อนรีเฟรช'}
            >
              <RefreshCw size={16} />
              รีเฟรช
            </button>
          </div>
        </div>
        {note && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
            <Filter size={16} />
            <p className="m-0">{note}</p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-900/10 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
            กำลังโหลดรายงาน...
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="grid gap-4 rounded-2xl border border-slate-900/10 bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="m-0 text-lg font-black text-slate-950">
                {reports.length === 0 ? 'ยังไม่มีรายการที่ต้องดูแล' : 'ไม่พบรายงานที่ตรงกับคำค้นหา'}
              </p>
              <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                ถ้าต้องการทดสอบ flow นี้ ให้ไปที่ห้องแชทหรือหน้าโปรไฟล์ตัวละครแล้วกดรายงาน ระบบจะส่งรายการมาเข้าคิวนี้ทันที
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
                to="/chat"
              >
                ไปทดสอบรายงานในแชท
              </Link>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
                to="/"
              >
                ไปหน้าเลือกตัวละคร
              </Link>
            </div>
          </div>
        ) : (
          visibleReports.map((report) => {
            const targetPath = reportTargetPath(report)
            return (
              <article className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm" key={report.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusStyle(report.status)}`}>
                        {statusLabel(report.status)}
                      </span>
                      <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">
                        {targetLabel(report.targetType)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{formatDate(report.createdAt)}</span>
                    </div>
                    <div>
                      <h2 className="m-0 text-lg font-black tracking-normal text-slate-950">{reportTitle(report)}</h2>
                      <p className="m-0 mt-1 text-sm font-bold text-slate-500">เหตุผล: {report.reason}</p>
                    </div>
                    <p className="m-0 max-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                      {reportBody(report)}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                      {report.reporter && (
                        <span>ผู้รายงาน: {report.reporter.username ?? report.reporter.email ?? report.reporter.id}</span>
                      )}
                      <span>รหัสรายงาน: {report.id}</span>
                    </div>
                  </div>

                  <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:w-[240px]">
                    {targetPath && (
                      <Link
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 sm:col-span-2"
                        to={targetPath}
                      >
                        เปิดต้นทาง
                      </Link>
                    )}
                    {report.targetType === 'CHARACTER' && (
                      <button
                        className="min-h-10 rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60 sm:col-span-2"
                        disabled={updatingId === report.id || report.status === 'RESOLVED'}
                        onClick={() => applyAction(report.id, 'HIDE_CHARACTER')}
                        type="button"
                      >
                        ซ่อนตัวละคร
                      </button>
                    )}
                    {report.targetType === 'MESSAGE' && (
                      <button
                        className="min-h-10 rounded-xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60 sm:col-span-2"
                        disabled={updatingId === report.id || report.status === 'RESOLVED' || Boolean(report.message?.deletedAt)}
                        onClick={() => applyAction(report.id, 'ARCHIVE_MESSAGE')}
                        type="button"
                      >
                        จัดเก็บข้อความ
                      </button>
                    )}
                    <button
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
                      disabled={updatingId === report.id}
                      onClick={() => changeStatus(report.id, 'REVIEWED')}
                      type="button"
                    >
                      <AlertTriangle size={16} />
                      ตรวจแล้ว
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      disabled={updatingId === report.id}
                      onClick={() => changeStatus(report.id, 'RESOLVED')}
                      type="button"
                    >
                      <CheckCircle2 size={16} />
                      จัดการแล้ว
                    </button>
                    <button
                      className="min-h-10 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 sm:col-span-2"
                      disabled={updatingId === report.id}
                      onClick={() => changeStatus(report.id, 'REJECTED')}
                      type="button"
                    >
                      ปฏิเสธรายงาน
                    </button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white shadow-sm">
        <div className="border-b border-slate-900/10 p-4">
          <p className="m-0 text-sm font-black text-slate-950">ประวัติผู้ดูแลล่าสุด</p>
          <p className="m-0 mt-1 text-xs font-bold text-slate-400">บันทึกคำสั่งดูแลรายงานและโทเคนที่ระบบเก็บไว้</p>
        </div>
        {auditLogs.length === 0 ? (
          <div className="p-4 text-sm font-bold text-slate-500">ยังไม่มีประวัติผู้ดูแล</div>
        ) : (
          <div className="divide-y divide-slate-900/10">
            {auditLogs.map((log) => (
              <article className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={log.id}>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-black text-slate-950">
                    {auditActionLabel(log.action)} / {log.targetType}
                  </p>
                  <p className="m-0 mt-1 truncate text-xs font-bold text-slate-400">
                    {log.targetId} / {log.actorUser?.username ?? log.actorUser?.email ?? log.actorUserId ?? 'รหัสผู้ดูแล'}
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">{formatDate(log.createdAt)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
