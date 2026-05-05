import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export function getPrisma() {
  if (!process.env.DATABASE_URL) return null
  const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    })
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  return prisma
}

export function requireDatabase(set: { status?: number | string }) {
  const prisma = getPrisma()
  if (!prisma) {
    set.status = 503
    return null
  }
  return prisma
}
