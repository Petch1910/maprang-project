import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Filter, RefreshCw, ShieldCheck } from 'lucide-react'
import {
  ApiError,
  fetchAdminReports,
  updateAdminReportStatus,
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

function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return 'Admin API key is missing or invalid.'
  if (error instanceof ApiError && error.status === 401) return 'Please sign in again before opening moderation.'
  return 'Could not load moderation reports.'
}

function reportTitle(report: ReportSummary) {
  if (report.targetType === 'CHARACTER') return report.character?.name ?? `Character ${report.characterId ?? ''}`
  return `${report.message?.role ?? 'Message'} report`
}

function reportBody(report: ReportSummary) {
  if (report.targetType === 'CHARACTER') {
    return report.details ?? 'Character was reported for moderation review.'
  }
  return report.message?.content ?? report.details ?? 'Message content is no longer available.'
}

export function AdminModerationPage() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [status, setStatus] = useState<ReportStatus | ''>('PENDING')
  const [targetType, setTargetType] = useState<ReportTargetType | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [note, setNote] = useState('Loading moderation queue...')

  const pendingCount = useMemo(() => reports.filter((report) => report.status === 'PENDING').length, [reports])

  async function loadReports() {
    setIsLoading(true)
    try {
      const data = await fetchAdminReports({ status, targetType, limit: 80 })
      setReports(data.reports)
      setNote(data.reports.length > 0 ? `Loaded ${data.reports.length} report(s).` : 'No reports match this filter.')
    } catch (error) {
      console.error('Load admin reports error:', error)
      setReports([])
      setNote(apiErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function changeStatus(reportId: string, nextStatus: ReportStatus) {
    setUpdatingId(reportId)
    try {
      const data = await updateAdminReportStatus(reportId, nextStatus)
      setReports((prev) => prev.map((report) => (report.id === reportId ? data.report : report)))
      setNote(`Report marked as ${nextStatus.toLowerCase()}.`)
    } catch (error) {
      console.error('Update report status error:', error)
      setNote(error instanceof ApiError && error.status === 403 ? 'Admin API key is missing or invalid.' : 'Could not update report status.')
    } finally {
      setUpdatingId('')
    }
  }

  useEffect(() => {
    loadReports()
  }, [status, targetType])

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase">
              <ShieldCheck size={16} />
              Moderation
            </p>
            <h1 className="m-0 mt-2 text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">Report Queue</h1>
            <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review reported characters and chat messages without leaving the product shell.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
              Pending {pendingCount}
            </div>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={isLoading}
              onClick={loadReports}
              type="button"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-700">
            <Filter size={16} />
            Queue filters
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              className="min-h-11 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-bold text-slate-700"
              onChange={(event) => setStatus(event.target.value as ReportStatus | '')}
              value={status}
            >
              {statuses.map((item) => (
                <option key={item || 'ALL'} value={item}>
                  {item || 'ALL STATUS'}
                </option>
              ))}
            </select>
            <select
              className="min-h-11 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-bold text-slate-700"
              onChange={(event) => setTargetType(event.target.value as ReportTargetType | '')}
              value={targetType}
            >
              {targetTypes.map((item) => (
                <option key={item || 'ALL'} value={item}>
                  {item || 'ALL TARGETS'}
                </option>
              ))}
            </select>
          </div>
        </div>
        {note && <p className="m-0 mt-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{note}</p>}
      </section>

      <section className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-900/10 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-900/10 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
            No moderation items here.
          </div>
        ) : (
          reports.map((report) => (
            <article className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm" key={report.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusStyle(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">
                      {report.targetType}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{formatDate(report.createdAt)}</span>
                  </div>
                  <div>
                    <h2 className="m-0 text-lg font-black tracking-normal text-slate-950">{reportTitle(report)}</h2>
                    <p className="m-0 mt-1 text-sm font-bold text-slate-500">Reason: {report.reason}</p>
                  </div>
                  <p className="m-0 max-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {reportBody(report)}
                  </p>
                  {report.reporter && (
                    <p className="m-0 text-xs font-bold text-slate-400">
                      Reporter: {report.reporter.username ?? report.reporter.email ?? report.reporter.id}
                    </p>
                  )}
                </div>

                <div className="grid min-w-[220px] grid-cols-2 gap-2">
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
                    disabled={updatingId === report.id}
                    onClick={() => changeStatus(report.id, 'REVIEWED')}
                    type="button"
                  >
                    <AlertTriangle size={16} />
                    Review
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    disabled={updatingId === report.id}
                    onClick={() => changeStatus(report.id, 'RESOLVED')}
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                    Resolve
                  </button>
                  <button
                    className="col-span-2 min-h-10 rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    disabled={updatingId === report.id}
                    onClick={() => changeStatus(report.id, 'REJECTED')}
                    type="button"
                  >
                    Reject report
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
