# 📚 วิธีรันโปรเจกต์ที่ถูกต้อง (Step by Step)

## ✅ ขั้นตอนที่ถูกต้อง 100%

---

## 🎯 **ภาพรวม:**
- Backend รันที่ **Port 3001**
- Frontend รันที่ **Port 5173**
- ต้องรัน **Backend ก่อน** แล้วค่อย Frontend

---

## 📝 **ขั้นตอนทั้งหมด (ทำครั้งแรก):**

### Step 1: ติดตั้ง Dependencies

**Backend:**
```bash
cd apps/backend
bun install
```

**Frontend:**
```bash
cd apps/frontend
bun install
```

---

### Step 2: Setup Database (ทำครั้งเดียว)

```bash
cd apps/backend
bunx prisma generate
bunx prisma migrate dev --name init
```

**จะถามว่า:**
```
✔ Enter a name for the new migration: › init
```
กด Enter

**ควรเห็น:**
```
✓ Database synced
✓ Migration applied
```

---

### Step 3: เปิด 2 Terminal

#### Terminal 1 - Backend
```bash
cd apps/backend
bun run dev
```

**รอจนเห็นข้อความนี้:**
```
✓ Prisma Client generated
✓ Database connected
✓ Server listening on port 3001
```

**⚠️ อย่าปิด Terminal นี้!**

---

#### Terminal 2 - Frontend
```bash
cd apps/frontend
bun run dev
```

**จะเห็นข้อความ:**
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**⚠️ อย่าปิด Terminal นี้!**

---

### Step 4: เปิดเบราว์เซอร์

ไปที่: **http://localhost:5173**

**ควรเห็น:**
- ✅ หน้า Explore โหลดขึ้น
- ✅ มีตัวละครแสดง (ถ้ามีข้อมูลใน DB)
- ✅ Navigation bar ทำงาน
- ✅ ไม่มี error ใน console

---

## 🔍 **ตรวจสอบว่า Backend รัน:**

เปิด Terminal ใหม่:
```bash
curl http://localhost:3001/api/health
```

**ควรได้:**
```json
{"status":"ok"}
```

---

## ⚡ **วิธีรันครั้งถัดไป (ง่ายกว่า):**

ไม่ต้อง setup database อีก แค่:

**Terminal 1:**
```bash
cd apps/backend
bun run dev
```

**Terminal 2:**
```bash
cd apps/frontend
bun run dev
```

**Browser:** http://localhost:5173

---

## 🐛 **แก้ปัญหาที่พบบ่อย:**

### ❌ "โหลดรายการตัวละครไม่ได้"

**สาเหตุ:** Backend ไม่ได้รัน

**แก้ไข:**
1. เช็คว่า Terminal 1 (backend) รันอยู่ไหม
2. ถ้าไม่รัน → `cd apps/backend && bun run dev`
3. Refresh browser

---

### ❌ "Port 3001 already in use"

**สาเหตุ:** Backend รันอยู่แล้ว

**แก้ไข:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# หรือปิด Terminal เดิมที่รัน backend
```

---

### ❌ "Database not found" หรือ "Prisma error"

**แก้ไข:**
```bash
cd apps/backend
bunx prisma migrate reset
bunx prisma migrate dev --name init
```

---

### ❌ "Cannot find module" หรือ Import errors

**แก้ไข:**
```bash
# Backend
cd apps/backend
rm -rf node_modules
bun install

# Frontend
cd apps/frontend
rm -rf node_modules
bun install
```

---

## 📊 **ตรวจสอบสถานะ:**

### ✅ Backend กำลังรัน:
- Terminal 1 แสดง "Server listening on port 3001"
- `curl http://localhost:3001/api/health` ได้ผล

### ✅ Frontend กำลังรัน:
- Terminal 2 แสดง "Local: http://localhost:5173"
- เปิด browser ที่ http://localhost:5173 ได้

### ✅ ทำงานถูกต้อง:
- หน้าเว็บโหลดได้
- ไม่มี error ใน browser console (F12)
- Navigation ทำงาน
- Characters โหลดได้

---

## 🎯 **Checklist ก่อนรัน:**

- [ ] ติดตั้ง Bun แล้ว (`bun --version`)
- [ ] มีไฟล์ `apps/backend/.env`
- [ ] มีไฟล์ `apps/frontend/.env`
- [ ] รัน `bun install` ทั้ง 2 apps แล้ว
- [ ] รัน `prisma migrate dev` แล้ว
- [ ] เปิด 2 Terminal
- [ ] Backend รันก่อน
- [ ] Frontend รันทีหลัง

---

## 🎬 **Script รันอัตโนมัติ (Optional):**

สร้างไฟล์ `start.sh`:
```bash
#!/bin/bash

# Start backend in background
cd apps/backend
bun run dev &

# Wait for backend
sleep 3

# Start frontend
cd ../frontend
bun run dev
```

รัน:
```bash
chmod +x start.sh
./start.sh
```

---

## 🛑 **วิธีหยุดรัน:**

1. ไปที่ Terminal 1 (Backend) → กด `Ctrl+C`
2. ไปที่ Terminal 2 (Frontend) → กด `Ctrl+C`

---

## 🎉 **สรุป:**

1. **ครั้งแรก:** Setup database ก่อน
2. **รัน Backend** ใน Terminal 1
3. **รัน Frontend** ใน Terminal 2
4. **เปิด Browser** ที่ localhost:5173
5. **Enjoy!** 🚀

---

**มีปัญหาตรงไหน บอกได้เลยค่ะ!** 💪
