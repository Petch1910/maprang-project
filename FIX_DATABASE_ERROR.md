# 🔧 FIX: Database Setup Error

## ปัญหา: "must start with the protocol `postgresql://`"

**สาเหตุ:** โปรเจกต์ใช้ PostgreSQL แต่ .env ตั้งเป็น SQLite

---

## ✅ วิธีแก้ (เลือก 1 วิธี):

### วิธีที่ 1: ใช้ PostgreSQL (แนะนำสำหรับ Production)

#### 1.1 ติดตั้ง PostgreSQL
- ดาวน์โหลด: https://www.postgresql.org/download/
- หรือใช้ Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`

#### 1.2 แก้ไข .env
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maprang?schema=public"
PORT=3001
NODE_ENV=development
```

#### 1.3 สร้าง Database
```bash
# ถ้าติดตั้ง PostgreSQL แล้ว
createdb maprang

# หรือใน psql
psql -U postgres
CREATE DATABASE maprang;
\q
```

#### 1.4 Run Migration
```bash
bunx prisma migrate dev --name init
```

---

### วิธีที่ 2: ใช้ SQLite (ง่ายสำหรับ Development) ⚡

#### 2.1 แก้ไข schema.prisma
เปลี่ยนจาก:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

เป็น:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

#### 2.2 แก้ไข .env
```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
```

#### 2.3 Run Migration
```bash
bunx prisma generate
bunx prisma migrate dev --name init
```

---

## 🎯 แนะนำ: ใช้ SQLite สำหรับ Development

**ทำตามนี้:**

```bash
# 1. แก้ไข apps/backend/prisma/schema.prisma
# เปลี่ยน provider = "postgresql" เป็น provider = "sqlite"

# 2. แก้ไข apps/backend/.env
DATABASE_URL="file:./dev.db"

# 3. Run commands
cd apps/backend
bunx prisma generate
bunx prisma migrate dev --name init
bun run dev
```

---

## ✅ หลังแก้แล้ว:

ควรเห็น:
```
✓ Prisma schema loaded
✓ Database synced
✓ Migration applied: init
```

แล้วรัน:
```bash
bun run dev
```

ควรเห็น:
```
✓ Server listening on port 3001
```

---

**ต้องการความช่วยเหลือเพิ่มเติมไหมคะ?** 🔧
