# 0027 - ล็อก namespace reflection guard ของ Promise และ console

## สถานะ

ยอมรับแล้วในวันที่ 2026-06-01

## บริบท

ชุด guard ก่อนหน้าปิด raw error throw, raw route return, native dialog, cross-window messaging, และ raw console log ตรงๆ ได้แล้ว แต่ syntax ของ JavaScript ยังเปิดทางให้อ้างถึง `Promise.reject`, `console.error`, `console.warn`, `Reflect.get`, `Reflect.apply`, และ `Object.getOwnPropertyDescriptor` ผ่าน namespace, computed property, optional call, method forwarding, alias, และ destructuring ได้

ถ้า guard จับได้แค่รูปแบบตรงๆ รอบ staging ถัดไปอาจมีโค้ด UI หรือ route ที่ดูเป็น helper wrapper แต่ยังส่ง raw error object ออกไปทาง Promise rejection, console log, หรือ public response ได้

## การตัดสินใจ

- Frontend static audit และ backend security audit ต้องบล็อก raw Promise rejection ทั้ง direct, bracket, optional-call, parenthesized, namespace, reflected, descriptor, call/apply/bind, executor reject callback, typed alias, และ destructured alias forms
- Frontend static audit และ backend security audit ต้องบล็อก raw console error/warn forwarding ทั้ง direct, bracket, optional-call, parenthesized, namespace, reflected, descriptor, call/apply/bind, object alias, method alias, typed alias, และ destructured alias forms
- `Reflect.get`, `Reflect.apply`, `Object.getOwnPropertyDescriptor`, `Reflect` object, และ `Object` object ห้ามถูก alias หรือ destructure จาก namespace ที่สามารถเอาไปบัง raw error path ต่อได้
- Predeploy, memory audit, agent guide, production checklist, และ decision index ต้องบันทึก guard ชุดนี้เป็น baseline ก่อน staging

## ผลกระทบ

- ลดทางลัดที่ raw provider/API error อาจหลุดสู่ console, UI state, Promise rejection, หรือ route response
- ทำให้ future code ที่อยากห่อ error ต้องใช้ safe summary, controlled result, route error helper, หรือ API helper กลางแทนการส่ง raw object ต่อ
- ช่วยให้ baseline ก่อน deploy นิ่งขึ้น เพราะ syntax bypass หลักของ Promise/console reflection ถูกล็อกไว้ใน QA หลายชั้น

## งานตามมา

ถ้ามี helper ที่ต้องอ่าน method จาก global object ในอนาคต ต้องเพิ่ม allowlist ที่แคบ, มีเหตุผล, และมี regression test ก่อนใช้งานจริง
