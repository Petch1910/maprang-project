import { AdminAuditAction, CharacterStatus, Prisma, ReportStatus, ReportTargetType, Visibility } from '@prisma/client'
import { createAdminAuditLog } from './audit.service'
import { defaultUserId } from './config'
import { getPrisma } from './db'
import { isSafeRecordId, isUuid } from './security'

export type CreateReportInput = {
  targetType: ReportTargetType
  characterId?: string
  messageId?: string
  generationOutputId?: string
  reason: string
  details?: string | null
  metadata?: Record<string, unknown> | null
}

export type ReportListOptions = {
  status?: ReportStatus
  targetType?: ReportTargetType
  limit?: number
}

export type ReportAdminAction = 'HIDE_CHARACTER' | 'ARCHIVE_MESSAGE' | 'HIDE_GENERATION_OUTPUT'

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
  if (input.targetType === ReportTargetType.GENERATION_OUTPUT && !input.generationOutputId) return 'generation_output_id_required'
  if (input.characterId && !isUuid(input.characterId)) return 'invalid_character_id'
  if (input.messageId && !isSafeRecordId(input.messageId)) return 'invalid_message_id'
  if (input.generationOutputId && !isUuid(input.generationOutputId)) return 'invalid_generation_output_id'
  return null
}

export async function createReport(input: CreateReportInput, reporterId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const validationError = validateReportInput(input)
  if (validationError) return { error: validationError }

  if (input.characterId) {
    const character = await prisma.character.findFirst({
      where: {
        id: input.characterId,
        deletedAt: null,
        OR: [
          { status: CharacterStatus.PUBLISHED, visibility: Visibility.PUBLIC },
          { creatorId: reporterId },
        ],
      },
      select: { id: true },
    })
    if (!character) return { error: 'character_not_found' }
  }

  if (input.messageId) {
    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        deletedAt: null,
        chat: {
          userId: reporterId,
          deletedAt: null,
        },
      },
      select: { id: true, chat: { select: { characterId: true } } },
    })
    if (!message) return { error: 'message_not_found' }
    input.characterId ??= message.chat.characterId
  }

  if (input.generationOutputId) {
    const generationOutput = await prisma.generationOutput.findFirst({
      where: {
        id: input.generationOutputId,
        visibility: Visibility.PUBLIC,
      },
      select: { id: true },
    })
    if (!generationOutput) return { error: 'generation_output_not_found' }
  }

  const report = await prisma.report.create({
    data: {
      targetType: input.targetType,
      characterId: input.characterId ?? null,
      messageId: input.messageId ?? null,
      generationOutputId: input.generationOutputId ?? null,
      reporterId,
      reason: sanitizeReason(input.reason),
      details: sanitizeDetails(input.details),
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonObject) : undefined,
    },
    include: {
      character: { select: { id: true, name: true } },
      message: { select: { id: true, role: true, content: true, chatId: true } },
      generationOutput: { select: { id: true, kind: true, url: true, visibility: true } },
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
      generationOutput: { select: { id: true, kind: true, url: true, visibility: true } },
      reporter: { select: { id: true, email: true, username: true } },
    },
  })

  return reports.map(publicReport)
}

export async function updateReportStatus(reportId: string, status: ReportStatus, actorUserId?: string | null) {
  const prisma = getPrisma()
  if (!prisma) return null

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.update({
      where: { id: reportId },
      data: {
        status,
        reviewedAt: status === ReportStatus.PENDING ? null : new Date(),
      },
      include: {
        character: { select: { id: true, name: true, status: true, visibility: true } },
        message: { select: { id: true, role: true, content: true, chatId: true } },
        generationOutput: { select: { id: true, kind: true, url: true, visibility: true } },
        reporter: { select: { id: true, email: true, username: true } },
      },
    })

    await createAdminAuditLog(
      {
        action: AdminAuditAction.REPORT_STATUS_UPDATE,
        targetType: 'REPORT',
        targetId: reportId,
        actorUserId,
        metadata: {
          status,
          targetType: report.targetType,
          characterId: report.characterId,
          messageId: report.messageId,
          generationOutputId: report.generationOutputId,
        },
      },
      tx,
    )

    return publicReport(report)
  })
}

export function validateReportAdminAction(action: string) {
  if (action !== 'HIDE_CHARACTER' && action !== 'ARCHIVE_MESSAGE' && action !== 'HIDE_GENERATION_OUTPUT') return 'invalid_report_action'
  return null
}

export async function applyReportAdminAction(reportId: string, action: ReportAdminAction, actorUserId?: string | null) {
  const prisma = getPrisma()
  if (!prisma) return null

  const validationError = validateReportAdminAction(action)
  if (validationError) return { error: validationError }

  return prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        characterId: true,
        messageId: true,
        generationOutputId: true,
      },
    })
    if (!report) return { error: 'report_not_found' }

    if (action === 'HIDE_CHARACTER') {
      if (!report.characterId) return { error: 'character_report_required' }
      await tx.character.update({
        where: { id: report.characterId },
        data: {
          status: CharacterStatus.ARCHIVED,
          visibility: Visibility.PRIVATE,
          deletedAt: new Date(),
        },
      })
      await createAdminAuditLog(
        {
          action: AdminAuditAction.HIDE_CHARACTER,
          targetType: 'CHARACTER',
          targetId: report.characterId,
          actorUserId,
          metadata: { reportId },
        },
        tx,
      )
    }

    if (action === 'ARCHIVE_MESSAGE') {
      if (!report.messageId) return { error: 'message_report_required' }
      await tx.message.update({
        where: { id: report.messageId },
        data: {
          deletedAt: new Date(),
        },
      })
      await createAdminAuditLog(
        {
          action: AdminAuditAction.ARCHIVE_MESSAGE,
          targetType: 'MESSAGE',
          targetId: report.messageId,
          actorUserId,
          metadata: { reportId, characterId: report.characterId },
        },
        tx,
      )
    }

    if (action === 'HIDE_GENERATION_OUTPUT') {
      if (!report.generationOutputId) return { error: 'generation_output_report_required' }
      await tx.generationOutput.update({
        where: { id: report.generationOutputId },
        data: {
          visibility: Visibility.PRIVATE,
        },
      })
      await createAdminAuditLog(
        {
          action: AdminAuditAction.HIDE_GENERATION_OUTPUT,
          targetType: 'GENERATION_OUTPUT',
          targetId: report.generationOutputId,
          actorUserId,
          metadata: { reportId },
        },
        tx,
      )
    }

    const updatedReport = await tx.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        reviewedAt: new Date(),
      },
      include: {
        character: { select: { id: true, name: true, status: true, visibility: true } },
        message: { select: { id: true, role: true, content: true, chatId: true, deletedAt: true } },
        generationOutput: { select: { id: true, kind: true, url: true, visibility: true } },
        reporter: { select: { id: true, email: true, username: true } },
      },
    })

    return { action, report: publicReport(updatedReport) }
  })
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
  generationOutputId: string | null
  createdAt: Date
  updatedAt: Date
  reviewedAt: Date | null
  character?: unknown
  message?: unknown
  generationOutput?: unknown
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
    generationOutputId: report.generationOutputId,
    character: report.character,
    message: report.message,
    generationOutput: report.generationOutput,
    reporter: report.reporter,
    reviewedAt: report.reviewedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }
}
