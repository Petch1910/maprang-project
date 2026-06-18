import { useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, MessageSquare, Send } from 'lucide-react'
import { safeGetStorageItem, safeSetStorageItem } from '../lib/safeStorage'

interface FaqItem {
  q: string
  a: string
}

interface Ticket {
  id: string
  title: string
  category: string
  status: 'pending' | 'resolved'
  date: string
  content: string
}

const faqs: FaqItem[] = [
  {
    q: 'โทเคนทำงานอย่างไร และเพิ่มยอดได้จากที่ไหน?',
    a: 'โหมดในเครื่องใช้ข้อมูลจำลองเพื่อทดสอบระบบ กระเป๋าโทเคนจะแสดงยอด การใช้งาน และธุรกรรมจากระบบหลังบ้านได้ ส่วนระบบเติมเงินจริงยังอยู่นอกขอบเขตจนกว่าจะเลือกผู้ให้บริการและนโยบายพร้อม',
  },
  {
    q: 'ทำไมบอทบางครั้งตอบสั้นหรือยังไม่ลื่น?',
    a: 'ความยาวคำตอบขึ้นกับผู้ให้บริการ งบคำสั่ง ยอดโทเคน และโหมดในเครื่อง ถ้าต้องการเช็คคุณภาพจริงให้ดูหน้าตรวจระบบและหน้าตรวจคำสั่ง เพื่อดูโมเดล งบคำตอบ บริบท และสถานะผู้ให้บริการ',
  },
  {
    q: 'ตั้งค่าตัวตนผู้เล่นแล้ว AI ใช้จริงไหม?',
    a: 'ใช้จริงในขั้นตอนที่ส่งตัวตนผู้เล่นเข้าเครื่องประกอบคำสั่ง หน้าโปรไฟล์จะบันทึกร่างอัตโนมัติและซิงก์กับระบบหลังบ้านเมื่อเชื่อมต่อได้ เพื่อให้แชทใหม่ดึงบริบทผู้เล่นไปใช้ซ้ำ',
  },
  {
    q: 'รายงานปัญหาจากหน้านี้ไปไหน?',
    a: 'ตอนนี้คำร้องช่วยเหลือเป็นฉบับร่างในเครื่อง เก็บในเบราว์เซอร์เพื่อไม่ให้มีปุ่มหลอก ระบบใช้งานจริงค่อยเชื่อมคิวช่วยเหลือของระบบหลังบ้านภายหลัง',
  },
]

function readTickets() {
  if (typeof window === 'undefined') return []
  try {
    const stored = safeGetStorageItem(window.localStorage, 'maprang:support-tickets:v1')
    return stored ? (JSON.parse(stored) as Ticket[]) : []
  } catch {
    return []
  }
}

function categoryLabel(category: string) {
  if (category === 'bug') return 'แจ้งบั๊ก'
  if (category === 'feature') return 'เสนอฟีเจอร์'
  return 'อื่น ๆ'
}

export function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('bug')
  const [content, setContent] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>(readTickets)

  const handleFAQToggle = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return

    const newTicket: Ticket = {
      id: String(Date.now()),
      title: title.trim(),
      category: categoryLabel(category),
      status: 'pending',
      date: new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' }),
      content: content.trim(),
    }

    const updated = [newTicket, ...tickets]
    setTickets(updated)
    if (typeof window !== 'undefined') {
      safeSetStorageItem(window.localStorage, 'maprang:support-tickets:v1', JSON.stringify(updated))
    }

    setTitle('')
    setContent('')
    setSuccessMsg('บันทึก feedback ในเครื่องแล้ว ทีม dev สามารถใช้ข้อมูลนี้ตรวจซ้ำระหว่าง local QA ได้')
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  return (
    <main className="missai-shell flex flex-col gap-6 text-white">
      <section className="missai-card rounded-2xl p-6">
        <div className="flex items-center gap-2 text-xs font-black tracking-widest text-[#d8b4fe] uppercase">
          <HelpCircle size={16} className="text-emerald-400" />
          ศูนย์ช่วยเหลือ
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-300">
            ใช้ในเครื่องได้
          </span>
        </div>
        <h1 className="font-display mt-3 text-3xl font-black">ช่วยเหลือและส่งฟีดแบ็ก</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/58">
          ศูนย์รวมคำตอบสำหรับการเล่น การสร้างตัวละคร และการทดสอบระบบในเครื่อง ปุ่มส่งรายงานในหน้านี้ทำงานจริงโดยเก็บ ticket ไว้ใน localStorage
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <h2 className="m-0 text-lg font-black text-white">คำถามที่พบบ่อย</h2>
          <div className="flex flex-col gap-2.5">
            {faqs.map((faq, index) => {
              const isOpen = expandedFaq === index
              return (
                <article
                  className={`missai-card overflow-hidden rounded-xl transition ${
                    isOpen ? 'border-[#ac4bff]/50 bg-[#080a1a]/60' : 'hover:border-[#ac4bff]/30'
                  }`}
                  key={faq.q}
                >
                  <button
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    onClick={() => handleFAQToggle(index)}
                    type="button"
                  >
                    <span className="text-sm font-black leading-relaxed text-white">{faq.q}</span>
                    <span className="grid size-7 flex-shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-400">
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ${
                      isOpen ? 'max-h-60 border-t border-white/10 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="m-0 bg-[#080a1a]/40 p-4 text-xs font-semibold leading-6 text-slate-300">
                      {faq.a}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="m-0 text-lg font-black text-white">ส่งรายงานหรือข้อเสนอแนะ</h2>
          <form className="missai-card space-y-4 rounded-2xl p-5" onSubmit={handleSubmit}>
            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-400">หัวข้อ</span>
              <input
                className="missai-input min-h-10 w-full rounded-lg px-3 text-xs font-bold"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="เช่น ปุ่มเปิดฉากไม่ทำงาน หรือ UI มือถือล้น"
                required
                type="text"
                value={title}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-400">หมวดหมู่</span>
              <select
                className="missai-input min-h-10 w-full rounded-lg px-3 text-xs font-bold"
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                <option value="bug">แจ้งปัญหาการใช้งาน</option>
                <option value="feature">เสนอฟีเจอร์</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-400">รายละเอียด</span>
              <textarea
                className="missai-input w-full rounded-lg p-3 text-xs font-bold"
                onChange={(event) => setContent(event.target.value)}
                placeholder="ระบุหน้าที่เจอ ปุ่มที่กด ขั้นตอนก่อนเกิดปัญหา และผลลัพธ์ที่คาดหวัง"
                required
                rows={5}
                value={content}
              />
            </label>

            <button className="missai-button-primary w-full" type="submit">
              <Send size={14} />
              ส่งรายงาน
            </button>
          </form>
        </section>
      </div>

      {tickets.length > 0 && (
        <section className="space-y-4">
          <h2 className="m-0 text-lg font-black text-white">ประวัติ feedback ในเครื่อง</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {tickets.map((ticket) => (
              <article className="missai-card flex flex-col justify-between rounded-xl p-4" key={ticket.id}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-slate-300">
                      {ticket.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">{ticket.date}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-black leading-normal text-white">{ticket.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#9ca3af]">{ticket.content}</p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-[10px] font-bold">
                  {ticket.status === 'pending' ? (
                    <span className="flex items-center gap-1 text-yellow-300">
                      <AlertCircle size={11} /> รอตรวจสอบ
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-300">
                      <MessageSquare size={11} /> แก้ไขแล้ว
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
