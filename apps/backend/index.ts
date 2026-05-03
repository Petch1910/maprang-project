import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

type ChatRole = "system" | "user" | "assistant"
type ChatMessage = { role: ChatRole; content: string }

const app = new Elysia()
  .use(cors())
  .post('/chat', async ({ body }) => {
    const { message, characterId, history } = body as {
      message: string
      characterId: string
      history?: ChatMessage[]
    }

    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId }
      })

      if (!character) return { reply: "ไม่พบตัวละครนี้" }

      const messages: ChatMessage[] = [
        { role: "system", content: character.systemPrompt },
        ...(history ?? []).map((msg) => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ]

      console.log(`\n💬 คุณเพชรพิมพ์ว่า: "${message}"`)
      console.log(`⏳ กำลังรอ OpenRouter ประมวลผล...`)

      const completion = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-001",
        messages: messages as any
      })

      const aiContent = completion.choices[0]?.message?.content

      // แอบดูว่า AI ตอบอะไรมาใน Terminal
      console.log(`🤖 AI ตอบกลับมาว่า:`, aiContent)

      // ดักจับขั้นเด็ดขาด: ถ้าเป็นค่าว่าง null หรือ undefined ให้บังคับตอบข้อความนี้
      const reply = aiContent ? aiContent.trim() : ""
      
      return { 
        reply: reply !== "" ? reply : "มะปรางคิดไม่ออกค่ะ ขอฟังอีกรอบได้ไหมคะ?" 
      }

    } catch (error) {
      console.error("❌ Chat error:", error)
      return { reply: "ระบบ AI มีปัญหาชั่วคราว ลองใหม่อีกครั้งนะคะ 🙏" }
    }
  }, {
    body: t.Object({
      message: t.String(),
      characterId: t.String(),
      history: t.Optional(
        t.Array(t.Object({
          role: t.Union([t.Literal("system"), t.Literal("user"), t.Literal("assistant")]),
          content: t.String()
        }))
      )
    })
  })
  .listen(3000)

console.log(`🦊 Server is running at http://localhost:3000`)