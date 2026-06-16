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
  if (targetType === 'CHARACTER') return 'ตัวละคร'
  if (targetType === 'MESSAGE') return 'ข้อความ'
  if (targetType === 'GENERATION_OUTPUT') return 'ผลงานสร้าง'
  return 'เนื้อหา'
}

export function ReportDialog({ isOpen, isSubmitting = false, target, onClose, onSubmit }: ReportDialogProps) {
  const [reason, setReason] = useState(reasons[0].id)
  const [details, setDetails] = useState('')
  const submittingDisabledReason = isSubmitting ? 'กำลังส่งรายงาน รอให้เสร็จก่อน' : ''

  if (!isOpen || !target) return null

  const submit = async () => {
    await onSubmit({ reason, details: details.trim() })
    setReason(reasons[0].id)
    setDetails('')
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/72 p-0 backdrop-blur-md sm:place-items-center sm:p-4">
      <section
        className="missai-dialog w-full rounded-t-2xl p-5 text-white sm:max-w-lg sm:rounded-2xl"
        data-testid="report-dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-xs font-black tracking-widest text-white/42 uppercase">รายงาน{targetLabel(target.targetType)}</p>
            <h2 className="m-0 mt-2 text-xl font-black tracking-normal text-white">{target.title}</h2>
          </div>
          <button type="button"
            aria-label="ปิดหน้าต่างรายงาน"
            aria-disabled={isSubmitting}
            className="missai-icon-button size-10 rounded-full"
            disabled={isSubmitting}
            onClick={onClose}
            title={submittingDisabledReason || 'ปิดหน้าต่างรายงาน'}
          >
            <X size={17} />
          </button>
        </div>

        {target.preview && (
          <p className="missai-empty mt-4 max-h-28 overflow-auto whitespace-pre-wrap text-sm text-white/66">
            {target.preview}
          </p>
        )}

        <label className="mt-4 block text-sm font-black text-white/82" htmlFor="report-reason">
          เหตุผล
        </label>
        <select
          className="missai-input mt-2 min-h-11 rounded-xl px-3 text-sm"
          aria-disabled={isSubmitting}
          disabled={isSubmitting}
          id="report-reason"
          onChange={(event) => setReason(event.target.value)}
          title={submittingDisabledReason || 'เลือกเหตุผลรายงาน'}
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
          className="missai-input mt-2 min-h-28 resize-none rounded-xl p-3 text-sm leading-6"
          aria-disabled={isSubmitting}
          disabled={isSubmitting}
          id="report-details"
          maxLength={800}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="เพิ่มบริบทเพื่อช่วยให้ผู้ดูแลเข้าใจปัญหา"
          title={submittingDisabledReason || 'รายละเอียดเพิ่มเติมสำหรับผู้ดูแล'}
          value={details}
        />
        <p className="m-0 mt-1 text-xs font-bold text-white/38">{details.length}/800</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button"
            className="missai-button-secondary min-h-11 rounded-xl px-4 text-sm disabled:opacity-60"
            aria-disabled={isSubmitting}
            data-testid="report-cancel"
            disabled={isSubmitting}
            onClick={onClose}
            title={submittingDisabledReason || 'ยกเลิกรายงาน'}
          >
            ยกเลิก
          </button>
          <button type="button"
            className="missai-button-danger min-h-11 rounded-xl px-4 text-sm disabled:opacity-60"
            aria-disabled={isSubmitting}
            data-testid="report-submit"
            disabled={isSubmitting}
            onClick={submit}
            title={submittingDisabledReason || 'ส่งรายงานให้ผู้ดูแล'}
          >
            {isSubmitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
          </button>
        </div>
      </section>
    </div>
  )
}
