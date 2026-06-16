import { useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp, Send, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react'
import { safeGetStorageItem, safeSetStorageItem } from '../lib/safeStorage'

interface FaqItem {
  q: string
  a: string
}

const faqs: FaqItem[] = [
  {
    q: 'โทเคนทำงานอย่างไร และจะได้รับโทเคนเพิ่มได้อย่างไร?',
    a: 'ผู้ใช้ทุกคนจะเริ่มต้นด้วยโควตาโทเคนจำลองสำหรับใช้งานแชทกับตัวละคร AI โดยระบบจะหักโทเคนตามจำนวนข้อความที่โต้ตอบ หากโทเคนของคุณต่ำกว่าที่กำหนด คุณสามารถทดสอบเพิ่มยอดธุรกรรมจำลองหรือคลิกปุ่มรับโทเคนโบนัสเพื่อเพิ่มโทเคนในการทดสอบได้ทันทีในหน้ากระเป๋าเงิน'
  },
  {
    q: 'ทำไม AI ถึงมีการตัดคำหรือตอบไม่จบลูปประวัติ?',
    a: 'เนื่องจากระบบโรลเพลย์มีการตั้งค่าความยาวการตอบของบทบาทจำกัดเพื่อความปลอดภัย หากบอทเริ่มตัดคำ แนะนำให้ใช้คำสั่งลัด OOC ในโน้ตฉาก เช่น "[OOC: โปรดตอบบทสั้นลง]" หรือกดปุ่ม "รีเจนเนอเรทใหม่" เพื่อให้โมเดลตอบกลับอีกครั้ง'
  },
  {
    q: 'ฉันสามารถตั้งค่าบอทบทบาทสมมติให้เป็นส่วนตัวเฉพาะฉันได้หรือไม่?',
    a: 'ได้! เมื่อคุณสร้างบอทผ่านทางสตูดิโอผู้สร้าง คุณสามารถเลือกตั้งค่าการมองเห็นเป็น "ส่วนตัว" ได้ โดยตัวละครนี้จะแสดงเฉพาะในรายการผลงานของคุณ และผู้อื่นจะไม่สามารถเปิดดูหรือแชทด้วยได้'
  },
  {
    q: 'ระบบหน้าบ้านต่อสาย API เข้ากับบอทโมเดลใดในหลังบ้าน?',
    a: 'ในสเตจจิงและโปรดักชันปกติ ระบบหลังบ้านจะต่อสายเชื่อมต่อเข้ากับ API MaxPlus สำหรับให้บริการโมเดล DeepSeek-v4-Flash ซึ่งรองรับภาษาไทยได้แม่นยำและตอบกลับได้รวดเร็วอย่างเป็นธรรมชาติ'
  }
]

interface Ticket {
  id: string
  title: string
  category: string
  status: 'pending' | 'resolved'
  date: string
  content: string
}

export function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('bug')
  const [content, setContent] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = safeGetStorageItem(window.localStorage, 'maprang:support-tickets:v1')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const handleFAQToggle = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    const newTicket: Ticket = {
      id: String(Date.now()),
      title: title.trim(),
      category: category === 'bug' ? 'แจ้งปัญหา/บั๊ก' : category === 'feature' ? 'เสนอแนะฟีเจอร์' : 'อื่นๆ',
      status: 'pending',
      date: new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' }),
      content: content.trim()
    }

    const updated = [newTicket, ...tickets]
    setTickets(updated)
    if (typeof window !== 'undefined') {
      safeSetStorageItem(window.localStorage, 'maprang:support-tickets:v1', JSON.stringify(updated))
    }

    setTitle('')
    setContent('')
    setSuccessMsg('ส่งคำร้องรายงานฟีดแบ็กสำเร็จ! ขอบคุณสำหรับข้อเสนอแนะ')
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header Banner */}
      <section className="missai-card flex flex-col gap-3 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-bold text-[#d8b4fe]">
          <HelpCircle size={16} className="text-emerald-400" />
          <span className="font-black">ศูนย์ช่วยเหลือและบริการ</span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-400">
            ติดต่อผู้ดูแล
          </span>
        </div>
        <h1 className="font-display m-0 text-2xl font-black text-white sm:text-3xl">ช่วยเหลือ & ส่งฟีดแบ็ก</h1>
        <p className="m-0 text-sm font-semibold leading-6 text-[#9ca3af]">
          ค้นหาคำตอบสำหรับข้อสงสัยทั่วไป หรือส่งเรื่องรายงานบั๊กและข้อเสนอแนะถึงทีมงานพัฒนา Maprang AI
        </p>
      </section>

      {/* Grid Layout for FAQ and Feedback Form */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left Column: FAQ Section */}
        <section className="space-y-4">
          <h2 className="m-0 text-lg font-black text-white flex items-center gap-2">
            <span>❓</span> คำถามที่พบบ่อย (FAQ)
          </h2>
          <div className="flex flex-col gap-2.5">
            {faqs.map((faq, index) => {
              const isOpen = expandedFaq === index
              return (
                <div
                  key={index}
                  onClick={() => handleFAQToggle(index)}
                  className={`missai-card overflow-hidden rounded-xl transition cursor-pointer ${
                    isOpen ? 'border-[#ac4bff]/50 bg-[#080a1a]/60' : 'hover:border-[#ac4bff]/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 p-4">
                    <span className="text-sm font-black text-white leading-relaxed">{faq.q}</span>
                    <button
                      type="button"
                      aria-label={isOpen ? 'ย่อคำตอบ' : 'แสดงคำตอบ'}
                      title={isOpen ? 'ย่อคำตอบ' : 'แสดงคำตอบ'}
                      className="grid size-7 flex-shrink-0 place-items-center rounded-lg bg-white/5 border border-white/10 text-slate-400 group-hover:text-white"
                    >
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                  <div
                    className={`transition-all duration-300 ${
                      isOpen ? 'max-h-60 border-t border-white/10 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    <p className="m-0 p-4 text-xs font-semibold leading-6 text-slate-300 bg-[#080a1a]/40">
                      {faq.a}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right Column: Feedback Form */}
        <section className="space-y-4">
          <h2 className="m-0 text-lg font-black text-white flex items-center gap-2">
            <span>✉️</span> ส่งรายงานและข้อแนะนำ
          </h2>
          <form onSubmit={handleSubmit} className="missai-card rounded-2xl p-5 space-y-4">
            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5">หัวข้อคำร้องเรียน</label>
              <input
                type="text"
                placeholder="ระบุหัวข้อสั้นๆ เช่น ไม่พบข้อมูล หรือ คีย์ใช้ไม่ได้"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-white/10 bg-[#080a1a]/60 px-3 text-xs font-bold text-white outline-none focus:border-[#ac4bff] focus:ring-1 focus:ring-[#ac4bff]/25"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5">หมวดหมู่</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-white/10 bg-[#080a1a]/60 px-3 text-xs font-bold text-white outline-none focus:border-[#ac4bff]"
              >
                <option value="bug">แจ้งปัญหาการใช้งาน (Bug/Crash)</option>
                <option value="feature">เสนอแนะแนวทางพัฒนา (Feature Request)</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5">รายละเอียดความต้องการ</label>
              <textarea
                placeholder="กรอกข้อมูลปัญหา ขั้นตอนที่เกิด หรือข้อเสนอแนะนำ เพื่อช่วยให้ผู้ดูแลระบบตรวจสอบได้ไวที่สุด"
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#080a1a]/60 p-3 text-xs font-bold text-white outline-none focus:border-[#ac4bff] focus:ring-1 focus:ring-[#ac4bff]/25"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-10 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] text-xs font-black text-white hover:brightness-110 transition missai-glow"
            >
              <Send size={13} />
              <span>ส่งคำรายงาน</span>
            </button>
          </form>
        </section>
      </div>

      {/* Submitted Tickets Section */}
      {tickets.length > 0 && (
        <section className="mt-4 space-y-4">
          <h2 className="m-0 text-lg font-black text-white flex items-center gap-2">
            <span>📋</span> ประวัติการรายงานฟีดแบ็กของคุณ
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="missai-card flex flex-col justify-between rounded-xl p-4 space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
                      {ticket.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">{ticket.date}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-black text-white leading-normal">{ticket.title}</h3>
                  <p className="mt-1 text-xs text-[#9ca3af] leading-relaxed">{ticket.content}</p>
                </div>
                <div className="flex items-center gap-1.5 border-t border-white/10 pt-2 text-[10px] font-bold">
                  {ticket.status === 'pending' ? (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertCircle size={11} /> กำลังตรวจสอบ
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <MessageSquare size={11} /> แก้ไขแล้ว
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
