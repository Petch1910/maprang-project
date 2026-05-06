import { useState } from 'react'
import type { ReportTargetType } from '../lib/api'

export type ReportDialogTarget = {
  targetType: ReportTargetType
  title: string
  preview?: string
}

export type ReportDialogSubmit = {
  reason: string
  details: string
}

type ReportDialogProps = {
  isOpen: boolean
  isSubmitting?: boolean
  target: ReportDialogTarget | null
  onClose: () => void
  onSubmit: (input: ReportDialogSubmit) => Promise<void> | void
}

const reasons = [
  { id: 'policy_review', label: 'ควรให้ผู้ดูแลตรวจนโยบาย' },
  { id: 'wrong_rating', label: 'จัดระดับคอนเทนต์ไม่ถูกต้อง' },
  { id: 'unsafe_content', label: 'เนื้อหาไม่ปลอดภัยหรือรุนแรงเกินไป' },
  { id: 'spam_or_low_quality', label: 'สแปมหรือคุณภาพต่ำ' },
  { id: 'other', label: 'อื่นๆ' },
]

function targetLabel(targetType: ReportTargetType) {
  return targetType === 'CHARACTER' ? 'ตัวละคร' : 'ข้อความ'
}

export function ReportDialog({ isOpen, isSubmitting = false, target, onClose, onSubmit }: ReportDialogProps) {
  const [reason, setReason] = useState(reasons[0].id)
  const [details, setDetails] = useState('')

  if (!isOpen || !target) return null

  const submit = async () => {
    await onSubmit({ reason, details: details.trim() })
    setReason(reasons[0].id)
    setDetails('')
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/45 p-0 sm:place-items-center sm:p-4">
      <section className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-xs font-black tracking-widest text-slate-400 uppercase">รายงาน{targetLabel(target.targetType)}</p>
            <h2 className="m-0 mt-2 text-xl font-black tracking-normal text-slate-950">{target.title}</h2>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full border border-slate-900/10 bg-white text-sm font-black text-slate-500"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>

        {target.preview && (
          <p className="mt-4 max-h-28 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            {target.preview}
          </p>
        )}

        <label className="mt-4 block text-sm font-black text-slate-700" htmlFor="report-reason">
          เหตุผล
        </label>
        <select
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-900/10 bg-white px-3 text-sm font-bold text-slate-700"
          disabled={isSubmitting}
          id="report-reason"
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        >
          {reasons.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-black text-slate-700" htmlFor="report-details">
          รายละเอียด
        </label>
        <textarea
          className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-900/10 bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-blue-500"
          disabled={isSubmitting}
          id="report-details"
          maxLength={800}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="เพิ่มบริบทเพื่อช่วยให้ผู้ดูแลเข้าใจปัญหา"
          value={details}
        />
        <p className="m-0 mt-1 text-xs font-bold text-slate-400">{details.length}/800</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="min-h-11 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            ยกเลิก
          </button>
          <button
            className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-60"
            disabled={isSubmitting}
            onClick={submit}
            type="button"
          >
            {isSubmitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
          </button>
        </div>
      </section>
    </div>
  )
}
