import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  collectBackendSecurityFindings,
  collectBackendSecurityFindingsFromSource,
  collectKnownRouteErrorMessages,
  collectRouteErrorResponseCodes,
  collectSourceFiles,
  runBackendSecurityAudit,
} from './backend-security-audit'

function messagesFor(content: string, file = 'fixture.ts') {
  return collectBackendSecurityFindingsFromSource(file, content).map((finding) => finding.message)
}

describe('backend security audit', () => {
  test('collects direct source-file targets and skips test fixtures', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'maprang-security-audit-'))
    try {
      const source = join(dir, 'index.ts')
      const testSource = join(dir, 'index.test.ts')
      const nestedDir = join(dir, 'src')
      const nestedSource = join(nestedDir, 'route.ts')
      await mkdir(nestedDir)
      await writeFile(source, 'export const ok = true')
      await writeFile(testSource, 'export const skipped = true')
      await writeFile(nestedSource, 'export const nested = true')

      expect(await collectSourceFiles(source)).toEqual([source])
      expect((await collectSourceFiles(dir)).sort()).toEqual([source, nestedSource].sort())
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('catches unsafe raw SQL helpers', () => {
    const messages = messagesFor(`
      await prisma.$queryRawUnsafe('select * from "User" where id = ' + userId)
      await prisma.$executeRawUnsafe('delete from "Chat"')
      await prisma.$queryRaw('select * from "Chat" where id = ' + chatId)
      await prisma.$executeRaw('delete from "Chat" where id = ' + chatId)
      Prisma.raw(userInput)
    `)

    expect(messages).toEqual(
      expect.arrayContaining([
        'ห้ามใช้ Prisma $queryRawUnsafe; ให้ใช้ Prisma query builders หรือ tagged $queryRaw พร้อม parameters.',
        'ห้ามใช้ Prisma $executeRawUnsafe; ให้ใช้ Prisma query builders หรือ tagged $executeRaw พร้อม parameters.',
        'ห้ามใช้ Prisma $queryRaw แบบ function call; ให้ใช้ tagged template parameterization.',
        'ห้ามใช้ Prisma $executeRaw แบบ function call; ให้ใช้ tagged template parameterization.',
        'ห้ามใช้ Prisma.raw เพราะอาจข้าม parameterization.',
      ]),
    )
  })

  test('allows tagged raw SQL parameterization', () => {
    expect(
      messagesFor(
        [
          'await prisma.$queryRaw<{ balance: number }[]>`SELECT balance FROM "User" WHERE id = ${userId}`',
          'await prisma.$executeRaw`UPDATE "User" SET balance = balance - ${amount} WHERE id = ${userId}`',
        ].join('\n'),
      ),
    ).toEqual([])
  })

  test('catches raw provider error logging after classification', () => {
    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console.error('สตรีมแชทไม่สำเร็จ:', providerFailure, error)
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console.error('สตรีมแชทไม่สำเร็จ:', providerFailure)
      `),
    ).toEqual([])
  })

  test('catches direct raw error object logging', () => {
    expect(
      messagesFor(`
        try {
          await seed()
        } catch (error) {
          console.error(error)
        }
      `, 'prisma/seed.ts'),
    ).toContain('ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.')

    expect(
      messagesFor(`
        try {
          await seed()
        } catch (error) {
          console.error(summarizeSeedError(error))
        }
      `, 'prisma/seed.ts'),
    ).toEqual([])
  })

  test('catches raw error message details in route responses', () => {
    const messages = messagesFor(
      `
        export const routes = new Elysia()
          .get('/admin/evals/local', async () => {
            try {
              return await runLocalEvalSuite()
            } catch (error) {
              return {
                error: 'local_eval_unavailable',
                message: 'รันชุดทดสอบไม่สำเร็จ',
                detail: error instanceof Error ? error.message : String(error),
              }
            }
          })
      `,
      'apps/backend/src/admin.routes.ts',
    )

    expect(messages).toContain('route response ห้ามส่ง raw error.message ใน detail; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.')
  })

  test('catches direct raw error details in route responses', () => {
    expect(
      messagesFor(
        `
          export const routes = new Elysia()
            .get('/admin/evals/local', async () => {
              try {
                return await runLocalEvalSuite()
              } catch (error) {
                return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: String(error) }
              }
            })
        `,
        'apps/backend/src/admin.routes.ts',
      ),
    ).toContain('route response ห้ามส่ง raw error detail ตรงๆ; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.')

    expect(
      messagesFor(
        `
          export const routes = new Elysia()
            .get('/admin/evals/local', async () => {
              try {
                return await runLocalEvalSuite()
              } catch (error) {
                return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: error.message }
              }
            })
        `,
        'apps/backend/src/admin.routes.ts',
      ),
    ).toContain('route response ห้ามส่ง raw error detail ตรงๆ; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.')
  })

  test('catches admin routes without admin api key guards', () => {
    expect(
      messagesFor(`
        export const adminRoutes = new Elysia()
          .get('/admin/summary', ({ set }) => {
            return { ok: true }
          })
      `),
    ).toContain('route ผู้ดูแลยังไม่มี requireAdminApiKey guard ใน block ของ handler.')
  })

  test('allows admin routes with admin api key guards', () => {
    expect(
      messagesFor(`
        export const adminRoutes = new Elysia()
          .post('/admin/reports', ({ request, set }) => {
            if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }
            return { ok: true }
          })
      `),
    ).toEqual([])
  })

  test('catches resource id routes without UUID guards', () => {
    expect(
      messagesFor(`
        export const characterRoutes = new Elysia()
          .get('/characters/:id', async ({ params }) => {
            return prisma.character.findFirst({ where: { id: params.id } })
          })
      `),
    ).toContain('route ที่มี /:id ยังไม่มี rejectInvalidUuid guard ก่อนเข้าถึงข้อมูล.')
  })

  test('allows resource id routes with UUID guards', () => {
    expect(
      messagesFor(`
        export const characterRoutes = new Elysia()
          .delete('/characters/:id', async ({ params, set }) => {
            const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
            if (invalidId) return invalidId
            return deleteCharacter(params.id)
          })
      `),
    ).toEqual([])
  })

  test('catches route error responses without Thai-first messages', () => {
    const literalMessages = messagesFor(`
      export const reportRoutes = new Elysia()
        .post('/reports', ({ set }) => {
          set.status = 503
          return { error: 'database_not_configured' }
        })
    `, 'report.routes.ts')
    const dynamicMessages = messagesFor(`
      export const reportRoutes = new Elysia()
        .post('/reports', ({ set, result }) => {
          set.status = 422
          return { error: result.error }
        })
    `, 'report.routes.ts')

    expect(literalMessages).toContain('route error response ยังไม่มี message แบบ Thai-first; ใช้ routeErrorResponse หรือใส่ message.')
    expect(dynamicMessages).toContain('route error response ยังไม่มี message แบบ Thai-first; ใช้ routeErrorResponse หรือใส่ message.')
  })

  test('allows route error responses with explicit messages or route helper', () => {
    expect(
      messagesFor(`
        export const uploadRoutes = new Elysia()
          .post('/uploads/avatar', () => {
            if (!file) return { error: 'avatar_file_required', message: avatarStorageMessages.fileRequired }
            return routeErrorResponse('database_not_configured')
          })
      `, 'upload.routes.ts'),
    ).toEqual([])
  })

  test('catches route raw error logging', () => {
    expect(
      messagesFor(`
        export const uploadRoutes = new Elysia()
          .post('/uploads/avatar', async () => {
            try {
              return await uploadAvatarFile()
            } catch (error) {
              console.error('อัปโหลดรูปตัวละครไม่สำเร็จ:', error)
              return { error: 'avatar_storage_unavailable', message: 'พื้นที่เก็บรูปตัวละครยังไม่พร้อมใช้งาน' }
            }
          })
      `, 'upload.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        export const uploadRoutes = new Elysia()
          .post('/uploads/avatar', async () => {
            try {
              return await uploadAvatarFile()
            } catch (error) {
              console.error('อัปโหลดรูปตัวละครไม่สำเร็จ:', safeRouteErrorSummary(error))
              return { error: 'avatar_storage_unavailable', message: 'พื้นที่เก็บรูปตัวละครยังไม่พร้อมใช้งาน' }
            }
          })
      `, 'upload.routes.ts'),
    ).toEqual([])
  })

  test('catches route raw error throws', () => {
    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat/stream', async () => {
            try {
              return streamChat()
            } catch (error) {
              throw error
            }
          })
      `, 'chat.routes.ts'),
    ).toContain('route throw raw error object ตรงๆ ไม่ได้; คืน routeErrorResponse หรือ response ที่ควบคุมข้อความได้.')

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat/stream', async ({ set }) => {
            try {
              return streamChat()
            } catch (error) {
              console.error('เริ่มสตรีมแชทไม่สำเร็จ:', safeRouteErrorSummary(error))
              set.status = 500
              return routeErrorResponse('unknown_error')
            }
          })
      `, 'chat.routes.ts'),
    ).toEqual([])
  })

  test('catches route catch responses that expose raw error messages', () => {
    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia()
            .post('/chat', async () => {
              try {
                return await sendChat()
              } catch (error) {
                return { error: 'chat_failed', message: error.message }
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toContain('route catch ห้ามคืน error.message เป็น message ตรงๆ; ใช้ routeErrorResponse หรือข้อความที่ควบคุมได้.')
  })

  test('catches route catch responses that expose stringified raw errors', () => {
    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia()
            .post('/chat', async () => {
              try {
                return await sendChat()
              } catch (error) {
                return { error: 'chat_failed', message: String(error) }
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toContain('route catch ห้ามคืน error.message เป็น message ตรงๆ; ใช้ routeErrorResponse หรือข้อความที่ควบคุมได้.')

    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia()
            .post('/chat', async () => {
              try {
                return await sendChat()
              } catch (error) {
                return {
                  error: 'chat_failed',
                  message: error instanceof Error ? error.message : String(error),
                }
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toContain('route catch ห้ามคืน error.message เป็น message ตรงๆ; ใช้ routeErrorResponse หรือข้อความที่ควบคุมได้.')
  })

  test('catches route catch error fields derived from raw errors', () => {
    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia()
            .post('/chat', async () => {
              try {
                return await sendChat()
              } catch (error) {
                return { error: error.message, message: 'แชทไม่สำเร็จ' }
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toContain('route catch ห้ามคืน raw error ใน field error; ใช้ machine-readable code ที่ควบคุมได้.')

    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia()
            .post('/chat', async () => {
              try {
                return await sendChat()
              } catch (error) {
                return { error: String(error), message: 'แชทไม่สำเร็จ' }
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toContain('route catch ห้ามคืน raw error ใน field error; ใช้ machine-readable code ที่ควบคุมได้.')
  })

  test('catches generic raw error messages after an AuthError branch', () => {
    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia()
            .post('/chat', async () => {
              try {
                return await sendChat()
              } catch (error) {
                if (error instanceof AuthError) {
                  return { error: error.code, message: error.message }
                }

                return { error: 'chat_failed', message: error.message }
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toContain('route catch ห้ามคืน error.message เป็น message ตรงๆ; ใช้ routeErrorResponse หรือข้อความที่ควบคุมได้.')
  })

  test('allows route catch responses for controlled AuthError messages', () => {
    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia()
            .post('/chat', async () => {
              try {
                return await sendChat()
              } catch (error) {
                if (error instanceof AuthError) {
                  return { error: error.code, message: error.message }
                }
                return routeErrorResponse('unknown_error')
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toEqual([])
  })

  test('extracts route error message keys and helper calls for explicit-copy checks', () => {
    const known = collectKnownRouteErrorMessages(`
      export const routeErrorMessages: Record<string, string> = {
        database_not_configured: 'ฐานข้อมูลยังไม่พร้อม',
        chat_not_found: 'ไม่พบแชท',
      }
    `)
    const calls = collectRouteErrorResponseCodes(`
      return routeErrorResponse('database_not_configured')
      return routeErrorResponse("missing_new_code")
    `)

    expect([...known].sort()).toEqual(['chat_not_found', 'database_not_configured'])
    expect(calls.map((call) => call.code)).toEqual(['database_not_configured', 'missing_new_code'])
  })

  test('runs the committed backend security audit through an importable runner', async () => {
    const findings = await collectBackendSecurityFindings()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runBackendSecurityAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toBe('ผ่าน - ตรวจ security ระบบหลังบ้านผ่านแล้ว')
    expect(errors).toEqual([])
  })
})
