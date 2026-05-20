# 0001 - ใช้ SocratiCode เป็น local codebase intelligence

วันที่: 2026-05-13

สถานะ: done

## การตัดสินใจ (Decision)

ใช้ SocratiCode เป็นเครื่องมือ MCP สำหรับพัฒนาในเครื่อง ไม่ใช่ runtime dependency ของ Maprang

## เหตุผล

ตอนนี้ Maprang มี backend, frontend, QA, deploy, และ provider wiring มากพอที่ codebase intelligence จะช่วยลดเวลาไล่ route-to-service-to-database flows และประเมินผลกระทบก่อนแก้โค้ด

## สิ่งที่ทำแล้ว

- เพิ่ม SocratiCode MCP server ใน local Codex config.
- เพิ่ม `.socraticodeignore` เพื่อไม่ index dependencies, build output, local runtime files, binaries, และ env secrets.
- บันทึก workflow ไว้ใน README ของโปรเจกต์.

## ความเสี่ยง

SocratiCode บน npm เป็น AGPL licensed จึงควรใช้เป็น local development tool เท่านั้น จนกว่าจะ review licensing แยกต่างหาก.
