import { AdminAuditAction, Prisma } from '@prisma/client'
import { getPrisma } from './db'

export type AdminAuditInput = {
  action: AdminAuditAction
  targetType: string
  targetId: string
  actorUserId?: string | null
  metadata?: Record<string, unknown> | null
}

export function sanitizeAuditTarget(value: string) {
  return value.trim().slice(0, 80)
}

export function validateAdminAuditInput(input: AdminAuditInput) {
  if (!sanitizeAuditTarget(input.targetType)) return 'target_type_required'
  if (!sanitizeAuditTarget(input.targetId)) return 'target_id_required'
  return null
}

export async function createAdminAuditLog(input: AdminAuditInput, tx?: Prisma.TransactionClient) {
  const prisma = tx ?? getPrisma()
  if (!prisma) return null

  const validationError = validateAdminAuditInput(input)
  if (validationError) return { error: validationError }

  const log = await prisma.adminAuditLog.create({
    data: {
      action: input.action,
      targetType: sanitizeAuditTarget(input.targetType),
      targetId: sanitizeAuditTarget(input.targetId),
      actorUserId: input.actorUserId ?? null,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonObject) : undefined,
    },
  })

  return { log }
}

export async function listAdminAuditLogs(limit = 80) {
  const prisma = getPrisma()
  if (!prisma) return null

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      actorUser: { select: { id: true, email: true, username: true } },
    },
  })

  return logs
}
