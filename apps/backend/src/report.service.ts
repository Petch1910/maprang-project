import { Prisma, ReportStatus, ReportTargetType } from '@prisma/client'
import { defaultUserId } from './config'
import { getPrisma } from './db'

export type CreateReportInput = {
  targetType: ReportTargetType
  characterId?: string
  messageId?: string
  reason: string
  details?: string | null
  metadata?: Record<string, unknown> | null
}

export type ReportListOptions = {
  status?: ReportStatus
  targetType?: ReportTargetType
  limit?: number
}

function sanitizeReason(reason: string) {
  return reason.trim().slice(0, 80)
}

function sanitizeDetails(details?: string | null) {
  const value = details?.trim()
  return value ? value.slice(0, 1200) : null
}

export function validateReportInput(input: CreateReportInput) {
  const reason = sanitizeReason(input.reason)
  if (!reason) return 'reason_required'
  if (input.targetType === ReportTargetType.CHARACTER && !input.characterId) return 'character_id_required'
  if (input.targetType === ReportTargetType.MESSAGE && !input.messageId) return 'message_id_required'
  return null
}

export async function createReport(input: CreateReportInput, reporterId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const validationError = validateReportInput(input)
  if (validationError) return { error: validationError }

  if (input.characterId) {
    const character = await prisma.character.findFirst({
      where: { id: input.characterId, deletedAt: null },
      select: { id: true },
    })
    if (!character) return { error: 'character_not_found' }
  }

  if (input.messageId) {
    const message = await prisma.message.findFirst({
      where: { id: input.messageId, deletedAt: null },
      select: { id: true, chat: { select: { characterId: true } } },
    })
    if (!message) return { error: 'message_not_found' }
    input.characterId ??= message.chat.characterId
  }

  const report = await prisma.report.create({
    data: {
      targetType: input.targetType,
      characterId: input.characterId ?? null,
      messageId: input.messageId ?? null,
      reporterId,
      reason: sanitizeReason(input.reason),
      details: sanitizeDetails(input.details),
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonObject) : undefined,
    },
    include: {
      character: { select: { id: true, name: true } },
      message: { select: { id: true, role: true, content: true, chatId: true } },
    },
  })

  return { report: publicReport(report) }
}

export async function listReports(options: ReportListOptions = {}) {
  const prisma = getPrisma()
  if (!prisma) return null

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const reports = await prisma.report.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.targetType ? { targetType: options.targetType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      character: { select: { id: true, name: true, status: true, visibility: true } },
      message: { select: { id: true, role: true, content: true, chatId: true } },
      reporter: { select: { id: true, email: true, username: true } },
    },
  })

  return reports.map(publicReport)
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  const prisma = getPrisma()
  if (!prisma) return null

  const report = await prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      reviewedAt: status === ReportStatus.PENDING ? null : new Date(),
    },
    include: {
      character: { select: { id: true, name: true, status: true, visibility: true } },
      message: { select: { id: true, role: true, content: true, chatId: true } },
      reporter: { select: { id: true, email: true, username: true } },
    },
  })

  return publicReport(report)
}

function publicReport(report: {
  id: string
  targetType: ReportTargetType
  reason: string
  details: string | null
  status: ReportStatus
  reporterId: string
  characterId: string | null
  messageId: string | null
  createdAt: Date
  updatedAt: Date
  reviewedAt: Date | null
  character?: unknown
  message?: unknown
  reporter?: unknown
}) {
  return {
    id: report.id,
    targetType: report.targetType,
    reason: report.reason,
    details: report.details,
    status: report.status,
    reporterId: report.reporterId,
    characterId: report.characterId,
    messageId: report.messageId,
    character: report.character,
    message: report.message,
    reporter: report.reporter,
    reviewedAt: report.reviewedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }
}
