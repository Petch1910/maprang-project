# Maprang Evals

โฟลเดอร์นี้เก็บชุดทดสอบคุณภาพแบบ deterministic และชุดที่อาจต่อกับ provider สำหรับ Maprang AI โดยเน้นตรวจการประกอบพรอมป์ บริบทโรลเพลย์ และ regression ของระบบความสัมพันธ์/ฉาก.

## ขอบเขตปัจจุบัน

- `golden-roleplay.json`: golden dataset สำหรับตรวจ local prompt assembly และ roleplay guard scenarios.
- `promptfoo.roleplay.yaml`: config ของ Promptfoo แบบ optional โดยใช้ provider `echo` เพื่อรันได้โดยไม่เสียเครดิตโมเดล.

## Golden Dataset

golden dataset ชุดนี้ตั้งใจให้เล็ก ชัด และ deterministic. เพิ่ม scenario ใหม่เมื่อแก้บัค context, เปลี่ยน relationship/scene rule, หรือเจอ prompt-control regression ที่ควรมี guard ถาวร.

## Commands

```bash
bun run eval:local
```

`eval:local` เป็น deterministic และปลอดภัยสำหรับ CI. คำสั่งนี้ตรวจ corpus ของ golden scenarios, ลำดับ section ของพรอมป์, การแนบ knowledge pack, prompt-control policy, lore injection, และงบโทเคนโดยประมาณ.
backend eval service ตัวเดียวกันถูกเปิดให้ผู้ดูแลเรียกผ่าน `GET /admin/evals/local` และหน้า `/admin/evals`.

```bash
bun run eval:promptfoo
```

`eval:promptfoo` เป็น optional. คำสั่งนี้ใช้ `bunx promptfoo@latest` และอาจดาวน์โหลด Promptfoo ถ้ายังไม่มี cache ในเครื่อง จึงยังอยู่นอก strict local gate จนกว่าทีมจะตัดสินใจ pin Promptfoo เป็น dev dependency.

## กฎ

- ห้ามใส่ secret ใน eval fixtures.
- ห้ามเก็บแชทผู้ใช้จริง, API keys, access tokens, service role keys, หรือ private production URLs ใน eval fixtures.
- แยก live-provider evals ออกจาก deterministic evals เสมอ.
- เลือก scenario ที่เล็กแต่จับ regression ของ context assembly และ roleplay behavior ได้ชัด.
