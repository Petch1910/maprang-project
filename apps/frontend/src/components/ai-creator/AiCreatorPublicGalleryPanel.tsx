import { Flag, Image as ImageIcon, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'

type AiCreatorPublicGalleryPanelProps = {
  privateItemCount: number
  onCreateFocus: () => void
}

function DisabledAction({
  icon: Icon,
  actionId,
  label,
  reason,
}: {
  icon: typeof ImageIcon
  actionId: string
  label: string
  reason: string
}) {
  return (
    <button
      type="button"
      data-testid={`ai-creator-public-action-${actionId}`}
      className="missai-button-secondary min-h-10 justify-center opacity-60"
      disabled
      title={reason}
      aria-disabled="true"
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

export function AiCreatorPublicGalleryPanel({
  privateItemCount,
  onCreateFocus,
}: AiCreatorPublicGalleryPanelProps) {
  return (
    <section className="missai-card mt-8 rounded-2xl p-6" data-testid="ai-creator-public-gallery">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#d8b4fe]">
            <ShieldCheck size={16} className="text-emerald-300" />
            Public Gallery Contract
          </div>
          <h2 className="mt-2 text-lg font-black text-white">แกลเลอรีสาธารณะยังปิดไว้แบบปลอดภัย</h2>
          <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-white/50">
            ผลงานที่สร้างใน Maprang จะอยู่ใน My Library แบบส่วนตัวก่อนเสมอ การเผยแพร่สาธารณะต้องเป็น opt-in
            และต้องมีระบบ moderation/report พร้อมก่อนเปิดใช้งานจริง
          </p>
        </div>

        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-200">
          {privateItemCount} private item
        </span>
      </div>

      <div className="grid gap-4 pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <div>
              <ImageIcon className="mx-auto h-12 w-12 text-white/20" />
              <h3 className="mt-4 text-sm font-black text-white">ยังไม่มีผลงานสาธารณะ</h3>
              <p className="mt-2 max-w-md text-xs font-semibold leading-5 text-white/45">
                ใช้ My Library สำหรับงานส่วนตัวก่อน เมื่อ backend job, storage signed URL, publish opt-in และ moderation
                พร้อม จึงค่อยเปิดรายการสาธารณะจริง
              </p>
              <button
                type="button"
                data-testid="ai-creator-public-create-focus"
                onClick={onCreateFocus}
                className="missai-button-primary mx-auto mt-5 min-h-10 px-5 text-xs"
              >
                <Sparkles size={14} />
                กลับไปสร้างชิ้นงาน
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-black text-white">Action contract เมื่อเปิด Public Gallery</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/45">
            ปุ่มเหล่านี้ยังไม่เปิดใช้งานเพื่อกันการเผยแพร่ข้อมูลส่วนตัวหรือ reuse prompt โดยไม่มีสิทธิ์
          </p>
          <div className="mt-4 grid gap-2">
            <DisabledAction
              icon={ImageIcon}
              actionId="detail"
              label="เปิดรายละเอียดสาธารณะ"
              reason="ต้องมี public gallery API และ visibility guard ก่อน"
            />
            <DisabledAction
              icon={RotateCcw}
              actionId="reuse"
              label="Reuse template"
              reason="ต้องมี sanitized public template/prompt contract ก่อน"
            />
            <DisabledAction
              icon={Flag}
              actionId="report"
              label="Report"
              reason="ต้องเชื่อม moderation queue สำหรับ generated public output ก่อน"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
