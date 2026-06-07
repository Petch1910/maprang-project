# ⚡ QUICK FIX - Character Loading Issue

## ปัญหา: "โหลดรายการตัวละครไม่ได้"

---

## ✅ Solution (ทำตามลำดับ)

### 1️⃣ สร้างไฟล์ .env สำหรับ Backend

```bash
cd apps/backend
```

สร้างไฟล์ `.env` ด้วยเนื้อหานี้:
```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
```

### 2️⃣ สร้างไฟล์ .env สำหรับ Frontend

```bash
cd apps/frontend
```

สร้างไฟล์ `.env` ด้วยเนื้อหานี้:
```env
VITE_API_URL=http://localhost:3001
```

### 3️⃣ Setup Database

```bash
cd apps/backend
bun install
bunx prisma generate
bunx prisma migrate dev
```

กด Enter เมื่อถามชื่อ migration

### 4️⃣ Start Backend (Terminal 1)

```bash
cd apps/backend
bun run dev
```

**ต้องเห็นข้อความนี้:**
```
✓ Database connected
✓ Server listening on port 3001
```

### 5️⃣ Start Frontend (Terminal 2)

```bash
cd apps/frontend
bun run dev
```

**ต้องเห็นข้อความนี้:**
```
Local: http://localhost:5173
```

### 6️⃣ เปิดเบราว์เซอร์

ไปที่: http://localhost:5173 (ไม่ใช่ 5174)

---

## 🔍 ตรวจสอบว่า Backend รันอยู่

```bash
curl http://localhost:3001/api/health
```

**ต้องได้:**
```json
{"status":"ok"}
```

---

## ❌ ถ้ายังไม่ได้

### Problem: "ECONNREFUSED"
**Fix:** Backend ยังไม่รัน → ทำข้อ 4️⃣

### Problem: "Database not found"
**Fix:** ทำข้อ 3️⃣ ใหม่

### Problem: Port 3001 in use
**Fix:** ปิดโปรแกรมที่ใช้ port 3001

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# หรือเปลี่ยน port ใน .env
PORT=3002
```

---

## 📋 Checklist

- [ ] สร้าง apps/backend/.env แล้ว
- [ ] สร้าง apps/frontend/.env แล้ว
- [ ] Run `bunx prisma migrate dev` แล้ว
- [ ] Backend รันอยู่ (Terminal 1)
- [ ] Frontend รันอยู่ (Terminal 2)
- [ ] curl health endpoint ได้
- [ ] เปิด http://localhost:5173

---

## 🎯 Expected Result

เมื่อทำครบทุกขั้นตอน:
- ✅ Backend รันที่ port 3001
- ✅ Frontend รันที่ port 5173
- ✅ Characters โหลดได้
- ✅ ทุกอย่างทำงาน

---

**หากยังมีปัญหา แจ้งข้อความ error ที่เห็นมาได้เลยค่ะ!** 🔧
