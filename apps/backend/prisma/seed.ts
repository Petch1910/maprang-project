import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Start seeding...");

  // 1. สร้าง User (เจ้าของ AI)
  const user = await prisma.user.upsert({
    where: { email: "phet@maprang.io" },
    update: {},
    create: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "phet@maprang.io",
      username: "PhetDev",
    },
  });

  console.log("✅ User ready:", user.email);

  // 2. สร้าง Character (น้องมะปราง)
  const character = await prisma.character.upsert({
    where: { id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d" },
    update: {
      // ถ้าอยากแก้ System Prompt น้องมะปราง ให้มาแก้ตรงนี้แล้วรัน Seed ใหม่ครับ
      systemPrompt: "คุณคือมะปราง AI สาวน้อยใจดี ชอบช่วยเหลือ", 
      greeting: "สวัสดีค่ะ! วันนี้มะปรางมีอะไรให้ช่วยไหมคะ?",
    },
    create: {
      id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      name: "น้องมะปราง",
      description: "AI ผู้ช่วยอัจฉริยะที่พร้อมดูแลคุณทุกเรื่อง",
      systemPrompt: "คุณคือมะปราง AI สาวน้อยใจดี ชอบช่วยเหลือ",
      greeting: "สวัสดีค่ะ! วันนี้มะปรางมีอะไรให้ช่วยไหมคะ?",
      visibility: "PUBLIC",
      creatorId: user.id,
    },
  });

  console.log("✅ Character ready:", character.name);

  console.log("🎉 Seeding completed successfully!");
}

// ✅ ใช้ top-level await พร้อมจัดการ Error
try {
  await main();
} catch (e) {
  console.error("❌ Seed failed:");
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}