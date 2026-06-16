import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { GenerationJobStatus, GenerationOutputKind } from '@prisma/client'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'
import {
  createGenerationJob,
  deleteGenerationOutputForUser,
  getGenerationOutputDownloadForUser,
  getGenerationJobForUser,
  listGenerationJobsForUser,
  retryGenerationJobForUser,
  setGenerationOutputFavoriteForUser,
  validateGenerationJobInput,
} from './generation.service'

const prisma = getPrisma()
const shouldRunBaseDbTest = createDbTestGate(prisma, 'generation job persistence')
const generationUserId = '880e8400-e29b-41d4-a716-446655440000'
let schemaChecked = false
let schemaReady = false

async function shouldRunDbTest(options: { silent?: boolean } = {}) {
  if (!(await shouldRunBaseDbTest(options))) return false
  if (!prisma) return false
  if (!schemaChecked) {
    schemaChecked = true
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT to_regclass('"GenerationJob"') IS NOT NULL AS "exists"
    `
    schemaReady = rows[0]?.exists === true
  }
  if (schemaReady) return true

  const message =
    '[db-test-skip] generation job persistence ต้องใช้ migration 20260617143000_add_generation_jobs ก่อนรันชุดนี้'
  if (!options.silent && (process.env.CI === 'true' || process.env.REQUIRE_DB_TESTS === 'true')) {
    throw new Error(message)
  }
  if (!options.silent) console.warn(message)
  return false
}

async function cleanup() {
  await prisma?.generationJob.deleteMany({ where: { userId: generationUserId } })
  await prisma?.user.deleteMany({ where: { id: generationUserId } })
}

describe('generation job persistence', () => {
  beforeAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
    await prisma?.user.upsert({
      where: { id: generationUserId },
      update: { email: 'generation@maprang.io', username: 'GenerationUser', tokenBalance: 900 },
      create: {
        id: generationUserId,
        email: 'generation@maprang.io',
        username: 'GenerationUser',
        tokenBalance: 900,
      },
    })
  })

  afterAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
  })

  test('persists a blocked no-debit generation job for the owner', async () => {
    if (!(await shouldRunDbTest())) return
    const preflight = validateGenerationJobInput({
      templateId: 'character-avatar',
      prompt: ' soft portrait ',
    })
    expect(preflight.ok).toBe(true)
    if (!preflight.ok) return

    const result = await createGenerationJob({
      userId: generationUserId,
      template: preflight.template,
      prompt: preflight.sanitized.prompt,
      imageInputs: preflight.sanitized.imageInputs,
      videoInputs: preflight.sanitized.videoInputs,
      prisma,
    })
    const user = await prisma?.user.findUnique({
      where: { id: generationUserId },
      select: { tokenBalance: true },
    })
    const persisted = await prisma?.generationJob.findMany({
      where: { userId: generationUserId },
      orderBy: { createdAt: 'desc' },
    })
    const listed = await listGenerationJobsForUser({ userId: generationUserId, prisma })
    const loaded = await getGenerationJobForUser({ userId: generationUserId, jobId: result.job.id, prisma })
    const otherOwnerLoaded = await getGenerationJobForUser({
      userId: '990e8400-e29b-41d4-a716-446655440000',
      jobId: result.job.id,
      prisma,
    })
    const output = await prisma?.generationOutput.create({
      data: {
        jobId: result.job.id,
        userId: generationUserId,
        kind: GenerationOutputKind.IMAGE,
        url: 'https://example.invalid/private-output.png',
        storageKey: 'avatars/private-output.png',
      },
    })
    if (!output) throw new Error('generation output should be created')
    const favorite = await setGenerationOutputFavoriteForUser({
      userId: generationUserId,
      outputId: output.id,
      isFavorite: true,
      prisma,
    })
    const otherOwnerFavorite = await setGenerationOutputFavoriteForUser({
      userId: '990e8400-e29b-41d4-a716-446655440000',
      outputId: output.id,
      isFavorite: false,
      prisma,
    })
    const unfavorite = await setGenerationOutputFavoriteForUser({
      userId: generationUserId,
      outputId: output.id,
      isFavorite: false,
      prisma,
    })
    const storageResolverCalls: string[] = []
    const signedDownload = await getGenerationOutputDownloadForUser({
      userId: generationUserId,
      outputId: output.id,
      prisma,
      resolveStorageObjectUrl: async (objectPath) => {
        storageResolverCalls.push(objectPath)
        return {
          access: 'signed',
          url: `https://project-ref.supabase.co/storage/v1/object/sign/${objectPath}?token=signed-smoke`,
          expiresIn: 3600,
        }
      },
    })
    const otherOwnerSignedDownload = await getGenerationOutputDownloadForUser({
      userId: '990e8400-e29b-41d4-a716-446655440000',
      outputId: output.id,
      prisma,
      resolveStorageObjectUrl: async () => {
        throw new Error('resolver must not run for another owner')
      },
    })
    const directOutput = await prisma?.generationOutput.create({
      data: {
        jobId: result.job.id,
        userId: generationUserId,
        kind: GenerationOutputKind.IMAGE,
        url: 'https://example.invalid/direct-output.png',
      },
    })
    if (!directOutput) throw new Error('direct generation output should be created')
    const directDownload = await getGenerationOutputDownloadForUser({
      userId: generationUserId,
      outputId: directOutput.id,
      prisma,
    })
    const otherOwnerDownload = await getGenerationOutputDownloadForUser({
      userId: '990e8400-e29b-41d4-a716-446655440000',
      outputId: directOutput.id,
      prisma,
    })
    const otherOwnerDelete = await deleteGenerationOutputForUser({
      userId: '990e8400-e29b-41d4-a716-446655440000',
      outputId: directOutput.id,
      prisma,
    })
    const ownerDelete = await deleteGenerationOutputForUser({
      userId: generationUserId,
      outputId: directOutput.id,
      prisma,
    })
    const deletedOutput = await prisma?.generationOutput.findUnique({ where: { id: directOutput.id } })
    const retry = await retryGenerationJobForUser({
      userId: generationUserId,
      jobId: result.job.id,
      prisma,
    })
    const retriedRecord = retry.job?.id
      ? await prisma?.generationJob.findUnique({ where: { id: retry.job.id } })
      : null
    const userAfterRetry = await prisma?.user.findUnique({
      where: { id: generationUserId },
      select: { tokenBalance: true },
    })

    expect(result.persisted).toBe(true)
    expect(result.job).toMatchObject({
      ownerId: generationUserId,
      templateId: 'character-avatar',
      status: 'blocked',
      failureCode: 'generation_job_backend_not_ready',
      debit: { charged: false, amount: 0 },
      persisted: true,
    })
    expect(user?.tokenBalance).toBe(900)
    expect(persisted).toHaveLength(1)
    expect(persisted?.[0]).toMatchObject({
      userId: generationUserId,
      templateId: 'character-avatar',
      status: GenerationJobStatus.BLOCKED,
      source: 'local-safe-preflight',
      costTokens: 0,
      debitStatus: 'not_charged',
      failureCode: 'generation_job_backend_not_ready',
    })
    expect(listed.persisted).toBe(true)
    expect(listed.jobs).toHaveLength(1)
    expect(listed.jobs[0]).toMatchObject({ id: result.job.id, ownerId: generationUserId })
    expect(loaded).toMatchObject({
      persisted: true,
      job: { id: result.job.id, ownerId: generationUserId, status: 'blocked' },
    })
    expect(otherOwnerLoaded).toMatchObject({ persisted: true, job: null })
    expect(favorite).toMatchObject({
      persisted: true,
      output: {
        id: output.id,
        jobId: result.job.id,
        ownerId: generationUserId,
        kind: 'image',
        url: 'https://example.invalid/private-output.png',
        visibility: 'private',
        isFavorite: true,
      },
    })
    expect(otherOwnerFavorite).toMatchObject({ persisted: true, output: null })
    expect(unfavorite).toMatchObject({
      persisted: true,
      output: { id: output.id, ownerId: generationUserId, isFavorite: false },
    })
    expect(storageResolverCalls).toEqual(['avatars/private-output.png'])
    expect(signedDownload).toMatchObject({
      persisted: true,
      download: {
        outputId: output.id,
        kind: 'image',
        access: 'signed',
        url: 'https://project-ref.supabase.co/storage/v1/object/sign/avatars/private-output.png?token=signed-smoke',
        expiresIn: 3600,
      },
    })
    expect(JSON.stringify(signedDownload)).not.toContain('storageKey')
    expect(otherOwnerSignedDownload).toMatchObject({ persisted: true, download: null })
    expect(directDownload).toMatchObject({
      persisted: true,
      download: {
        outputId: directOutput.id,
        kind: 'image',
        access: 'direct',
        url: 'https://example.invalid/direct-output.png',
        expiresIn: null,
      },
    })
    expect(otherOwnerDownload).toMatchObject({ persisted: true, download: null })
    expect(otherOwnerDelete).toMatchObject({ persisted: true, deleted: false })
    expect(ownerDelete).toMatchObject({ persisted: true, deleted: true })
    expect(deletedOutput).toBeNull()
    expect(retry).toMatchObject({
      persisted: true,
      job: {
        ownerId: generationUserId,
        templateId: 'character-avatar',
        status: 'blocked',
        source: 'local-safe-retry',
        debit: { charged: false, amount: 0 },
      },
    })
    expect(retriedRecord).toMatchObject({
      userId: generationUserId,
      templateId: 'character-avatar',
      status: GenerationJobStatus.BLOCKED,
      source: 'local-safe-retry',
      costTokens: 0,
      debitStatus: 'not_charged',
    })
    expect(userAfterRetry?.tokenBalance).toBe(900)
  })
})
