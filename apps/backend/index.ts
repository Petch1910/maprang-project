import "dotenv/config"; // สำคัญ: ต้องอยู่บรรทัดบนสุด
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const app = new Elysia()
  .use(cors())
  .get("/characters", async () => {
    return await prisma.character.findMany(); // ดึงข้อมูลตัวละครทั้งหมดจาก DB[cite: 1]
  })
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

// บรรทัดนี้สำคัญที่สุดเพื่อให้ฝั่ง Frontend หายแดง
export type App = typeof app;