# 0028 - ล็อก container alias guard ของ Promise และ console

## สถานะ

ยอมรับแล้วในวันที่ 2026-06-01

ขยายขอบเขตวันที่ 2026-06-02 ให้รวม collection mutation containers ด้วย

## บริบท

หลังจาก decision `0027` ล็อก namespace reflection guard แล้ว ยังมีทางเลี่ยงอีกกลุ่มหนึ่งคือการซ่อน `Promise`, `Promise.reject`, `console`, `console.error`, หรือ `console.warn` ไว้ใน wrapper container เช่น object map หรือ array map ก่อนค่อยส่งต่อไปยัง raw rejection, raw console log, หรือ route/UI response ที่ไม่ผ่าน helper กลาง

รูปแบบที่ต้องระวังคือโค้ดที่ดูเหมือน registry หรือ helper map เช่น `[safeReject, Promise.reject]`, `([console.error])`, `new Map([['reject', Promise.reject]])`, `new Set([Promise.reject])`, `new WeakSet().add(Promise.reject)`, `new WeakSet().add(window.Promise)`, `new WeakSet().add(globalThis.console)`, `new WeakSet().add(window.Reflect)`, `Map.prototype.set.call(rejectRegistry, 'reject', Promise.reject)`, `Map.prototype.set.apply(...)`, bracketed `Map.prototype` set/call forwarding, `Set.prototype.add.call(promiseBag, window.Promise)`, `Set.prototype.add?.call(promiseBag, window.Promise)`, `Set.prototype.add.bind(...)`, `Set.prototype.add.call(loggerBag, console.warn)`, `Set.prototype.add.apply(...)`, bracketed `Set.prototype` add/call forwarding, `WeakSet.prototype.add.call(loggerBag, globalThis.console)`, `WeakSet.prototype.add.bind(...)`, bracketed `globalThis.WeakSet.prototype` add/call forwarding, `Array.from([Promise.reject])`, `Array.of(console.warn)`, `Object.freeze([Promise.reject])`, `Object.seal([safeReject, Promise.reject])`, `Object.freeze({ Promise })`, `Object.seal({ safeLogger, console })`, `Object.fromEntries([['reject', Promise.reject]])`, `Object.fromEntries([['console', console]])`, `Object.assign({}, { reject: Promise.reject })`, `Object.assign({}, { Promise })`, `Object.assign({}, { console })`, `Object.defineProperty({}, 'reject', { value: Promise.reject })`, `Object.defineProperties({}, { Promise: { value: Promise } })`, `Object.defineProperty({}, 'console', { value: console })`, `Object.create(null, { reject: { value: Promise.reject } })`, `Object.create(null, { Promise: { value: Promise } })`, `Object.create(null, { console: { value: console } })`, `new Map([['console', console]])`, `{ Promise }`, `{ fallback, Promise }`, `{ console }`, และ `{ safeLogger, console }` เพราะ syntax เหล่านี้ทำให้ raw object path ถูกเก็บไว้แล้วส่งต่อภายหลังได้ยากต่อการ review ด้วยสายตา

## การตัดสินใจ

- Frontend static audit และ backend security audit ต้องบล็อก container alias ของ Promise object, `Promise.reject`, console object, และ `console.error`/`console.warn`
- Coverage ต้องรวม object property, array entry, later array entry, parenthesized array, `new Map` tuple entry, `new Set`, direct `new WeakSet().add(...)` collection mutation containers, prototype-forwarded `Map.prototype.set.call(...)`, `Set.prototype.add.call(...)`, and `WeakSet.prototype.add.call(...)` collection mutation containers including bracketed, optional-chained, `.apply(...)`, and `.bind(...)(...)` member forwarding, `Array.from`, `Array.of`, `Object.freeze`/`Object.seal` readonly container wrappers, `Object.fromEntries` tuple containers, `Object.assign` object-registry containers, `Object.defineProperty`/`Object.defineProperties` descriptor-value containers, `Object.create` descriptor-value containers, `Map.set`/`Set.add` collection mutation containers, object-literal shorthand, และ parenthesized object-literal shorthand
- Collection mutation coverage ต้องรวม registry/bag syntax เช่น `registry.set('reject', Promise.reject)`, `bag.add(Reflect.get(Promise, 'reject'))`, `registry.set('Promise', Promise)`, `loggerRegistry.set('error', console.error)`, `loggerRegistry.set('console', console)`, `namespaceRegistry.set('Reflect', Reflect)`, `namespaceRegistry.set('Object', Object)`, `new WeakSet().add(Promise.reject)`, `new WeakSet().add(globalThis.console)`, `new WeakSet().add(window.Reflect)`, `Map.prototype.set.call(rejectRegistry, 'reject', Promise.reject)`, `Map.prototype.set.apply(...)`, bracketed `Map.prototype` set/call forwarding, `Set.prototype.add.call(promiseBag, window.Promise)`, `Set.prototype.add?.call(promiseBag, window.Promise)`, `Set.prototype.add.bind(...)`, `Set.prototype.add.call(loggerBag, console.warn)`, `Set.prototype.add.apply(...)`, bracketed `Set.prototype` add/call forwarding, `WeakSet.prototype.add.call(loggerBag, globalThis.console)`, `WeakSet.prototype.add.bind(...)`, และ bracketed `globalThis.WeakSet.prototype` add/call forwarding
- Reflected และ descriptor-retrieved entries เช่น `Reflect.get(Promise, 'reject')`, `Reflect.get(window, 'Promise')`, `Reflect.get(console, 'error')`, และ `Object.getOwnPropertyDescriptor(globalThis, 'console')?.value` ต้องยังถูกจับเมื่ออยู่ใน container
- Predeploy regression ต้องล็อก source snippets ของทั้ง frontend และ backend เพื่อไม่ให้ guard ชุดนี้หลุดจาก QA gate
- ถ้ามี use case ที่ต้องทำ registry map จริงในอนาคต ต้องสร้าง helper กลางที่จำกัดพฤติกรรมชัดเจน พร้อม allowlist แคบและ regression test ก่อนใช้งาน

## ผลกระทบ

- ลดโอกาสที่ raw provider/API error จะหลุดออกทาง Promise rejection, console logging, route response, หรือ UI state ผ่าน wrapper map
- ทำให้ code review เห็นชัดขึ้นว่า error path ต้องผ่าน `logUnexpectedError`, safe summary helper, controlled UI result, หรือ `routeErrorResponse`
- เพิ่มความนิ่งของ baseline ก่อน staging โดยปิด syntax bypass ที่เกิดจาก container/registry style code

## งานตามมา

ถ้าพบ false positive จาก helper ที่จำเป็นจริง ให้แยก helper นั้นออกเป็นไฟล์เฉพาะ เพิ่มเหตุผลใน allowlist และเพิ่ม regression test ที่ยืนยันว่า helper ไม่ส่ง raw error object ออกสู่ public UI, console, route response, หรือ Promise rejection
