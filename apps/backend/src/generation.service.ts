import {
  GenerationJobStatus as PrismaGenerationJobStatus,
  type GenerationOutputKind,
  type GenerationOutputVisibility,
  type PrismaClient,
} from '@prisma/client'
import { getPrisma } from './db'
import { resolveStorageObjectUrl } from './storage.service'

export type GenerationMode = 'text-to-image' | 'image-to-image' | 'image-to-video' | 'advanced-video'
export type GenerationJobStatus = 'blocked' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export type GenerationTemplate = {
  id: string
  title: string
  mode: GenerationMode
  creditCost: number
  promptRequired: boolean
  imageInputCount: number
  videoInputCount: number
  acceptedFileTypes: string[]
  maxFileSizeMb: number
  maxDurationSeconds?: number
  aspectRatios: string[]
  adultOnly: boolean
  providerRequired: boolean
  enabled: boolean
}

export type GenerationJobInput = {
  templateId: string
  prompt?: string | null
  imageInputs?: string[]
  videoInputs?: string[]
  imageInputMetadata?: GenerationInputMetadata[]
  videoInputMetadata?: GenerationInputMetadata[]
}

export type GenerationInputMetadata = {
  name?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  durationSeconds?: number | null
}

export type GenerationJobPreflight =
  | {
      ok: true
      template: GenerationTemplate
      sanitized: {
        prompt: string
        imageInputs: string[]
        videoInputs: string[]
        imageInputMetadata: GenerationInputMetadata[]
        videoInputMetadata: GenerationInputMetadata[]
      }
    }
  | {
      ok: false
      status: number
      error: string
      message: string
    }

export const generationTemplates: GenerationTemplate[] = [
  {
    id: 'character-avatar',
    title: 'ภาพตัวละครสำหรับสตูดิโอ',
    mode: 'text-to-image',
    creditCost: 600,
    promptRequired: true,
    imageInputCount: 0,
    videoInputCount: 0,
    acceptedFileTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxFileSizeMb: 10,
    aspectRatios: ['1:1', '2:3', '3:4'],
    adultOnly: false,
    providerRequired: true,
    enabled: true,
  },
  {
    id: 'character-consistency',
    title: 'คงหน้าตาตัวละครจากรูปอ้างอิง',
    mode: 'image-to-image',
    creditCost: 600,
    promptRequired: true,
    imageInputCount: 1,
    videoInputCount: 0,
    acceptedFileTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxFileSizeMb: 10,
    aspectRatios: ['1:1', '2:3', '3:4', '9:16'],
    adultOnly: false,
    providerRequired: true,
    enabled: true,
  },
  {
    id: 'image-to-video-preview',
    title: 'วิดีโอจากภาพอ้างอิง',
    mode: 'image-to-video',
    creditCost: 6000,
    promptRequired: true,
    imageInputCount: 1,
    videoInputCount: 0,
    acceptedFileTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxFileSizeMb: 10,
    maxDurationSeconds: 30,
    aspectRatios: ['9:16', '16:9', '1:1'],
    adultOnly: false,
    providerRequired: true,
    enabled: false,
  },
]

export function listGenerationTemplates() {
  return generationTemplates
}

function sanitizeString(value: string | null | undefined) {
  return (value ?? '').trim()
}

function sanitizeStringArray(value: string[] | undefined) {
  if (!Array.isArray(value)) return []
  return value.map((item) => item.trim()).filter(Boolean)
}

function sanitizeInputMetadata(value: GenerationInputMetadata[] | undefined) {
  if (!Array.isArray(value)) return []
  return value.map((item) => ({
    name: sanitizeString(item.name),
    mimeType: sanitizeString(item.mimeType).toLowerCase(),
    sizeBytes: typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes) ? item.sizeBytes : null,
    durationSeconds:
      typeof item.durationSeconds === 'number' && Number.isFinite(item.durationSeconds) ? item.durationSeconds : null,
  }))
}

function validateInputMetadata(input: {
  template: GenerationTemplate
  metadata: GenerationInputMetadata[]
  kind: 'image' | 'video'
}) {
  const maxBytes = input.template.maxFileSizeMb * 1024 * 1024
  for (let index = 0; index < input.metadata.length; index += 1) {
    const item = input.metadata[index]
    if (!item) continue
    const position = index + 1
    if (item.mimeType && !input.template.acceptedFileTypes.includes(item.mimeType)) {
      return {
        ok: false as const,
        status: 400,
        error: `generation_${input.kind}_input_type_invalid`,
        message: `${input.kind === 'image' ? 'รูป' : 'วิดีโอ'}อ้างอิงช่องที่ ${position} ใช้ชนิดไฟล์ที่ไม่รองรับ`,
      }
    }
    if (typeof item.sizeBytes === 'number' && item.sizeBytes > maxBytes) {
      return {
        ok: false as const,
        status: 400,
        error: `generation_${input.kind}_input_too_large`,
        message: `${input.kind === 'image' ? 'รูป' : 'วิดีโอ'}อ้างอิงช่องที่ ${position} ต้องมีขนาดไม่เกิน ${input.template.maxFileSizeMb}MB`,
      }
    }
    if (
      input.kind === 'video' &&
      typeof input.template.maxDurationSeconds === 'number' &&
      typeof item.durationSeconds === 'number' &&
      item.durationSeconds > input.template.maxDurationSeconds
    ) {
      return {
        ok: false as const,
        status: 400,
        error: 'generation_video_input_too_long',
        message: `วิดีโออ้างอิงช่องที่ ${position} ต้องยาวไม่เกิน ${input.template.maxDurationSeconds} วินาที`,
      }
    }
  }
  return { ok: true as const }
}

export function validateGenerationJobInput(input: GenerationJobInput): GenerationJobPreflight {
  const template = generationTemplates.find((item) => item.id === input.templateId)
  if (!template) {
    return {
      ok: false,
      status: 400,
      error: 'generation_template_not_found',
      message: 'ไม่พบแม่แบบสร้างภาพที่เลือก',
    }
  }
  if (!template.enabled) {
    return {
      ok: false,
      status: 409,
      error: 'generation_template_disabled',
      message: 'แม่แบบนี้ยังไม่เปิดใช้งานในระบบปัจจุบัน',
    }
  }

  const prompt = sanitizeString(input.prompt)
  const imageInputs = sanitizeStringArray(input.imageInputs)
  const videoInputs = sanitizeStringArray(input.videoInputs)
  const imageInputMetadata = sanitizeInputMetadata(input.imageInputMetadata)
  const videoInputMetadata = sanitizeInputMetadata(input.videoInputMetadata)

  if (template.promptRequired && !prompt) {
    return {
      ok: false,
      status: 400,
      error: 'generation_prompt_required',
      message: 'กรอกคำสั่งภาพหรือบริบทก่อนสร้าง',
    }
  }
  if (imageInputs.length < template.imageInputCount) {
    return {
      ok: false,
      status: 400,
      error: 'generation_image_input_required',
      message: `ต้องแนบรูปอ้างอิง ${template.imageInputCount} รูปก่อนสร้าง`,
    }
  }
  if (videoInputs.length < template.videoInputCount) {
    return {
      ok: false,
      status: 400,
      error: 'generation_video_input_required',
      message: `ต้องแนบวิดีโออ้างอิง ${template.videoInputCount} ไฟล์ก่อนสร้าง`,
    }
  }
  const imageMetadataValidation = validateInputMetadata({
    template,
    metadata: imageInputMetadata,
    kind: 'image',
  })
  if (!imageMetadataValidation.ok) return imageMetadataValidation

  const videoMetadataValidation = validateInputMetadata({
    template,
    metadata: videoInputMetadata,
    kind: 'video',
  })
  if (!videoMetadataValidation.ok) return videoMetadataValidation

  return {
    ok: true,
    template,
    sanitized: {
      prompt,
      imageInputs,
      videoInputs,
      imageInputMetadata,
      videoInputMetadata,
    },
  }
}

export function buildBlockedGenerationJob(input: {
  userId: string
  template: GenerationTemplate
  prompt: string
  imageInputs: string[]
  videoInputs: string[]
}) {
  return {
    id: `blocked-${input.template.id}`,
    ownerId: input.userId,
    templateId: input.template.id,
    status: 'blocked' as GenerationJobStatus,
    source: 'local-safe-preflight',
    failureCode: 'generation_job_backend_not_ready',
    message: 'ระบบ job/storage สำหรับสร้างภาพจริงยังไม่เปิด ใช้โหมดร่างในเครื่องหรือเชื่อม provider จริงก่อน',
    debit: {
      charged: false,
      amount: 0,
      reason: 'ยังไม่รับงานเข้าคิว จึงไม่หักโทเคน',
    },
    input: {
      prompt: input.prompt,
      imageInputCount: input.imageInputs.length,
      videoInputCount: input.videoInputs.length,
    },
  }
}

function publicGenerationJob(record: {
  id: string
  userId: string
  templateId: string
  status: PrismaGenerationJobStatus
  source: string
  failureCode: string | null
  failureMessage: string | null
  prompt: string
  imageInputs: string[]
  videoInputs: string[]
  costTokens: number
  debitStatus: string
  createdAt: Date
  updatedAt?: Date
  outputs?: Array<{
    id: string
    kind: GenerationOutputKind
    url: string | null
    visibility: GenerationOutputVisibility
    isFavorite: boolean
    createdAt: Date
  }>
}) {
  return {
    id: record.id,
    ownerId: record.userId,
    templateId: record.templateId,
    status: record.status.toLowerCase() as GenerationJobStatus,
    source: record.source,
    failureCode: record.failureCode ?? 'generation_job_backend_not_ready',
    message: record.failureMessage ?? 'ระบบบันทึกงานสร้างภาพไว้แล้ว แต่ยังไม่เปิดคิวสร้างภาพจริง',
    debit: {
      charged: false,
      amount: record.costTokens,
      reason: record.debitStatus === 'not_charged' ? 'ยังไม่รับงานเข้าคิว จึงไม่หักโทเคน' : record.debitStatus,
    },
    input: {
      prompt: record.prompt,
      imageInputCount: record.imageInputs.length,
      videoInputCount: record.videoInputs.length,
    },
    persisted: true,
    createdAt: record.createdAt.toISOString(),
    updatedAt: (record.updatedAt ?? record.createdAt).toISOString(),
    outputs: (record.outputs ?? []).map((output) => ({
      id: output.id,
      kind: output.kind.toLowerCase(),
      url: output.url,
      visibility: output.visibility.toLowerCase(),
      isFavorite: output.isFavorite,
      createdAt: output.createdAt.toISOString(),
    })),
  }
}

function publicGenerationOutput(record: {
  id: string
  jobId: string
  userId: string
  kind: GenerationOutputKind
  url: string | null
  visibility: GenerationOutputVisibility
  isFavorite: boolean
  createdAt: Date
  updatedAt?: Date
}) {
  return {
    id: record.id,
    jobId: record.jobId,
    ownerId: record.userId,
    kind: record.kind.toLowerCase(),
    url: record.url,
    visibility: record.visibility.toLowerCase(),
    isFavorite: record.isFavorite,
    createdAt: record.createdAt.toISOString(),
    updatedAt: (record.updatedAt ?? record.createdAt).toISOString(),
  }
}

function clampGenerationListLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 20
  return Math.min(50, Math.max(1, Math.trunc(value ?? 20)))
}

function shouldThrowPersistenceError() {
  return process.env.NODE_ENV === 'production'
}

export async function createGenerationJob(input: {
  userId: string
  template: GenerationTemplate
  prompt: string
  imageInputs: string[]
  videoInputs: string[]
  prisma?: PrismaClient | null
}) {
  const fallbackJob = buildBlockedGenerationJob(input)
  const prisma = input.prisma === undefined ? getPrisma() : input.prisma
  if (!prisma) return { job: fallbackJob, persisted: false }

  try {
    const record = await prisma.generationJob.create({
      data: {
        userId: input.userId,
        templateId: input.template.id,
        mode: input.template.mode,
        status: PrismaGenerationJobStatus.BLOCKED,
        source: 'local-safe-preflight',
        prompt: input.prompt,
        imageInputs: input.imageInputs,
        videoInputs: input.videoInputs,
        costTokens: 0,
        debitStatus: 'not_charged',
        failureCode: 'generation_job_backend_not_ready',
        failureMessage: 'ระบบบันทึกงานสร้างภาพไว้แล้ว แต่ยังไม่เปิดคิวสร้างภาพจริง',
        metadata: {
          creditCost: input.template.creditCost,
          providerRequired: input.template.providerRequired,
        },
      },
    })
    return { job: publicGenerationJob(record), persisted: true }
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return {
      job: {
        ...fallbackJob,
        persistenceWarning: 'generation_persistence_unavailable',
      },
      persisted: false,
    }
  }
}

export async function listGenerationJobsForUser(input: {
  userId: string
  limit?: number
  prisma?: PrismaClient | null
}) {
  const prisma = input.prisma === undefined ? getPrisma() : input.prisma
  if (!prisma) return { jobs: [], persisted: false, persistenceWarning: 'generation_persistence_unavailable' }

  try {
    const jobs = await prisma.generationJob.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: 'desc' },
      take: clampGenerationListLimit(input.limit),
      include: {
        outputs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return { jobs: jobs.map(publicGenerationJob), persisted: true }
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return { jobs: [], persisted: false, persistenceWarning: 'generation_persistence_unavailable' }
  }
}

export async function getGenerationJobForUser(input: {
  userId: string
  jobId: string
  prisma?: PrismaClient | null
}) {
  const prisma = input.prisma === undefined ? getPrisma() : input.prisma
  if (!prisma) return { job: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }

  try {
    const job = await prisma.generationJob.findFirst({
      where: { id: input.jobId, userId: input.userId },
      include: {
        outputs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return { job: job ? publicGenerationJob(job) : null, persisted: true }
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return { job: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }
  }
}

export async function retryGenerationJobForUser(input: {
  userId: string
  jobId: string
  prisma?: PrismaClient | null
}) {
  const prisma = input.prisma === undefined ? getPrisma() : input.prisma
  if (!prisma) return { job: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }

  try {
    const original = await prisma.generationJob.findFirst({
      where: { id: input.jobId, userId: input.userId },
    })
    if (!original) return { job: null, persisted: true }

    if (
      original.status === PrismaGenerationJobStatus.QUEUED ||
      original.status === PrismaGenerationJobStatus.RUNNING
    ) {
      return {
        job: null,
        persisted: true,
        retryBlockedReason: 'generation_job_retry_in_progress',
      }
    }

    const retried = await prisma.generationJob.create({
      data: {
        userId: original.userId,
        templateId: original.templateId,
        mode: original.mode,
        status: PrismaGenerationJobStatus.BLOCKED,
        source: 'local-safe-retry',
        prompt: original.prompt,
        imageInputs: original.imageInputs,
        videoInputs: original.videoInputs,
        costTokens: 0,
        debitStatus: 'not_charged',
        failureCode: 'generation_job_backend_not_ready',
        failureMessage: 'บันทึกงาน retry แล้ว แต่คิวสร้างภาพจริงยังไม่เปิดใช้งานในโหมดนี้',
        metadata: {
          retryOfJobId: original.id,
          retryOfStatus: original.status,
        },
      },
    })

    return { job: publicGenerationJob(retried), persisted: true }
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return { job: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }
  }
}

export async function setGenerationOutputFavoriteForUser(input: {
  userId: string
  outputId: string
  isFavorite: boolean
  prisma?: PrismaClient | null
}) {
  const prisma = input.prisma === undefined ? getPrisma() : input.prisma
  if (!prisma) return { output: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }

  try {
    const result = await prisma.generationOutput.updateMany({
      where: { id: input.outputId, userId: input.userId },
      data: { isFavorite: input.isFavorite },
    })
    if (result.count === 0) return { output: null, persisted: true }

    const output = await prisma.generationOutput.findFirst({
      where: { id: input.outputId, userId: input.userId },
    })
    return { output: output ? publicGenerationOutput(output) : null, persisted: true }
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return { output: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }
  }
}

export async function getGenerationOutputDownloadForUser(input: {
  userId: string
  outputId: string
  prisma?: PrismaClient | null
  resolveStorageObjectUrl?: typeof resolveStorageObjectUrl
}) {
  const prisma = input.prisma === undefined ? getPrisma() : input.prisma
  if (!prisma) return { download: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }

  let output: Awaited<ReturnType<typeof prisma.generationOutput.findFirst>>
  try {
    output = await prisma.generationOutput.findFirst({
      where: { id: input.outputId, userId: input.userId },
    })
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return { download: null, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }
  }

  if (!output) return { download: null, persisted: true }

  try {
    if (output.storageKey) {
      const resolveObjectUrl = input.resolveStorageObjectUrl ?? resolveStorageObjectUrl
      const resolved = await resolveObjectUrl(output.storageKey)
      return {
        download: {
          outputId: output.id,
          kind: output.kind.toLowerCase(),
          access: resolved.access,
          url: resolved.url,
          expiresIn: resolved.expiresIn,
        },
        persisted: true,
      }
    }

    if (output.url) {
      return {
        download: {
          outputId: output.id,
          kind: output.kind.toLowerCase(),
          access: 'direct' as const,
          url: output.url,
          expiresIn: null,
        },
        persisted: true,
      }
    }

    return { download: null, persisted: true, reason: 'generation_output_file_unavailable' }
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return { download: null, persisted: false, persistenceWarning: 'generation_storage_unavailable' }
  }
}

export async function deleteGenerationOutputForUser(input: {
  userId: string
  outputId: string
  prisma?: PrismaClient | null
}) {
  const prisma = input.prisma === undefined ? getPrisma() : input.prisma
  if (!prisma) return { deleted: false, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }

  try {
    const result = await prisma.generationOutput.deleteMany({
      where: { id: input.outputId, userId: input.userId },
    })
    return { deleted: result.count > 0, persisted: true }
  } catch (error) {
    if (shouldThrowPersistenceError()) throw error
    return { deleted: false, persisted: false, persistenceWarning: 'generation_persistence_unavailable' }
  }
}
