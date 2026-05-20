# ทิศทาง UI/UX

อัปเดตล่าสุด: 2026-05-20

## ทิศทางผลิตภัณฑ์

Maprang ควรรู้สึกคุ้นมือสำหรับผู้ใช้ character chat ภาษาไทย แต่เพิ่มระบบ relationship และ scene ที่ลึกกว่าเดิม

## หลักการสำคัญ

- Mobile-first.
- Dark-first interface พร้อม visual language ที่ไปทางเดียวกันทั้งเว็บ.
- Navigation หลักเป็นภาษาไทย.
- เมนูต้องครบและกดแล้วเกิดผลจริง ไม่ใช่องค์ประกอบตกแต่ง.
- Empty state ต้องบอกว่าผู้ใช้ควรทำอะไรต่อ.
- Chat ต้องรู้สึกธรรมชาติและคุ้นมือ ก่อนที่ระบบขั้นสูงจะปรากฏ.
- Relationship และ scene features ควรรู้สึกเหมือน game-layer feedback ไม่ใช่ความรกบนหน้าจอ.

## พื้นผิวหลัก

- Explore: discovery, continue chatting, character rows.
- Character Lobby: relationship seed contract ก่อนเข้าแชท.
- Chat Room: แชทปกติต้องมาก่อน และ scene mode แสดงเฉพาะเมื่อเกี่ยวข้อง.
- Creator Studio: creation flow ที่คุ้นแบบ Khuiai พร้อม personality clarity, tag warnings, image/content AI draft, preview simulator.
- My Chats: จัดการแชทจริงด้วย rename, pin/unpin, archive, delete, report paths.
- Wallet: token balance, usage, admin adjustment guard.
- Admin Health: deploy blockers ด้วยภาษาที่อ่านง่าย.
- Prompt Inspector: admin-only prompt snapshot/diff tool สำหรับ debug reply depth, lore retrieval, และ context drift.
- Automated Evals: admin-only deterministic quality checks สำหรับ prompt/context regression ก่อน staging.

## UX concern ปัจจุบัน

ผู้ใช้ย้ำหลายครั้งว่า UI ต้องรู้สึกสมบูรณ์และเป็นธรรมชาติ เมนูที่มองเห็นทุกจุดต้องกดได้จริง, มี guard ชัดเจน, หรือยังไม่ควรแสดง

## Frontend pass ล่าสุด

- Explore รองรับ mobile primary navigation ด้วย bottom nav สำหรับ Explore, Chats, Create, Events, และ Profile.
- Chat read mode ไม่ใช่ของตกแต่งแล้ว: top bar และ right-rail control toggle reading layout ได้จริง, แสดง reading-state notice, และทำให้ message area แคบลงเพื่ออ่านฉากยาว.
- E2E smoke ตรวจ mobile Explore navigation และ Chat read mode บน desktop/mobile แล้ว.
- Prompt Inspector มี guarded admin UI ที่ `/admin/prompt-inspector` พร้อม character selection, section budget, diff, lore retrieval, warnings, และ redacted prompt copy.
- Automated Evals มี guarded admin UI ที่ `/admin/evals` พร้อม suite summary, scenario accordion, per-check status, และ failure summary.
- Route/Menu Audit และ Admin Health ใช้ Thai-first labels และทำให้สถานะ route/menu หลักชัดเจน: ready, guarded by admin key, หรือ waiting for real staging.
- My Chats และ Chat sidebar มี three-dot menu flows จริงสำหรับ rename, pin/unpin, archive/restore, delete, selection mode, และ bulk actions พร้อม desktop/mobile e2e coverage.
- Wallet แสดง token balance, model cost breakdown, seven-day trend, transactions, และ admin adjustment guards ด้วย backend data จาก QA seed.
- Browser e2e smoke ล่าสุดผ่าน desktop/mobile สำหรับ core flows และ primary routes ทั้งหมด โดยไม่มี console errors หรือ horizontal overflow ที่เกี่ยวข้อง.
