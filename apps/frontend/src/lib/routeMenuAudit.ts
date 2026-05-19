export type RouteMenuAuditStatus = 'ready' | 'guarded' | 'needs-staging' | 'future'

export type RouteMenuAuditRow = {
  area: string
  route: string
  control: string
  result: string
  disabledReason: string
  emptyState: string
  status: RouteMenuAuditStatus
}

export const routeMenuAuditRows: RouteMenuAuditRow[] = [
  {
    area: 'สำรวจ / หน้าแรก',
    route: '/',
    control: 'ค้นหา, หมวดหมู่, การ์ดตัวละคร, เล่นต่อ, ปุ่มสร้างตัวละคร, เมนูล่างมือถือ',
    result: 'ค้นหาและเปิดหน้าตัวละครหรือแชทเดิมได้จริง ปุ่มสร้างไปที่หน้าสร้างตัวละคร และมือถือมีเมนูไปหน้าหลักครบ',
    disabledReason: 'ไม่มีปุ่มหลักที่ควร disabled ยกเว้นข้อมูลกำลังโหลด',
    emptyState: 'ถ้าโหลดตัวละครไม่ได้จะแสดงข้อความให้เช็คการเชื่อมต่อ และยังมี demo card กันหน้าว่าง',
    status: 'ready',
  },
  {
    area: 'หน้าโปรไฟล์ตัวละคร',
    route: '/characters/:characterId',
    control: 'สัญญาความสัมพันธ์ (Relationship Contract), เริ่มแชท, คัดลอกลิงก์, รายงาน',
    result: 'เลือก seed แล้วปุ่มเริ่มแชทพาไป /chat พร้อม relationship_seed, รายงานเปิด dialog',
    disabledReason: 'ปุ่มรายงาน disabled ระหว่างส่งรายงานหรือยังไม่มีข้อมูลตัวละคร',
    emptyState: 'ถ้าไม่พบตัวละครจะแสดง note โหลด/ผิดพลาดแทนหน้าว่าง',
    status: 'ready',
  },
  {
    area: 'ห้องแชท',
    route: '/chat, /chat/:chatId',
    control: 'ช่องพิมพ์, ส่งข้อความ, คำแนะนำเริ่มคุย, แถบเครื่องมือ, อีเวนต์ฉาก, โหมดอ่าน, ปุ่มรายงาน, ปุ่มโปรไฟล์',
    result: 'เปิดห้องแชทได้ มีบันทึกร่างอัตโนมัติ, คำแนะนำเริ่มคุย, โหมดอ่านเปลี่ยนพื้นที่อ่านข้อความจริง, หน้าต่างรายงาน, ทางไปกระเป๋า/โปรไฟล์ และ UI ฉากที่รออยู่',
    disabledReason: 'ส่งข้อความ disabled เมื่อข้อความว่าง, กำลัง streaming, หรือโทเคนไม่พอ',
    emptyState: 'ห้องใหม่มีบทนำและคำทักทายแทนหน้าว่าง ส่วนแชทเดิมโหลดจาก QA seed ได้',
    status: 'ready',
  },
  {
    area: 'แถบแชท',
    route: '/chat',
    control: 'เมนูสามจุดของแชท: แก้ไขแชท, ปักหมุดแชท/ถอนหมุดแชท, จัดเก็บแชท, เลือก, ลบแชท',
    result:
      'เมนูเปิด/ปิดได้ด้วยปุ่ม, Escape, คลิกข้างนอก รายการท้ายแถบเปิดขึ้นด้านบนไม่โดนตัด เลือกจะเข้าสู่โหมดจัดการหลายแชท และทุกคำสั่งมีผลจริงหรือ confirm ก่อนลบ',
    disabledReason: 'ไม่มี disabled ถาวร คำสั่งลบใช้ confirm เพื่อกันพลาด',
    emptyState: 'ถ้ายังไม่มีแชทจะแจ้งว่ายังไม่มีแชทที่บันทึกไว้',
    status: 'ready',
  },
  {
    area: 'สร้างตัวละคร',
    route: '/create',
    control: 'AI สร้างรูป+เนื้อหา, อัปโหลด, ลิงก์รูป, ฟอร์มหลัก, ตัวช่วยเช็กแท็ก, ตัวลองบท, ปุ่มเผยแพร่',
    result: 'สร้างร่างได้จริง ถ้าผู้ให้บริการรูปภาพยังไม่ตั้งจะใช้ภาพตัวอย่างแทนพร้อมบอกสถานะ',
    disabledReason: 'ปุ่มเผยแพร่ disabled เมื่อชื่อหรือพรอมป์หลักว่าง, แท็กชนระดับอันตราย, หรือกำลังบันทึก',
    emptyState: 'มีบันทึกร่างอัตโนมัติและแผงความพร้อมบอกช่องที่ยังขาด',
    status: 'ready',
  },
  {
    area: 'กล่องแชท',
    route: '/chats',
    control: 'ค้นหา, ตัวกรองทั้งหมด/ปักหมุด/มีฉาก/จัดเก็บ, เปิดแชท, เมนูสามจุด, เลือกหลายแชท, กู้คืนแชท',
    result:
      'รายการแชทเปิดกลับไป /chat/:chatId ได้ เมนูแก้ชื่อ/ปักหมุดแชท/จัดเก็บแชท/ลบแชทมีผลจริง โหมดเลือกหลายแชทรองรับจัดเก็บ/กู้คืน/ลบหลายรายการ และถูก smoke บน desktop/mobile แล้ว',
    disabledReason: 'คำสั่งกู้คืน/ลบ/แก้ชื่อ/จัดการหลายรายการ disabled เฉพาะระหว่างกำลังบันทึก action นั้นหรือยังไม่ได้เลือกแชท',
    emptyState: 'แต่ละตัวกรองมีข้อความบอกบริบท เช่น ยังไม่มีแชทจัดเก็บหรือยังไม่มีแชทปักหมุด',
    status: 'ready',
  },
  {
    area: 'กล่องอีเวนต์',
    route: '/events',
    control: 'รายการฉากที่รออยู่แบบจัดกลุ่มตามฉาก พร้อมแชทย่อยแต่ละห้อง',
    result: 'กดแชทย่อยในกลุ่ม event แล้วไปยังแชทที่มีฉากรออยู่',
    disabledReason: 'อีเวนต์หมดอายุหรือไม่มีแชท จะไม่แสดงเป็นคำสั่งหลัก',
    emptyState: 'แสดงข้อความว่ายังไม่มีฉากสำคัญรออยู่',
    status: 'ready',
  },
  {
    area: 'โปรไฟล์ / ตัวตนผู้เล่น',
    route: '/profile',
    control: 'ตัวตนผู้เล่น, ตั้งค่าเนื้อหา, ตัวละครที่สร้าง/ชื่นชอบ',
    result: 'เซฟตัวตนผู้เล่นลงบัญชีและร่างในเครื่อง พร้อมใช้เป็นบริบทในพรอมป์แชท ส่วนโหมดเนื้อหาบันทึกผ่าน backend',
    disabledReason: 'ปุ่มบันทึก disabled เฉพาะตอนกำลังบันทึกหรือข้อมูลไม่ครบ',
    emptyState: 'ถ้ายังไม่มีตัวละคร/รายการโปรดจะแสดงคำแนะนำให้เริ่มสร้างหรือสำรวจ',
    status: 'ready',
  },
  {
    area: 'กระเป๋าโทเคน',
    route: '/wallet',
    control: 'รีเฟรช, คีย์แอดมิน, เพิ่ม/หักโทเคน, ประวัติใช้งาน, ประวัติธุรกรรม, ต้นทุนแยกโมเดล, การใช้ 7 วัน',
    result: 'โหลดยอดโทเคน, ธุรกรรม, ต้นทุนรวม, ต้นทุนแยกโมเดล, กราฟ 7 วัน และคาดการณ์รอบแชทที่เหลือจาก backend; QA seed มีข้อมูลให้ตรวจทันที',
    disabledReason: 'เพิ่ม/หักโทเคน disabled ถ้าไม่มี ADMIN_API_KEY, ไม่มีสรุปผู้ใช้, จำนวนไม่ถูกต้อง, หรือกำลังส่ง',
    emptyState: 'ถ้ายังไม่มีธุรกรรม/การใช้งาน จะบอกว่ายังไม่มีรายการ ไม่ปล่อยช่องว่าง',
    status: 'ready',
  },
  {
    area: 'ดูแลรายงาน',
    route: '/moderation',
    control: 'ADMIN_API_KEY, ตัวกรอง, ค้นหา, เปิดต้นทาง, ซ่อนตัวละคร, จัดเก็บข้อความ, ปรับสถานะ, audit log',
    result: 'คิวรายงานและ audit log โหลดจาก backend; QA seed มีรายงานจำลองให้เช็ค',
    disabledReason: 'คำสั่งแอดมิน disabled ระหว่างอัปเดต, รายงาน resolved แล้ว, หรือข้อความถูกจัดเก็บแล้ว',
    emptyState: 'ถ้าไม่มีรายงานจะบอกวิธีทดสอบ flow รายงาน',
    status: 'guarded',
  },
  {
    area: 'ตรวจระบบผู้ดูแล',
    route: '/admin/health',
    control: 'รีเฟรชสถานะ, checklist deploy, ตรวจเส้นทาง/เมนู, checklist staging, ลิงก์ตรวจพรอมป์, ลิงก์ทดสอบคุณภาพ',
    result: 'เห็นความพร้อมของ DB, AI, Supabase, signed storage, CORS, route audit และขั้นต่อไปของแต่ละ blocker ในหน้าเดียว พร้อมไปตัวตรวจพรอมป์และชุดทดสอบอัตโนมัติได้',
    disabledReason: 'ไม่มี disabled ถาวร รีเฟรช disabled ได้เฉพาะตอนเรียกข้อมูลในอนาคต',
    emptyState: 'ถ้า backend ล่มจะแสดงสถานะไม่พร้อมและรายการที่ต้องแก้',
    status: 'ready',
  },
  {
    area: 'ตัวตรวจพรอมป์',
    route: '/admin/prompt-inspector',
    control: 'ADMIN_API_KEY, เลือกตัวละคร, ข้อความปัจจุบัน, ข้อความก่อนหน้า, note runtime, persona override, ตรวจพรอมป์, คัดลอกพรอมป์ที่ปิดข้อมูลลับ',
    result:
      'เรียก admin API เพื่อตรวจ snapshot พรอมป์แบบปิดข้อมูลลับ, งบโทเคนรายส่วน, lore ที่ดึงมาใช้, คำเตือน และ diff พรอมป์ โดยไม่ยิงโมเดลจริง',
    disabledReason: 'ปุ่มตรวจ disabled เมื่อไม่มี ADMIN_API_KEY, ยังไม่เลือกตัวละคร, ข้อความว่าง หรือกำลังตรวจอยู่',
    emptyState: 'แสดงสถานะยังไม่ได้ตรวจพรอมป์และบอกให้เลือกตัวละคร/ข้อความก่อนตรวจ',
    status: 'guarded',
  },
  {
    area: 'ชุดทดสอบอัตโนมัติ',
    route: '/admin/evals',
    control: 'ADMIN_API_KEY, รัน eval, accordion ชุดทดสอบ, ผลเช็ก, สรุปจุดไม่ผ่าน',
    result:
      'เรียก admin API เพื่อรันชุด roleplay eval แบบผลซ้ำได้ ตรวจ prompt-control, lore, ความต่อเนื่องของความสัมพันธ์/ฉาก และงบโทเคน โดยไม่ยิงโมเดลจริง',
    disabledReason: 'ปุ่มรัน eval disabled เมื่อไม่มี ADMIN_API_KEY หรือกำลังรัน eval อยู่',
    emptyState: 'แสดงสถานะยังไม่ได้รัน eval และอธิบายว่าจะเห็นชุดทดสอบ/ผลเช็ก/จุดไม่ผ่านหลังรัน',
    status: 'guarded',
  },
  {
    area: 'Staging จริง',
    route: 'external staging domain',
    control: 'Supabase จริง, Render/Railway backend, frontend domain, CORS จริง, e2e smoke',
    result: 'ต้อง deploy staging ก่อน production และรัน migration/smoke กับ DB staging จริง',
    disabledReason: 'ยังไม่ใช่ปุ่มใน local app เพราะต้องใช้บัญชีและ domain จริง',
    emptyState: 'ใช้ STAGING_RUNBOOK.md และ checklist ใน /admin/health เป็นตัวบอกงานที่ค้าง',
    status: 'needs-staging',
  },
]

export function routeMenuAuditStatusLabel(status: RouteMenuAuditStatus) {
  const labels: Record<RouteMenuAuditStatus, string> = {
    ready: 'พร้อมทดสอบ',
    guarded: 'พร้อมแบบมีสิทธิ์',
    'needs-staging': 'รอ staging จริง',
    future: 'เผื่ออนาคต',
  }
  return labels[status]
}
