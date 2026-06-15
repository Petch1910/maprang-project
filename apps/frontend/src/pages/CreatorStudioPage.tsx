import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  Eye,
  Image as ImageIcon,
  MessageSquareText,
  Sparkles,
  Tags,
  WandSparkles,
} from 'lucide-react'
import { CharacterCreateForm, type CreatorDraftStatus } from '../components/CharacterCreateForm'
import { ApiError, createCharacter, type Character, type CharacterInput } from '../lib/api'

function createErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'สร้างตัวละครไม่สำเร็จ กรุณาลองใหม่'
  if (error.status === 401) return 'กรุณาเข้าสู่ระบบก่อนสร้างตัวละคร'
  if (error.status === 403) return 'บัญชีนี้ยังไม่มีสิทธิ์สร้างหรือเผยแพร่ตัวละคร'
  if (error.status === 413) return 'รูปหรือข้อมูลที่ส่งมีขนาดใหญ่เกินไป'
  if (error.status === 422) return 'ข้อมูลยังไม่ครบหรือมีรูปแบบไม่ถูกต้อง'
  return 'สร้างตัวละครไม่สำเร็จ กรุณาลองใหม่'
}

const defaultDraftStatus: CreatorDraftStatus = {
  hasAvatar: false,
  avatarSource: 'none',
  hasIdentity: false,
  hasPrompt: false,
  hasScenario: false,
  hasGreeting: false,
  hasDangerConflict: false,
  hasWarning: false,
  hasPreviewRun: false,
  draftGeneratedFromImage: false,
  canSubmit: false,
  readinessLabel: 'เริ่มจากรูปหรือชื่อก่อน',
  readinessScore: 28,
  tagCounts: {
    discovery: 1,
    engine: 0,
    safety: 0,
    unknown: 0,
  },
  issueMessages: [],
  note: '',
}

function AssistantCheckRow({
  ready,
  title,
  detail,
  tone = 'neutral',
}: {
  ready: boolean
  title: string
  detail: string
  tone?: 'neutral' | 'danger' | 'warning'
}) {
  const isDanger = tone === 'danger'
  const isWarning = tone === 'warning'
  const Icon = ready ? CheckCircle2 : isDanger ? AlertTriangle : Circle
  return (
    <div
      className={`rounded-xl border p-3 ${
        ready
          ? 'border-emerald-500/20 bg-emerald-500/10'
          : isDanger
            ? 'border-red-500/20 bg-red-500/10'
            : isWarning
              ? 'border-amber-500/20 bg-amber-500/10'
              : 'border-[#2e2e44] bg-[#1e1e34]/50'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={`mt-0.5 flex-none ${
            ready ? 'text-emerald-400' : isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-[#9ca3af]'
          }`}
          size={17}
        />
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-white">{title}</p>
          <p className="m-0 mt-1 text-xs font-medium leading-5 text-[#9ca3af]">{detail}</p>
        </div>
      </div>
    </div>
  )
}

export function CreatorStudioPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null)
  const [error, setError] = useState('')
  const [draftStatus, setDraftStatus] = useState<CreatorDraftStatus>(defaultDraftStatus)

  const handleCreate = async (input: CharacterInput) => {
    setIsSaving(true)
    setError('')
    setCreatedCharacter(null)
    try {
      const data = await createCharacter(input)
      setCreatedCharacter(data.character)
      return true
    } catch (createError) {
      const message = createErrorMessage(createError)
      setError(message)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const checklist = useMemo(
    () => [
      {
        ready: draftStatus.hasAvatar,
        title:
          draftStatus.avatarSource === 'placeholder'
            ? 'ภาพร่างพร้อม'
            : draftStatus.avatarSource === 'provider'
              ? 'รูป AI พร้อม'
              : 'รูปพร้อม',
        detail:
          draftStatus.avatarSource === 'placeholder'
            ? 'ตอนนี้เป็นภาพร่างระบบ ใช้จัดฟอร์มและพัฒนาบุคลิกต่อได้ ก่อนเผยแพร่สาธารณะค่อยเชื่อมระบบสร้างรูปจริง'
            : draftStatus.avatarSource === 'provider'
              ? 'ได้รูปจากระบบสร้างรูป และระบบช่วยร่างเนื้อหาแล้ว'
              : draftStatus.draftGeneratedFromImage
                ? 'มีรูปและระบบช่วยร่างเนื้อหาแล้ว'
                : 'ใส่รูปเพื่อให้หน้าการ์ดและหน้าล็อบบี้ดูน่ากด',
        icon: ImageIcon,
      },
      {
        ready: draftStatus.hasIdentity && draftStatus.hasPrompt,
        title: 'บุคลิกต้องชัด',
        detail: draftStatus.hasPrompt ? 'มีแกนพรอมป์สำหรับคุมโทนตัวละคร' : 'เติมชื่อ คำโปรย และพรอมป์หลักให้ชัด',
        icon: Bot,
      },
      {
        ready: !draftStatus.hasDangerConflict,
        title: 'แท็กต้องไม่ชนกัน',
        detail: draftStatus.hasDangerConflict
          ? 'พบแท็กที่บล็อกการสร้าง ต้องแก้ก่อนเผยแพร่'
          : draftStatus.hasWarning
            ? 'ไม่มีเคสอันตราย แต่ยังมีคำเตือนที่ควรอ่าน'
            : 'ยังไม่พบแท็กขัดแย้งร้ายแรง',
        icon: Tags,
        tone: draftStatus.hasDangerConflict ? ('danger' as const) : draftStatus.hasWarning ? ('warning' as const) : ('neutral' as const),
      },
      {
        ready: draftStatus.hasPreviewRun,
        title: 'ลองบทก่อนเผยแพร่',
        detail: draftStatus.hasPreviewRun ? 'จำลอง 5 เทิร์นแล้ว' : 'กดทดสอบ 5 เทิร์นเพื่อเช็กน้ำเสียงและความสัมพันธ์',
        icon: MessageSquareText,
      },
    ],
    [draftStatus],
  )

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
      <section className="flex flex-col gap-3 rounded-2xl border border-[#2e2e44] bg-[#1e1e34]/90 p-6 text-white shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#d8b4fe]">
          <Sparkles size={16} />
          <span>สตูดิโอสร้างตัวละคร</span>
          <span className="rounded-full border border-[#a855f7]/30 bg-[#a855f7]/15 px-2.5 py-1 text-[#d8b4fe]">ฟอร์มคุ้นมือ + ระบบช่วยตรวจ Maprang</span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-black tracking-normal text-white sm:text-3xl">สร้างตัวละคร</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#9ca3af]">
              โครงหลักยังเป็นฟอร์มสร้างตัวละครแบบที่ผู้เล่นคุ้น แต่เพิ่มตัวช่วยให้บุคลิกชัด แท็กไม่ชน และลองบทได้ก่อนปล่อยจริง
            </p>
          </div>
          <div className="grid w-full min-w-0 gap-1 rounded-xl border border-[#2e2e44] bg-[#1a1a2e] p-3 sm:w-48">
            <span className="text-[11px] font-bold text-[#9ca3af]">ความพร้อมล่าสุด</span>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/25">
                <div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${draftStatus.readinessScore}%` }} />
              </div>
              <span className="text-sm font-black text-white">{draftStatus.readinessScore}%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,760px)_360px] lg:justify-center">
        <div className="min-w-0">
          <CharacterCreateForm
            defaultOpen
            isSaving={isSaving}
            onCreate={handleCreate}
            onDraftStatusChange={setDraftStatus}
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-[#2e2e44] bg-[#1e1e34]/90 p-5 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/15 text-[#d8b4fe]">
                <WandSparkles size={18} />
              </span>
              <div>
                <h2 className="m-0 text-base font-black text-white">ผู้ช่วยตรวจดราฟต์</h2>
                <p className="m-0 text-xs font-medium text-[#9ca3af]">สถานะสดจากฟอร์มด้านซ้าย</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {checklist.map((item) => (
                <AssistantCheckRow
                  detail={item.detail}
                  key={item.title}
                  ready={item.ready}
                  title={item.title}
                  tone={item.tone}
                />
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-[#2e2e44] bg-[#1a1a2e]/50 p-3 text-xs font-semibold leading-5 text-white/50">
              <p className="m-0 font-bold text-white">แท็กตอนนี้</p>
              <p className="m-0 mt-1">
                ค้นหา {draftStatus.tagCounts.discovery} / ระบบ {draftStatus.tagCounts.engine} / ความปลอดภัย {draftStatus.tagCounts.safety}
              </p>
              {draftStatus.issueMessages.slice(0, 2).map((issue) => (
                <p
                  className={`m-0 mt-2 font-bold ${issue.level === 'danger' ? 'text-red-400' : 'text-amber-400'}`}
                  key={issue.message}
                >
                  {issue.message}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#2e2e44] bg-[#1e1e34]/90 p-5 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Eye className="text-emerald-400" size={18} />
              <h2 className="m-0 text-base font-black text-white">สถานะล่าสุด</h2>
            </div>
            {createdCharacter ? (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-50/80">
                <p className="m-0 font-bold text-emerald-300">สร้างดราฟต์แล้ว</p>
                <p className="mt-1 mb-0">{createdCharacter.name} พร้อมให้ไปตรวจในหน้าโปรไฟล์หรือเปิดแชททดสอบต่อ</p>
                <Link
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-white/90"
                  to={`/characters/${createdCharacter.id}`}
                >
                  เปิดหน้าโปรไฟล์ตัวละคร
                </Link>
              </div>
            ) : (
              <p className="mt-3 mb-0 rounded-xl border border-dashed border-[#2e2e44] bg-[#1a1a2e]/50 p-3 text-sm font-semibold leading-6 text-white/50">
                {draftStatus.note || draftStatus.readinessLabel}
              </p>
            )}
            {error && <p className="mt-3 mb-0 rounded-xl border border-rose-500/20 bg-rose-500/12 p-3 text-sm font-bold text-rose-300">{error}</p>}
          </section>
        </aside>
      </section>
    </main>
  )
}
