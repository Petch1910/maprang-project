# ทิศทาง UI/UX

อัปเดตล่าสุด: 2026-05-25

## ทิศทางผลิตภัณฑ์

Maprang ควรรู้สึกคุ้นมือสำหรับผู้ใช้ character chat ภาษาไทย แต่เพิ่มระบบ relationship และ scene ที่ลึกกว่าเดิม

## หลักการสำคัญ

- ออกแบบมือถือก่อนเสมอ.
- หน้าตาโทนมืดเป็นหลัก พร้อมภาษาภาพที่ไปทางเดียวกันทั้งเว็บ.
- Route ที่เป็นประสบการณ์หลักและมี shell เฉพาะตัว เช่น Explore และ Chat ต้อง render แบบ immersive ไม่ถูก global navigation ครอบซ้ำ.
- การนำทางหลักเป็นภาษาไทย.
- เมนูต้องครบและกดแล้วเกิดผลจริง ไม่ใช่องค์ประกอบตกแต่ง.
- สถานะว่างต้องบอกว่าผู้ใช้ควรทำอะไรต่อ.
- Chat ต้องรู้สึกธรรมชาติและคุ้นมือ ก่อนที่ระบบขั้นสูงจะปรากฏ.
- ระบบ Relationship และ Scene ควรรู้สึกเหมือน feedback ชั้นเกม ไม่ใช่ความรกบนหน้าจอ.

## พื้นผิวหลัก

- Explore: สำรวจตัวละคร, เล่นต่อจากแชทเดิม, และแถวตัวละครที่สแกนง่าย.
- Character Lobby: เลือกจุดเริ่มต้นความสัมพันธ์ก่อนเข้าแชท.
- Chat Room: แชทปกติต้องมาก่อน และโหมดฉากแสดงเฉพาะเมื่อเกี่ยวข้อง.
- Creator Studio: ลำดับสร้างที่คุ้นแบบ Khuiai พร้อมบุคลิกชัด, คำเตือนแท็ก, AI ร่างรูป/เนื้อหา, และตัวลองบท.
- My Chats: จัดการแชทจริงด้วยแก้ชื่อ, ปักหมุด/ถอนหมุด, จัดเก็บ, ลบ, และ report paths.
- Wallet: ยอดโทเคน, ประวัติใช้งาน, และ guard สำหรับการปรับโทเคนโดยผู้ดูแล.
- Admin Health: deploy blockers ด้วยภาษาที่อ่านง่าย.
- Prompt Inspector: เครื่องมือเฉพาะผู้ดูแลสำหรับดูภาพรวม/ส่วนต่างของพรอมป์ที่ปิดข้อมูลลับแล้ว เพื่อ debug ความลึกของคำตอบ, การดึงคลังความรู้, และบริบทที่เลื่อนเพี้ยน.
- Automated Evals: ชุดทดสอบคุณภาพแบบผลซ้ำได้สำหรับผู้ดูแล เพื่อจับ regression ของพรอมป์/บริบทก่อน staging.

## ข้อกังวล UX ปัจจุบัน (UX concern)

ผู้ใช้ย้ำหลายครั้งว่า UI ต้องรู้สึกสมบูรณ์และเป็นธรรมชาติ เมนูที่มองเห็นทุกจุดต้องกดได้จริง, มี guard ชัดเจน, หรือยังไม่ควรแสดง

## รอบปรับหน้าบ้านล่าสุด (Frontend pass)

- App shell แยก route แบบ immersive แล้ว: `/` และ `/chat*` ใช้ marketplace/chat shell ของตัวเองเท่านั้น ส่วน route utility เช่น `/wallet`, `/create`, `/profile`, และ admin ยังใช้ global shell เพื่อไม่ให้ผู้ใช้หลงทาง.
- ลบปุ่ม theme toggle และ branch โหมดสว่างที่ยังไม่รองรับออกจาก `App.tsx`; Maprang เป็น dark-first เต็มตัวในรอบนี้ เพื่อไม่ให้ผู้ใช้กดแล้วเจอหน้าขาวที่เหมือนฟีเจอร์ไม่เสร็จ.
- Explore รองรับ mobile primary navigation ด้วย bottom nav สำหรับ Explore, Chats, Create, Events, และ Profile.
- Chat read mode ไม่ใช่ของตกแต่งแล้ว: top bar และ right-rail control toggle reading layout ได้จริง, แสดง reading-state notice, และทำให้ message area แคบลงเพื่ออ่านฉากยาว.
- E2E smoke ตรวจการนำทาง Explore บนมือถือ และโหมดอ่านของ Chat บนจอเดสก์ท็อป/มือถือแล้ว.
- Prompt Inspector มี UI เฉพาะผู้ดูแลที่ `/admin/prompt-inspector` พร้อมเลือกตัวละคร, งบแต่ละส่วน, ส่วนต่างพรอมป์, คลังความรู้ที่ดึงมาใช้, คำเตือน, และคัดลอกพรอมป์ที่ปิดข้อมูลลับแล้ว.
- Automated Evals มี UI เฉพาะผู้ดูแลที่ `/admin/evals` พร้อมสรุปชุดทดสอบ, แผงพับแต่ละสถานการณ์, สถานะรายข้อ, และสรุปจุดไม่ผ่าน.
- Route/Menu Audit และ Admin Health ใช้ label แบบ Thai-first และทำให้สถานะ route/menu หลักชัดเจน: พร้อมใช้, guard ด้วยคีย์ผู้ดูแล, หรือรอ staging จริง.
- My Chats และ Chat sidebar มี flow เมนูสามจุดจริงสำหรับแก้ชื่อ, ปักหมุด/ถอนหมุด, จัดเก็บ/กู้คืน, ลบ, โหมดเลือก, และคำสั่งหลายรายการ พร้อม e2e coverage บนจอเดสก์ท็อป/มือถือ.
- Wallet แสดงยอดโทเคน, ต้นทุนแยกตามโมเดล, แนวโน้ม 7 วัน, ธุรกรรม, และ guard สำหรับการปรับโทเคนโดยผู้ดูแลด้วยข้อมูลจาก QA seed.
- Profile, Explore, และ Events Inbox รอบล่าสุดถูกเกลา disabled/loading behavior แล้ว: Explore ให้ primary controls ใช้ได้ระหว่าง skeleton loading, Profile แยก persona autosave จาก content-mode save lock, และ Events refresh มี title ระหว่างโหลด.
- Static frontend audit และ Route/Menu Audit ตอนนี้ช่วยกันกัน disabled controls ที่ไม่มีเหตุผลผู้ใช้อ่านรู้เรื่อง.
- Browser e2e smoke ล่าสุดผ่านจอเดสก์ท็อป/มือถือสำหรับ core flows และ primary routes ทั้งหมด โดยไม่มี console errors หรือการล้นแนวนอนที่เกี่ยวข้อง.
