# Relationship Engine

relationship engine แปลง tags, seeds, user behavior, และ scene outcomes ให้กลายเป็น state ที่ใช้คุมบทสนทนา

## แนวคิดหลัก

- Seed: relationship contract เริ่มต้นที่เลือกก่อนเข้าแชท.
- Stats: affinity, trust, intimacy, dominance, fear, respect.
- Momentum: ทิศทางระยะสั้น เช่น warming, cooling, volatile, หรือ steady.
- Timeline: ประวัติแบบกระชับของเทิร์นที่มีความหมายทางอารมณ์.
- Scene event: ช่วงสำคัญแบบ optional ที่ปลดล็อกด้วยเงื่อนไขความสัมพันธ์.
- Expanded ladder: ศัตรู, ไม่ถูกกัน, คู่ปรับ, คู่กัด, คนรู้จัก, เพื่อน, เพื่อนสนิท, เพื่อนตาย, แอบชอบ, เพื่อนสนิทคิดไม่ซื่อ, ลองคุย, คนคุย, แฟน, แฟน Toxic, คนรัก, คู่ชีวิต, คู่ครอง, คู่ครอง Toxic, คู่แท้.
- Preset surfaces: `contract` ใช้กับ relationship contracts ใน Character Lobby ที่ผู้เล่นเห็น; `creator` ใช้กับ tag presets ใน Creator Studio. Creator-only presets ห้ามหลุดไปอยู่ใน lobby contract list แต่ต้องยังใช้งานได้ใน Creator Studio.

## ทิศทาง runtime

- ให้ sandbox mode เป็นค่าเริ่มต้น.
- แจ้งเตือนก่อนเข้าสู่ scene.
- ทำ scene objective ให้ชัด.
- ให้ outcome อัปเดต relationship state.
- ใช้ cooldowns เพื่อลดการซ้ำของ major events.

structured rules อยู่ใน:

- `knowledge/structured/relationship-rules.json`
- `knowledge/structured/scene-rules.json`
