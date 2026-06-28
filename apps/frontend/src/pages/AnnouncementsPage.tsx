import { useState } from 'react'
import { Bell, ChevronDown, ChevronUp, Info, Sparkles, Calendar } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  date: string
  category: 'system' | 'feature' | 'event'
  isNew?: boolean
}

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'เปิดตัวเวอร์ชัน 2.5: อัปเกรดโมเดลบทบาทสมมติภาษาไทยลื่นไหลกว่าเดิม!',
    content: 'เราได้ทำการเปลี่ยนผ่าน API การรับส่งข้อความหลักไปใช้ตัวประมวลผลโมเดล DeepSeek-v4-Flash ผ่านทาง API MaxPlus ซึ่งจะทำให้เสียงตัวละครภาษาไทยคงที่และเข้าบริบทตัวตนได้ลึกซึ้งยิ่งขึ้น พร้อมทั้งลดอัตราการถูก AI ตัดตอนคำพูด (truncation) ลงถึง 40%',
    date: '2026-06-15',
    category: 'system',
    isNew: true
  },
  {
    id: '2',
    title: 'อัปเกรดหน้าตาสตูดิโอสร้างตัวละครใหม่',
    content: 'เพิ่มฟีเจอร์ช่วยเหลือผู้ตรวจดราฟต์สดแบบ Realtime ตรวจจับความพร้อมของการ์ด คำนวณค่าคะแนนความสมบูรณ์ และป้องกันไม่ให้แท็กที่อันตรายชนกัน พร้อมทั้งเปิดให้สร้างภาพตัวละครด้วยโมเดลวาดรูป AI ล่าสุดจากห้องสร้างผลงานของระบบ',
    date: '2026-06-10',
    category: 'feature'
  },
  {
    id: '3',
    title: 'ประกาศกิจกรรมประกวดสร้างตัวละคร "จตุรัสสร้างสรรค์ ซีซั่น 2"',
    content: 'ขอเชิญนักสร้างการ์ดบอร์ดร่วมกิจกรรมออกแบบตัวละครโรลเพลย์ในธีม "ไซเบอร์พังก์เรืองแสง (Cyberpunk)" และ "ป่าเวทมนตร์ในจินตนาการ" ชิงเครดิตจำลองสำหรับทดสอบระบบรวมกว่า 50,000 เครดิต ประกวดได้ตั้งแต่วันนี้ถึงสิ้นเดือนมิถุนายนนี้!',
    date: '2026-06-05',
    category: 'event'
  },
  {
    id: '4',
    title: 'ปรับปรุงการจัดเก็บแชทและเพิ่มระบบคีย์ลัด OOC ในประวัติล็อบบี้',
    content: 'ตอนนี้ผู้ใช้สามารถใช้ปุ่มทางลัด OOC ทั้ง 9 แบบในการตั้งค่าโน้ตฉากได้อย่างสะดวก ไม่ว่าจะเป็นการสั่งให้คุมมุมมองบุคคลที่สาม หรือปรับเปลี่ยนสถานการณ์โดยไม่ต้องสลับเข้าสู่โหมดการตั้งค่าหลักของบอร์ดแชท',
    date: '2026-05-28',
    category: 'feature'
  }
]

export function AnnouncementsPage() {
  const [filter, setFilter] = useState<'all' | 'system' | 'feature' | 'event'>('all')
  const [expandedId, setExpandedId] = useState<string | null>('1')

  const filtered = mockAnnouncements.filter(item => filter === 'all' || item.category === filter)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const categoryLabel = (cat: Announcement['category']) => {
    switch (cat) {
      case 'system': return 'ระบบ'
      case 'feature': return 'ฟีเจอร์ใหม่'
      case 'event': return 'กิจกรรม'
    }
  }

  const categoryColor = (cat: Announcement['category']) => {
    switch (cat) {
      case 'system': return 'border-red-500/30 bg-red-500/10 text-red-400'
      case 'feature': return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
      case 'event': return 'border-yellow-500/30 bg-yellow-500/10 text-[#f9c86d]'
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header Banner */}
      <section className="missai-card flex flex-col gap-3 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-bold text-[#d8b4fe]">
          <Bell size={16} className="text-[#ac4bff]" />
          <span className="font-black">ข่าวสารระบบ</span>
          <span className="rounded-full border border-[#ac4bff]/30 bg-[#ac4bff]/15 px-2.5 py-0.5 text-[10px] text-[#d9b3ff]">
            อัปเดตสดใหม่
          </span>
        </div>
        <h1 className="font-display m-0 text-2xl font-black text-white sm:text-3xl">ประกาศ & ข่าวสารระบบ</h1>
        <p className="m-0 text-sm font-semibold leading-6 text-[#9ca3af]">
          ติดตามข่าวสารล่าสุด ฟีเจอร์ที่เพิ่มเข้ามา และประกาศกิจกรรมต่าง ๆ ของแพลตฟอร์ม Maprang AI
        </p>
      </section>

      {/* Tabs Filter */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto [scrollbar-width:none]">
        {(['all', 'system', 'feature', 'event'] as const).map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => setFilter(cat)}
            className={`min-h-9 px-4 rounded-full text-xs font-black transition whitespace-nowrap border ${
              filter === cat
                ? 'bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] border-[#ac4bff]/50 text-white missai-glow'
                : 'border-white/10 bg-[#080a1a]/60 text-slate-400 hover:border-[#ac4bff]/40 hover:text-white'
            }`}
          >
            {cat === 'all' ? 'ประกาศทั้งหมด' : cat === 'system' ? 'ประกาศจากระบบ' : cat === 'feature' ? 'ฟีเจอร์ใหม่' : 'กิจกรรมพิเศษ'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id
          return (
            <div
              key={item.id}
              onClick={() => toggleExpand(item.id)}
              className={`missai-card group overflow-hidden rounded-xl transition-all duration-300 cursor-pointer ${
                isExpanded
                  ? 'border-[#ac4bff]/50 bg-[#080a1a]/60'
                  : 'hover:border-[#ac4bff]/30'
              }`}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${categoryColor(item.category)}`}>
                      {categoryLabel(item.category)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Calendar size={12} />
                      {item.date}
                    </span>
                    {item.isNew && (
                      <span className="flex items-center gap-0.5 rounded bg-emerald-500 px-1 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider animate-pulse">
                        <Sparkles size={10} /> NEW
                      </span>
                    )}
                  </div>
                  <h3 className={`text-base font-black leading-6 transition ${isExpanded ? 'text-[#d8b4fe]' : 'text-white group-hover:text-[#d8b4fe]'}`}>
                    {item.title}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
                  title={isExpanded ? 'ย่อรายละเอียด' : 'ขยายรายละเอียด'}
                  className={`mt-1 grid size-7 place-items-center rounded-lg bg-white/5 border border-white/10 text-slate-400 transition group-hover:text-white ${
                    isExpanded ? 'bg-[#ac4bff]/20 text-[#d8b4fe] border-[#ac4bff]/40' : ''
                  }`}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Collapsible Content */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-96 opacity-100 border-t border-white/10' : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                <div className="p-4 text-sm leading-6 text-slate-300 font-medium whitespace-pre-line bg-[#080a1a]/40">
                  {item.content}
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="missai-card flex flex-col items-center justify-center rounded-2xl border-dashed py-16 text-center text-slate-500">
            <Info size={40} className="mb-3 opacity-30 text-purple-400" />
            <p className="m-0 text-sm font-black text-white/55">ไม่พบประกาศข่าวสารที่ตรงกับหมวดหมู่นี้</p>
          </div>
        )}
      </div>
    </main>
  )
}
