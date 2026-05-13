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
    area: 'Explore / Home',
    route: '/',
    control: 'ค้นหา, หมวดหมู่, การ์ดตัวละคร, Continue Chatting, ปุ่มสร้างตัวละคร, mobile bottom nav',
    result: 'ค้นหาและเปิดหน้า Lobby หรือแชทเดิมได้จริง ปุ่มสร้างไปที่ Creator Studio และมือถือมี nav ไปหน้าหลักครบ',
    disabledReason: 'ไม่มีปุ่มหลักที่ควร disabled ยกเว้นข้อมูลกำลังโหลด',
    emptyState: 'ถ้าโหลดตัวละครไม่ได้จะแสดงข้อความให้เช็คการเชื่อมต่อ และยังมี demo card กันหน้าว่าง',
    status: 'ready',
  },
  {
    area: 'Character Lobby',
    route: '/characters/:characterId',
    control: 'Relationship Contract, เริ่มแชท, คัดลอกลิงก์, รายงาน',
    result: 'เลือก seed แล้วปุ่มเริ่มแชทพาไป /chat พร้อม relationship_seed, รายงานเปิด dialog',
    disabledReason: 'ปุ่มรายงาน disabled ระหว่างส่งรายงานหรือยังไม่มีข้อมูลตัวละคร',
    emptyState: 'ถ้าไม่พบตัวละครจะแสดง note โหลด/ผิดพลาดแทนหน้าว่าง',
    status: 'ready',
  },
  {
    area: 'Chat Room',
    route: '/chat, /chat/:chatId',
    control: 'composer, ส่งข้อความ, quick-start, tool tray, Scene event, โหมดอ่าน, ปุ่มรายงาน, ปุ่มโปรไฟล์',
    result: 'เปิดห้องแชทได้ มี draft autosave, quick-start สำหรับเริ่มคุย, โหมดอ่านเปลี่ยนพื้นที่อ่านข้อความจริง, report dialog, wallet/profile navigation และ pending scene UI',
    disabledReason: 'ส่งข้อความ disabled เมื่อข้อความว่าง, กำลัง streaming, หรือ token ไม่พอ',
    emptyState: 'ห้องใหม่มี intro และ greeting แทนหน้าว่าง ส่วน chat เดิมโหลดจาก QA seed ได้',
    status: 'ready',
  },
  {
    area: 'Chat Sidebar',
    route: '/chat',
    control: 'เมนูสามจุดของแชท: แก้ไขแชท, ปักหมุดแชท/ถอนหมุดแชท, จัดเก็บแชท, เลือก, ลบแชท',
    result:
      'เมนูเปิด/ปิดได้ด้วยปุ่ม, Escape, คลิกข้างนอก รายการท้ายแถบเปิดขึ้นด้านบนไม่โดนตัด เลือกจะเข้าสู่โหมดจัดการหลายแชท และทุกคำสั่งมีผลจริงหรือ confirm ก่อนลบ',
    disabledReason: 'ไม่มี disabled ถาวร คำสั่งลบใช้ confirm เพื่อกันพลาด',
    emptyState: 'ถ้ายังไม่มีแชทจะแจ้งว่ายังไม่มีแชทที่บันทึกไว้',
    status: 'ready',
  },
  {
    area: 'Creator Studio',
    route: '/create',
    control: 'AI สร้างรูป+เนื้อหา, อัปโหลด, ลิงก์รูป, ฟอร์มหลัก, tag resolver, preview simulator, submit',
    result: 'สร้าง draft ได้จริง ถ้า image provider ยังไม่ตั้งจะ fallback เป็นภาพตัวอย่างพร้อมบอกสถานะ',
    disabledReason: 'submit disabled เมื่อชื่อหรือ system prompt ว่าง, tag danger conflict, หรือกำลังบันทึก',
    emptyState: 'มี draft autosave และ readiness panel บอกช่องที่ยังขาด',
    status: 'ready',
  },
  {
    area: 'My Chats',
    route: '/chats',
    control: 'ค้นหา, filter ทั้งหมด/ปักหมุด/มีฉาก/จัดเก็บ, เปิดแชท, เมนูสามจุด, เลือกหลายแชท, กู้คืนแชท',
    result:
      'รายการแชทเปิดกลับไป /chat/:chatId ได้ เมนูแก้ชื่อ/ปักหมุดแชท/จัดเก็บแชท/ลบแชทมีผลจริง โหมดเลือกหลายแชทรองรับ bulk archive/restore/delete และถูก smoke บน desktop/mobile แล้ว',
    disabledReason: 'คำสั่งกู้คืน/ลบ/แก้ชื่อ/จัดการหลายรายการ disabled เฉพาะระหว่างกำลังบันทึก action นั้นหรือยังไม่ได้เลือกแชท',
    emptyState: 'แต่ละ filter มีข้อความบอกบริบท เช่น ยังไม่มีแชทจัดเก็บหรือยังไม่มีแชทปักหมุด',
    status: 'ready',
  },
  {
    area: 'Events Inbox',
    route: '/events',
    control: 'รายการ pending scene แบบจัดกลุ่มตามฉาก พร้อมแชทย่อยแต่ละห้อง',
    result: 'กดแชทย่อยในกลุ่ม event แล้วไปยังแชทที่มีฉากรออยู่',
    disabledReason: 'event หมดอายุ/ไม่มี chat จะไม่แสดงเป็น action หลัก',
    emptyState: 'แสดงข้อความว่ายังไม่มีฉากสำคัญรออยู่',
    status: 'ready',
  },
  {
    area: 'Profile / Persona',
    route: '/profile',
    control: 'User Persona, content setting, created/favorite characters',
    result: 'เซฟ persona ลงบัญชีและ local draft พร้อมใช้เป็นบริบทใน chat prompt ส่วน content mode บันทึกผ่าน backend',
    disabledReason: 'ปุ่มบันทึก disabled เฉพาะตอนกำลังบันทึกหรือข้อมูลไม่ครบ',
    emptyState: 'ถ้ายังไม่มีตัวละคร/รายการโปรดจะแสดงคำแนะนำให้เริ่มสร้างหรือสำรวจ',
    status: 'ready',
  },
  {
    area: 'Wallet',
    route: '/wallet',
    control: 'รีเฟรช, admin key, เพิ่ม/หัก token, usage history, transaction history',
    result: 'โหลดยอด token และธุรกรรมจาก backend; QA seed มีข้อมูลให้ตรวจทันที',
    disabledReason: 'เพิ่ม/หัก token disabled ถ้าไม่มี ADMIN_API_KEY, ไม่มี user summary, จำนวนไม่ถูกต้อง, หรือกำลังส่ง',
    emptyState: 'ถ้ายังไม่มีธุรกรรม/usage จะบอกว่ายังไม่มีรายการ ไม่ปล่อยช่องว่าง',
    status: 'ready',
  },
  {
    area: 'Moderation',
    route: '/moderation',
    control: 'ADMIN_API_KEY, filter, search, เปิดต้นทาง, ซ่อนตัวละคร, archive message, ปรับสถานะ, audit log',
    result: 'คิวรายงานและ audit log โหลดจาก backend; QA seed มี report จำลองให้เช็ค',
    disabledReason: 'คำสั่ง admin disabled ระหว่างอัปเดต, report resolved แล้ว, หรือ message ถูก archive แล้ว',
    emptyState: 'ถ้าไม่มีรายงานจะบอกวิธีทดสอบ report flow',
    status: 'guarded',
  },
  {
    area: 'Admin Health',
    route: '/admin/health',
    control: 'รีเฟรช health, deploy checklist, route/menu audit, staging checklist, ลิงก์ตรวจพรอมป์, ลิงก์ทดสอบคุณภาพ',
    result: 'เห็น readiness ของ DB, AI, Supabase, signed storage, CORS และ route audit ในหน้าเดียว พร้อมไป Prompt Inspector และ Automated Evals ได้',
    disabledReason: 'ไม่มี disabled ถาวร รีเฟรช disabled ได้เฉพาะตอนเรียกข้อมูลในอนาคต',
    emptyState: 'ถ้า backend ล่มจะแสดงสถานะไม่พร้อมและรายการที่ต้องแก้',
    status: 'ready',
  },
  {
    area: 'Prompt Inspector',
    route: '/admin/prompt-inspector',
    control: 'ADMIN_API_KEY, เลือกตัวละคร, ข้อความปัจจุบัน, ข้อความก่อนหน้า, runtime note, persona override, ตรวจพรอมป์, คัดลอก redacted prompt',
    result:
      'เรียก admin API เพื่อตรวจ redacted prompt snapshot, section token budget, lore retrieval, warnings และ prompt diff โดยไม่ยิงโมเดลจริง',
    disabledReason: 'ปุ่มตรวจ disabled เมื่อไม่มี ADMIN_API_KEY, ยังไม่เลือกตัวละคร, ข้อความว่าง หรือกำลังตรวจอยู่',
    emptyState: 'แสดงสถานะยังไม่ได้ตรวจพรอมป์และบอกให้เลือกตัวละคร/ข้อความก่อนตรวจ',
    status: 'guarded',
  },
  {
    area: 'Automated Evals',
    route: '/admin/evals',
    control: 'ADMIN_API_KEY, รัน eval, scenario accordion, check result, failure summary',
    result:
      'เรียก admin API เพื่อรัน deterministic golden roleplay evals ตรวจ prompt-control, lore, relationship/scene continuity และ token budget โดยไม่ยิงโมเดลจริง',
    disabledReason: 'ปุ่มรัน eval disabled เมื่อไม่มี ADMIN_API_KEY หรือกำลังรัน eval อยู่',
    emptyState: 'แสดงสถานะยังไม่ได้รัน eval และอธิบายว่าจะเห็น scenario/check/failure หลังรัน',
    status: 'guarded',
  },
  {
    area: 'Staging',
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
