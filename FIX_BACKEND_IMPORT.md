# Fix Backend Import Error

## ✅ ยืนยันแล้ว: `recordTokenTransaction` มี export อยู่

**Location:** `apps/backend/src/token.service.ts:296`

```typescript
export async function recordTokenTransaction(
  input: TokenTransactionInput
): Promise<void> {
  await createTokenTransaction(input)
}
```

---

## 🔧 วิธีแก้ไข Error "Cannot find export"

### **1. Clear Cache**
```bash
cd apps/backend
rm -rf node_modules/.cache
rm -rf dist
```

### **2. Restart TypeScript Server (VSCode)**
- กด `Ctrl+Shift+P`
- พิมพ์: `TypeScript: Restart TS Server`

### **3. Clear Bun Cache**
```bash
cd apps/backend
rm -rf node_modules
bun install
```

### **4. Verify Import Statement**
ตรวจสอบว่าไฟล์ที่ import ใช้ path ถูกต้อง:

```typescript
// ✅ Correct
import { recordTokenTransaction } from './token.service'

// ❌ Wrong
import { recordTokenTransaction } from './token.service.ts'
import { recordTokenTransaction } from '../token.service'
```

---

## 📋 Files ที่ใช้ `recordTokenTransaction`:

1. `daily-login.service.ts`
2. `token-expiry.service.ts`

ให้เช็คว่าทั้ง 2 ไฟล์ import ถูกต้องหรือไม่

---

## ✅ Quick Fix Command

```bash
# From project root
cd apps/backend
rm -rf node_modules/.cache dist
bun run dev
```

---

**Function พร้อมใช้งานแล้ว! ถ้ายังมีปัญหาแจ้งมาได้เลยค่ะ** 🚀
