# 0019 - ตรวจคำสั่งใน decision log ด้วย docs command audit

วันที่: 2026-05-26

## การตัดสินใจ (Decision)

ไฟล์ decision ใต้ `memory/decisions/*.md` ต้องอยู่ในชุดตรวจของ `docs:commands` โดยอัตโนมัติ เพื่อให้คำสั่ง `bun run ...` ที่ถูกบันทึกเป็นสัญญาระยะยาวยังตรงกับ root package scripts เสมอ ไม่ใช่ตรวจเฉพาะ README, runbook, และ workflow เท่านั้น

## บริบท

decision log ถูกใช้เป็นแหล่งความจริงสำหรับ agent รุ่นถัดไปมากขึ้นเรื่อยๆ หลังเพิ่ม test coverage audit และ predeploy guard หลายชุด ถ้า decision เก่าหรือใหม่อ้างคำสั่งที่ไม่มีจริง agent อาจสานต่องานผิดทิศ หรือ CI อาจไม่จับจนถึงช่วง deploy

## ทิศทาง implementation

- `scripts/docs-command-audit.ts` ต้องมี `collectDefaultAuditedCommandFiles` และอ่าน `memory/decisions` ด้วย `readdir`.
- `scripts/docs-command-audit.test.ts` ต้องมี regression ที่ยืนยันว่า default audit set รวม decision index และ decision file ล่าสุด.
- `predeploy:check` ต้อง lock source/test snippets ของ decision-file command audit wiring.
- เมื่อเพิ่ม decision file ใหม่ ให้เพิ่มเข้า `memory/decisions/index.md`; ส่วน predeploy Markdown heading audit ต้องค้นไฟล์ decision แบบ dynamic ตาม decision `0020-discover-decision-markdown-heading-files.md`.

## ผลลัพธ์

- คำสั่งใน decision record จะ drift จาก `package.json` ยากขึ้น.
- future agent อ่าน decision แล้วรันคำสั่งได้มั่นใจขึ้น.
- predeploy จะจับการถอด decision files ออกจาก docs command audit ก่อน release.
