# 🔐 Environment Variables Setup Guide

## ⚠️ Important: .env Files Not Included in Git

ไฟล์ `.env` **ไม่ได้ถูก commit** เพราะเหตุผลความปลอดภัย (อยู่ใน .gitignore)

คุณต้อง**สร้างเองจาก templates**

---

## 🚀 Quick Setup

### 1. Backend (.env)

```bash
cd apps/backend
cp .env.example .env
```

**แก้ไขไฟล์ .env:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/maprang"
# หรือใช้ SQLite สำหรับ development:
# DATABASE_URL="file:./dev.db"

PORT=3001
NODE_ENV=development
```

### 2. Frontend (.env)

```bash
cd apps/frontend
cp .env.example .env
```

**แก้ไขไฟล์ .env:**
```env
VITE_API_URL=http://localhost:3001
```

---

## 📋 Required Variables

### Backend (REQUIRED)
- ✅ `DATABASE_URL` - Database connection string
- ✅ `PORT` - Backend port (default: 3001)

### Frontend (REQUIRED)
- ✅ `VITE_API_URL` - Backend API URL

### Optional Variables
- `JWT_SECRET` - For authentication (if implemented)
- `OPENAI_API_KEY` - For AI features (if used)
- `NODE_ENV` - Environment (development/production)

---

## 🗄️ Database Setup

### Option 1: SQLite (Easiest for Development)

**Backend .env:**
```env
DATABASE_URL="file:./dev.db"
```

**Initialize:**
```bash
cd apps/backend
bunx prisma migrate dev
bunx prisma generate
```

### Option 2: PostgreSQL (Production)

**Backend .env:**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/maprang"
```

**Setup Database:**
```bash
# Create database
createdb maprang

# Run migrations
cd apps/backend
bunx prisma migrate deploy
bunx prisma generate
```

---

## ✅ Verify Setup

### Test Backend
```bash
cd apps/backend
bun run dev

# Should see:
# ✓ Database connected
# ✓ Server listening on port 3001
```

### Test Frontend
```bash
cd apps/frontend
bun run dev

# Should see:
# Local: http://localhost:5173
```

### Test Connection
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}
```

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL not found"
**Fix:** Create `.env` file in `apps/backend/`

### Error: "VITE_API_URL not defined"
**Fix:** Create `.env` file in `apps/frontend/`

### Error: "Database connection failed"
**Fix:** Check `DATABASE_URL` is correct

### Error: "Port 3001 already in use"
**Fix:** Change `PORT` in backend `.env`

---

## 🔒 Security Notes

### ⚠️ NEVER Commit:
- `.env` files
- Database credentials
- API keys
- Secrets

### ✅ ALWAYS Commit:
- `.env.example` templates
- Documentation
- Setup instructions

---

## 📝 Production Environment Variables

### Backend (Production)
```env
DATABASE_URL="your-production-database-url"
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS="https://yourdomain.com"
```

### Frontend (Production)
```env
VITE_API_URL=https://api.yourdomain.com
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

---

## 🎯 Quick Start Checklist

- [ ] Copy `.env.example` to `.env` in backend
- [ ] Copy `.env.example` to `.env` in frontend
- [ ] Set `DATABASE_URL` in backend `.env`
- [ ] Set `VITE_API_URL` in frontend `.env`
- [ ] Run `bunx prisma migrate dev` in backend
- [ ] Start backend: `bun run dev`
- [ ] Start frontend: `bun run dev`
- [ ] Open http://localhost:5173

---

**🎉 Environment setup complete! You're ready to develop! 🎉**
