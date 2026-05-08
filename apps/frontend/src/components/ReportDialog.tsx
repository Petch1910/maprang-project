import { useState } from 'react'
import { X } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/72 p-0 backdrop-blur-md sm:place-items-center sm:p-4">
      <section
        className="w-full rounded-t-2xl border border-white/10 bg-[#151518] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:max-w-lg sm:rounded-2xl"
        data-testid="report-dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-xs font-black tracking-widest text-white/42 uppercase">รายงาน{targetLabel(target.targetType)}</p>
            <h2 className="m-0 mt-2 text-xl font-black tracking-normal text-white">{target.title}</h2>
          </div>
          <button type="button"
            aria-label="ปิดหน้าต่างรายงาน"
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/6 text-white/60 transition hover:bg-white/10 hover:text-white"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        {target.preview && (
          <p className="mt-4 max-h-28 overflow-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-white/6 p-3 text-sm leading-6 text-white/66">
            {target.preview}
          </p>
        )}

        <label className="mt-4 block text-sm font-black text-white/82" htmlFor="report-reason">
          เหตุผล
        </label>
        <select
          className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#1f1f24] px-3 text-sm font-bold text-white outline-none transition focus:border-orange-500/70 focus:ring-4 focus:ring-orange-500/15"
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

        <label className="mt-4 block text-sm font-black text-white/82" htmlFor="report-details">
          รายละเอียด
        </label>
        <textarea
          className="mt-2 min-h-28 w-full resize-none rounded-lg border border-white/10 bg-[#1f1f24] p-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-orange-500/70 focus:ring-4 focus:ring-orange-500/15"
          disabled={isSubmitting}
          id="report-details"
          maxLength={800}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="เพิ่มบริบทเพื่อช่วยให้ผู้ดูแลเข้าใจปัญหา"
          value={details}
        />
        <p className="m-0 mt-1 text-xs font-bold text-white/38">{details.length}/800</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button"
            className="min-h-11 rounded-lg border border-white/10 bg-white/6 px-4 text-sm font-black text-white/74 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
            data-testid="report-cancel"
            disabled={isSubmitting}
            onClick={onClose}
          >
            ยกเลิก
          </button>
          <button type="button"
            className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-500 disabled:opacity-60"
            data-testid="report-submit"
            disabled={isSubmitting}
            onClick={submit}
          >
            {isSubmitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
          </button>
        </div>
      </section>
    </div>
  )
}
