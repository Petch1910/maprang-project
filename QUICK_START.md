# 🎯 QUICK START - ทำตามนี้เลย!

## ✅ วิธีรันแบบง่ายสุด (5 นาที)

---

## 📋 ก่อนเริ่ม ต้องมี:
- ✅ Bun installed (`bun --version`)
- ✅ Git cloned โปรเจกต์แล้ว
- ✅ เปิด 2 Terminal tabs

---

## 🚀 ครั้งแรก (Setup):

### 1. Backend Setup
```bash
cd apps/backend
bun install
bunx prisma generate
bunx prisma migrate dev
```
กด Enter เมื่อถามชื่อ migration

### 2. Frontend Setup  
```bash
cd apps/frontend
bun install
```

---

## ▶️ รันโปรเจกต์:

### Terminal 1 - Backend
```bash
cd apps/backend
bun run dev
```
รอจนเห็น: **"Server listening on port 3001"** ✅

### Terminal 2 - Frontend
```bash
cd apps/frontend
bun run dev
```
เห็น: **"Local: http://localhost:5173"** ✅

### เปิดเบราว์เซอร์
**http://localhost:5173** ✅

---

## ✅ ตรวจสอบ:
```bash
curl http://localhost:3001/api/health
```
ได้: `{"status":"ok"}` = Backend รันแล้ว! ✅

---

## 🎉 เสร็จแล้ว!

**ครั้งถัดไป:** แค่รัน Terminal 1 + 2 ใหม่ (ไม่ต้อง setup)

**มีปัญหา?** อ่าน HOW_TO_RUN.md
