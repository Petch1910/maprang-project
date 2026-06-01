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
      await prisma . $queryRawUnsafe('select * from "User" where id = ' + userId)
      await prisma.$executeRawUnsafe('delete from "Chat"')
      await prisma . $executeRawUnsafe('delete from "Chat"')
      await prisma.$queryRaw('select * from "Chat" where id = ' + chatId)
      await prisma . $queryRaw('select * from "Chat" where id = ' + chatId)
      await prisma.$executeRaw('delete from "Chat" where id = ' + chatId)
      await prisma . $executeRaw('delete from "Chat" where id = ' + chatId)
      Prisma . raw(userInput)
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
        console.error(
          'สตรีมแชทไม่สำเร็จ:',
          providerFailure,
          error,
        )
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console.error('สตรีมแชทไม่สำเร็จ:', providerFailure, error as Error)
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console?.error('สตรีมแชทไม่สำเร็จ:', providerFailure, error)
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console['error']('สตรีมแชทไม่สำเร็จ:', providerFailure, error)
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console.error.call(console, 'สตรีมแชทไม่สำเร็จ:', providerFailure, error)
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console.warn.apply(console, ['สตรีมแชทไม่สำเร็จ:', providerFailure, error])
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        console.error.bind(console)('สตรีมแชทไม่สำเร็จ:', providerFailure, error)
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        Reflect.apply(console.error, console, ['สตรีมแชทไม่สำเร็จ:', providerFailure, error])
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        Reflect.get(console, 'error')('สตรีมแชทไม่สำเร็จ:', providerFailure, error)
      `),
    ).toContain('ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.')

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        Reflect.get(console, 'error').call(console, 'stream failed', providerFailure, error)
      `).some((message) => message.includes('providerFailure')),
    ).toBe(true)

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        Object.getOwnPropertyDescriptor(console, 'error')?.value.call(console, 'stream failed', providerFailure, error)
      `).some((message) => message.includes('providerFailure')),
    ).toBe(true)

    expect(
      messagesFor(`
        const providerFailure = classifyChatProviderError(error)
        globalThis.console.error('สตรีมแชทไม่สำเร็จ:', providerFailure, error)
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
    const rawLogMessage = 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.'
    const messages = messagesFor(`
        try {
          await seed()
        } catch (error) {
          console.error ( error )
          console.warn(error)
          console.error(error, 'seed failed')
          console.warn ( error , 'seed slow' )
          console.error(error as Error)
          console.warn((error as Error), 'seed slow')
          console?.error(error)
          console.warn?.(error, 'seed slow')
          console['error'](error)
          console?.['warn']?.(error, 'seed slow')
          console.error.call(console, error)
          console.warn.call(console, 'seed slow', error as Error)
          console.error.apply(console, [error])
          console.warn.apply(console, ['seed slow', error as Error])
          console.error.bind(console)(error)
          console.warn.bind(console)('seed slow', error as Error)
          Reflect.apply(console.error, console, [error])
          Reflect.apply(console.warn, console, ['seed slow', error as Error])
          Reflect.get(console, 'error')(error)
          Reflect.get(globalThis.console, 'warn')('seed slow', error as Error)
          Reflect.get(console, 'error').call(console, error)
          Reflect.get(globalThis.console, 'warn').apply(globalThis.console, ['seed slow', error as Error])
          Reflect.get(console, 'error').bind(console)(error)
          Object.getOwnPropertyDescriptor(console, 'error')?.value(error)
          Object.getOwnPropertyDescriptor(globalThis.console, 'warn')?.value.call(globalThis.console, 'seed slow', error as Error)
          Object.getOwnPropertyDescriptor(console, 'error')?.value.apply(console, [error])
          Object.getOwnPropertyDescriptor(console, 'error')?.value.bind(console)(error)
          globalThis.console.error(error)
          globalThis.console.warn('seed slow', error)
        }
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message === rawLogMessage)).toHaveLength(31)

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

  test('catches backend console method aliases', () => {
    const messages = messagesFor(`
        const logError = console.error
        const typedLogError: typeof console.error = console.error
        let logWarn = globalThis.console.warn.bind(console)
        logError = console['error']
        const assertedError = console.error as typeof console.error
        const parenthesizedError = (console.error)
        parenthesizedWarn = (globalThis.console.warn) as typeof console.warn
        const parenthesizedRootError = (globalThis).console.error
        parenthesizedRootWarn = (globalThis)['console']['warn'] as typeof console.warn
        const bracketError = globalThis['console'].error
        bracketWarn = globalThis['console']['warn'] as typeof console.warn
        const parenthesizedBracketError = (globalThis['console']).error
        parenthesizedBracketWarn = (globalThis['console'])['warn'] as typeof console.warn
        const reflectedError = Reflect.get(console, 'error')
        reflectedError = Reflect.get(globalThis.console, 'warn') as typeof console.warn
        const reflectedErrorViaGlobal = globalThis.Reflect['get'](console, 'error')
        const reflectedErrorViaParen = (Reflect.get)(console, 'error')
        const reflectedErrorViaCall = Reflect.get.call(Reflect, console, 'error')
        const reflectedNamespaceError = Reflect.get(Reflect.get(globalThis, 'console'), 'error')
        const parenthesizedRootNamespaceError = Reflect.get(Reflect.get((globalThis), 'console'), 'error')
        const applyNamespaceError = Reflect.get(Reflect.get.apply(Reflect, [globalThis, 'console']), 'error')
        const parenthesizedApplyNamespaceError = Reflect.get((Reflect.get.apply)(Reflect, [globalThis, 'console']), 'error')
        const descriptorError = Object.getOwnPropertyDescriptor(console, 'error')?.value
        descriptorError = Object.getOwnPropertyDescriptor(globalThis.console, 'warn')?.value as typeof console.warn
        const descriptorErrorViaGlobal = globalThis.Object['getOwnPropertyDescriptor'](console, 'warn')?.value
        const descriptorErrorViaParen = (Object.getOwnPropertyDescriptor)(console, 'warn')?.value
        const descriptorErrorViaApply = Object.getOwnPropertyDescriptor.apply(Object, [console, 'warn'])?.value
        const descriptorNamespaceWarn = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor(globalThis, 'console')?.value, 'warn')?.value
        const descriptorParenthesizedRootWarn = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor((globalThis), 'console')?.value, 'warn')?.value
        const descriptorBindNamespaceWarn = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'console')?.value, 'warn')?.value
        const descriptorParenthesizedBindNamespaceWarn = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'console')?.value, 'warn')?.value
        const optionalApplyNamespaceError = Reflect.get((Reflect.get.apply)?.(Reflect, [globalThis, 'console']), 'error')
        const descriptorOptionalBindNamespaceWarn = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'console')?.value, 'warn')?.value
        const { error: aliasedError, warn } = console
        const { error: bracketAliasedError } = globalThis['console']
        const { warn: parenthesizedBracketAliasedWarn } = (globalThis['console'])
        console.error(summarizeSeedError(error))
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message.includes('alias console.error/console.warn'))).toHaveLength(36)

    expect(
      messagesFor(`
        const { error: typedAliasedError, warn: typedWarn }: Console = console
      `, 'prisma/seed.ts').filter((message) => message.includes('alias console.error/console.warn')),
    ).toHaveLength(1)
  })

  test('catches backend retrieval method aliases', () => {
    const messages = messagesFor(`
        const getReflect = Reflect.get
        const typedGetReflect: typeof Reflect.get = globalThis.Reflect['get']
        getReflect = (Reflect.get)
        const getDescriptor = Object.getOwnPropertyDescriptor
        descriptorLater = globalThis.Object['getOwnPropertyDescriptor'] as typeof Object.getOwnPropertyDescriptor
        const { get } = Reflect
        const { get: reflectGet } = globalThis.Reflect
        const { getOwnPropertyDescriptor: getOwn } = globalThis.Object
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message.includes('alias Reflect.get/Object.getOwnPropertyDescriptor'))).toHaveLength(8)
  })

  test('catches backend Reflect.apply aliases', () => {
    const messages = messagesFor(`
        const applyReflect = Reflect.apply
        const typedApplyReflect: typeof Reflect.apply = globalThis.Reflect['apply']
        applyReflect = (Reflect.apply)
        const { apply } = Reflect
        const { apply: reflectApply } = globalThis.Reflect
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message.includes('alias Reflect.apply'))).toHaveLength(5)
  })

  test('catches backend Reflect object aliases', () => {
    const messages = messagesFor(`
        const reflectNs = Reflect
        const typedReflectNs: typeof Reflect = globalThis.Reflect
        reflectNs = (globalThis.Reflect)
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message.includes('alias Reflect object'))).toHaveLength(3)
  })

  test('catches backend Object object aliases', () => {
    const messages = messagesFor(`
        const objectNs = Object
        const typedObjectNs: ObjectConstructor = globalThis.Object
        objectNs = (globalThis.Object)
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message.includes('alias Object object'))).toHaveLength(3)
  })

  test('catches Reflect.apply console retrieval targets', () => {
    const rawLogMessage = 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.'
    const messages = messagesFor(`
        try {
          await seed()
        } catch (error) {
          Reflect.apply(Reflect.get(console, 'error'), console, [error])
          Reflect.apply(Reflect.get(globalThis.console, 'warn'), globalThis.console, ['seed slow', error as Error])
          Reflect.apply((globalThis).console.error, console, [error])
          Reflect.apply((globalThis)['console']['warn'], console, ['seed parenthesized root', error as Error])
          Reflect.apply(Reflect.get(Reflect.get(globalThis, 'console'), 'error'), console, [error])
          Reflect.apply(Reflect.get(Reflect.get((globalThis), 'console'), 'error'), console, [error])
          Reflect.apply(Reflect.get(Reflect.get.apply(Reflect, [globalThis, 'console']), 'error'), console, [error])
          Reflect.apply(Reflect.get((Reflect.get.apply)(Reflect, [globalThis, 'console']), 'error'), console, [error])
          Reflect.apply(Reflect.get((globalThis['console']), 'error'), globalThis.console, [error])
          Reflect.apply(Object.getOwnPropertyDescriptor(console, 'error')?.value, console, [error])
          Reflect.apply(Object.getOwnPropertyDescriptor(globalThis.console, 'warn')?.value, globalThis.console, ['seed slow', error as Error])
          Reflect.apply(Object.getOwnPropertyDescriptor(Reflect.get(globalThis, 'console'), 'warn')?.value, console, ['seed retrieved namespace target', error as Error])
          Reflect.apply(Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor((globalThis), 'console')?.value, 'warn')?.value, console, ['seed parenthesized namespace target', error as Error])
          Reflect.apply(Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'console')?.value, 'warn')?.value, console, ['seed method-forwarded namespace target', error as Error])
          Reflect.apply(Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'console')?.value, 'warn')?.value, console, ['seed parenthesized method-forwarded namespace target', error as Error])
          Reflect.apply(Reflect.get((Reflect.get.apply)?.(Reflect, [globalThis, 'console']), 'error'), console, [error])
          Reflect.apply(Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'console')?.value, 'warn')?.value, console, ['seed optional method-forwarded namespace target', error as Error])
          Reflect.apply(Object.getOwnPropertyDescriptor((globalThis['console']), 'warn')?.value, globalThis.console, ['seed slow', error as Error])
          globalThis.Reflect.apply(Reflect.get(console, 'error'), console, [error])
          globalThis.Reflect['apply'](globalThis.Reflect['get'](console, 'warn'), globalThis.console, ['seed slow', error as Error])
          (Reflect.apply)(Object.getOwnPropertyDescriptor(console, 'error')?.value, console, [error])
          (globalThis.Reflect['apply'])(globalThis.Object['getOwnPropertyDescriptor'](console, 'warn')?.value, globalThis.console, ['seed slow', error as Error])
          globalThis.Reflect.get(console, 'error')(error)
          globalThis.Reflect['get'](globalThis.console, 'warn').call(globalThis.console, 'seed slow', error as Error)
          globalThis.Object['getOwnPropertyDescriptor'](console, 'error')?.value(error)
          Reflect.apply((Reflect.get)(console, 'error'), console, [error])
          Reflect.apply((Object.getOwnPropertyDescriptor)(console, 'warn')?.value, console, [error])
          (Reflect.get)(console, 'error')(error)
          (Reflect.get)((globalThis['console']), 'error')(error)
          (globalThis.Object['getOwnPropertyDescriptor'])(console, 'warn')?.value(error)
          (globalThis.Object['getOwnPropertyDescriptor'])((globalThis['console']), 'warn')?.value(error)
          Reflect.apply(Reflect.get.call(Reflect, console, 'error'), console, [error])
          Reflect.get.call(Reflect, console, 'error')(error)
          (Reflect.get.apply)(Reflect, [console, 'error'])(error)
          (Reflect.get.apply)?.(Reflect, [console, 'error'])(error)
          Object.getOwnPropertyDescriptor.call(Object, console, 'error')?.value(error)
          globalThis.Object['getOwnPropertyDescriptor'].apply(globalThis.Object, [console, 'warn'])?.value(error)
          (Object.getOwnPropertyDescriptor.bind(Object))(console, 'error')?.value(error)
          (Object.getOwnPropertyDescriptor.bind(Object))?.(console, 'error')?.value(error)
          console.error(summarizeSeedError(error))
        }
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message === rawLogMessage)).toHaveLength(43)
  })

  test('catches backend console object aliases', () => {
    const messages = messagesFor(`
        const logger = console
        const typedLogger: Console = console
        let globalLogger = globalThis.console as Console
        logger = console
        const parenthesizedLogger = (console)
        globalLogger = (globalThis.console)
        const parenthesizedRootObjectLogger = (globalThis).console
        globalLogger = (globalThis)['console']
        const bracketLogger = globalThis['console']
        globalLogger = globalThis['console']
        const parenthesizedBracketLogger = (globalThis['console'])
        globalLogger = (globalThis['console'])
        const reflectedLogger = Reflect.get(globalThis, 'console')
        const parenthesizedRootLogger = Reflect.get((globalThis), 'console')
        const applyRootLogger = Reflect.get.apply(Reflect, [globalThis, 'console'])
        const parenthesizedApplyRootLogger = (Reflect.get.apply)(Reflect, [globalThis, 'console'])
        const optionalApplyRootLogger = (Reflect.get.apply)?.(Reflect, [globalThis, 'console'])
        globalLogger = Object.getOwnPropertyDescriptor(globalThis, 'console')?.value
        globalLogger = Object.getOwnPropertyDescriptor((globalThis), 'console')?.value
        globalLogger = Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'console')?.value
        globalLogger = (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'console')?.value
        globalLogger = (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'console')?.value
        console.error(summarizeSeedError(error))
      `, 'prisma/seed.ts')

    expect(messages.filter((message) => message.includes('alias console object'))).toHaveLength(22)
  })

  test('catches AuthError responses that bypass the public response helper', () => {
    const message = 'ห้ามประกอบ AuthError response จาก error.code/error.message ตรงๆ; ใช้ authErrorResponse(error) เพื่อคุมข้อความ public.'

    expect(
      messagesFor(`
        export const app = new Elysia()
          .onError(({ error, set }) => {
            if (error instanceof AuthError) {
              set.status = 401
              return { error: error.code, message: error.message }
            }
          })
      `, 'apps/backend/index.ts'),
    ).toContain(message)

    expect(
      messagesFor(`
        export const app = new Elysia()
          .onError(({ error, set }) => {
            if (error instanceof AuthError) {
              set.status = 401
              return { error: (error as AuthError).code, message: (error as AuthError).message }
            }
          })
      `, 'apps/backend/index.ts'),
    ).toContain(message)

    expect(
      messagesFor(`
        export const app = new Elysia()
          .onError(({ error, set }) => {
            if (error instanceof AuthError) {
              set.status = 401
              return { error: (error as AuthError).code, status: 401, message: (error as AuthError).message }
            }
          })
      `, 'apps/backend/index.ts'),
    ).toContain(message)

    expect(
      messagesFor(`
        export const app = new Elysia()
          .onError(({ error, set }) => {
            if (error instanceof AuthError) {
              set.status = 401
              return { message: (error as AuthError).message, status: 401, error: (error as AuthError).code }
            }
          })
      `, 'apps/backend/index.ts'),
    ).toContain(message)

    expect(
      messagesFor(`
        export const app = new Elysia()
          .onError(({ error, set }) => {
            if (error instanceof AuthError) {
              set.status = 401
              return authErrorResponse(error)
            }
          })
      `, 'apps/backend/index.ts'),
    ).toEqual([])
  })

  test('catches raw response JSON parsing outside safe payload helpers', () => {
    expect(
      messagesFor(`
        async function loadProviderResponse(response: Response) {
          return (await response . clone () . json()) as { ok?: boolean }
        }
      `, 'apps/backend/src/provider.service.ts'),
    ).toContain('ห้าม parse response.json() ตรงใน runtime backend; ให้แยกเป็น read...Payload helper ที่ห่อ JSON พังเป็นข้อความไทยก่อน.')

    expect(
      messagesFor(`
        export async function readSupabaseUserPayload(response: Response) {
          try {
            return (await response.json()) as SupabaseUserResponse
          } catch {
            throw new Error(authErrorMessages.userMalformed)
          }
        }
      `, 'apps/backend/src/security.ts'),
    ).toEqual([])
  })

  test('catches raw response text diagnostics without redaction', () => {
    expect(
      messagesFor(`
        async function loadProviderFailure(response: Response) {
          const detail = await response . text()
          throw new Error(detail)
        }
      `, 'apps/backend/src/provider.service.ts'),
    ).toContain('ห้ามอ่าน response.text() จาก provider/Supabase แล้วใช้ตรงใน runtime backend; ต้องผ่าน redactSensitiveText ก่อนนำไป log หรือคืนเป็น diagnostic.')

    expect(
      messagesFor(`
        async function loadProviderFailure(response: Response) {
          const detail = redactSensitiveText(await response.text().catch(() => '')).text
          throw new Error(detail)
        }
      `, 'apps/backend/src/provider.service.ts'),
    ).toEqual([])

    expect(
      messagesFor(`
        async function loadProviderFailure(response: Response) {
          const detail = redactSensitiveText(
            await response.text(),
          ).text
          throw new Error(detail)
        }
      `, 'apps/backend/src/provider.service.ts'),
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
                detail: error instanceof Error ? error . message : String ( error ),
              }
            }
          })
      `,
      'apps/backend/src/admin.routes.ts',
    )

    expect(messages).toContain('route response ห้ามส่ง raw error.message ใน detail; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.')

    expect(
      messagesFor(
        `
          export const routes = new Elysia()
            .get('/admin/evals/local', async () => {
              try {
                return await runLocalEvalSuite()
              } catch (error) {
                return {
                  error: 'local_eval_unavailable',
                  message: 'รันชุดทดสอบไม่สำเร็จ',
                  detail: error instanceof Error ? (error as Error).message : String(error as Error),
                }
              }
            })
        `,
        'apps/backend/src/admin.routes.ts',
      ),
    ).toContain('route response ห้ามส่ง raw error.message ใน detail; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.')
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
                return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: String ( error ) }
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
                return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: String(error as Error) }
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
                return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: (error as Error).message }
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
                return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: error . message }
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

  test('catches chained admin routes without leaking guards between calls', () => {
    expect(
      messagesFor(
        `
          export const adminRoutes = new Elysia().get('/admin/summary', ({ request, set }) => {
            if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }
            return { ok: true }
          }).get('/admin/audit-logs', () => ({ ok: true }))
        `,
        'apps/backend/src/admin.routes.ts',
      ),
    ).toContain('route ผู้ดูแลยังไม่มี requireAdminApiKey guard ใน block ของ handler.')
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

  test('catches chained id routes without leaking UUID guards between calls', () => {
    expect(
      messagesFor(
        `
          export const chatRoutes = new Elysia().get('/characters/:id', async ({ params, set }) => {
            const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
            if (invalidId) return invalidId
            return { ok: true }
          }).get('/chats/:id/messages', async ({ params }) => ({ id: params.id }))
        `,
        'apps/backend/src/chat.routes.ts',
      ),
    ).toContain('route ที่มี /:id ยังไม่มี rejectInvalidUuid guard ก่อนเข้าถึงข้อมูล.')
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
              console.error(
                'อัปโหลดรูปตัวละครไม่สำเร็จ:',
                error,
              )
              return { error: 'avatar_storage_unavailable', message: 'พื้นที่เก็บรูปตัวละครยังไม่พร้อมใช้งาน' }
            }
          })
      `, 'upload.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          console.warn('stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          console.warn?.('stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          console?.['warn']?.('stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          console.warn.call(console, 'stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          console.error.apply(console, ['stream failed', error as Error])
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          console.warn.bind(console)('stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          Reflect.apply(console.warn, console, ['stream failed', error as Error])
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          Reflect.get(console, 'warn')('stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          Reflect.get(console, 'warn').call(console, 'stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          Object.getOwnPropertyDescriptor(console, 'warn')?.value.call(console, 'stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.')

    expect(
      messagesFor(`
        function logRouteFailure(error: unknown) {
          globalThis.console.warn('stream failed', error as Error)
        }
      `, 'chat.routes.ts'),
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
              throw (error)
            }
          })
      `, 'chat.routes.ts'),
    ).toContain('route throw raw error object ตรงๆ ไม่ได้; คืน routeErrorResponse หรือ response ที่ควบคุมข้อความได้.')

    expect(
      messagesFor(`
        function throwRouteFailure(error: unknown) {
          throw (error as Error)
        }
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

  test('catches route catch raw error returns', () => {
    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (error) {
              return Promise.reject(error)
              return Promise?.reject?.(error)
              return Promise['reject'](error)
              return Promise?.['reject']?.(error as Error)
              return globalThis.Promise.reject(error)
              return globalThis.Promise?.['reject']?.(error as Error)
              return (globalThis).Promise.reject(error)
              return globalThis['Promise']['reject'](error)
              return Reflect.get(globalThis, 'Promise').reject(error)
              return Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value.reject(error)
              return Reflect.get.apply(Reflect, [globalThis, 'Promise']).reject(error)
              return Reflect.get.bind(Reflect)(globalThis, 'Promise').reject(error)
              return Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value.reject(error)
              return Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value.reject(error)
              return (Reflect.get.apply)(Reflect, [globalThis, 'Promise']).reject(error)
              return (Reflect.get.bind(Reflect))(globalThis, 'Promise').reject(error)
              return (Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value.reject(error)
              return (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value.reject(error)
              return (Reflect.get.apply)?.(Reflect, [globalThis, 'Promise']).reject(error)
              return (Reflect.get.bind(Reflect))?.(globalThis, 'Promise').reject(error)
              return (Object.getOwnPropertyDescriptor.apply)?.(Object, [globalThis, 'Promise'])?.value.reject(error)
              return (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value.reject(error)
            }
          })
      `, 'chat.routes.ts').some((message) => message.includes('return raw error object')),
    ).toBe(true)

    for (const rejectedExpression of [
      'return Promise?.reject?.(error)',
      "return Promise['reject'](error)",
      "return Promise?.['reject']?.(error as Error)",
      'return globalThis.Promise.reject(error)',
      "return globalThis.Promise?.['reject']?.(error as Error)",
      'return Promise.reject.call(Promise, error)',
      'return Promise.reject.apply(Promise, [error])',
      'return Promise.reject.bind(Promise)(error)',
      'return globalThis.Promise.reject.call(globalThis.Promise, error)',
      "return globalThis['Promise']['reject'].call(globalThis['Promise'], error)",
      'return Reflect.apply(Promise.reject, Promise, [error])',
      'return globalThis.Reflect.apply(Promise.reject, Promise, [error])',
      'return globalThis.Reflect["apply"](Promise.reject, Promise, [error])',
      'return (Reflect.apply)(Promise.reject, Promise, [error])',
      'return (globalThis.Reflect["apply"])(Promise.reject, Promise, [error])',
      'return Reflect.apply(globalThis.Promise.reject, globalThis.Promise, [error])',
      "return Reflect.apply(globalThis['Promise']['reject'], globalThis['Promise'], [error])",
      "return Reflect.apply(Reflect.get(globalThis, 'Promise').reject, Reflect.get(globalThis, 'Promise'), [error])",
      "return Reflect.apply(Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value['reject'], Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value, [error])",
      "return Reflect.apply(Reflect.get.apply(Reflect, [globalThis, 'Promise']).reject, Reflect.get.apply(Reflect, [globalThis, 'Promise']), [error])",
      "return Reflect.apply(Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value['reject'], Object.getOwnPropertyDescriptor.apply(Object, [globalThis, 'Promise'])?.value, [error])",
      "return Reflect.apply((Reflect.get.apply)(Reflect, [globalThis, 'Promise']).reject, (Reflect.get.apply)(Reflect, [globalThis, 'Promise']), [error])",
      "return Reflect.apply((Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value['reject'], (Object.getOwnPropertyDescriptor.apply)(Object, [globalThis, 'Promise'])?.value, [error])",
      'return Reflect.get(Promise, "reject")(error)',
      'return Reflect.get(globalThis.Promise, "reject").call(globalThis.Promise, error)',
      'return globalThis.Reflect["get"](Promise, "reject")(error)',
      'return (Reflect.get)(Promise, "reject")(error)',
      'return (globalThis.Reflect["get"])(Promise, "reject")(error)',
      'return Reflect.get.call(Reflect, Promise, "reject")(error)',
      'return globalThis.Reflect["get"].apply(globalThis.Reflect, [Promise, "reject"])(error)',
      'return Object.getOwnPropertyDescriptor(Promise, "reject")?.value(error)',
      'return globalThis.Object.getOwnPropertyDescriptor(Promise, "reject")?.value(error)',
      'return (Object.getOwnPropertyDescriptor)(Promise, "reject")?.value(error)',
      'return (globalThis.Object["getOwnPropertyDescriptor"])(Promise, "reject")?.value(error)',
      'return Object.getOwnPropertyDescriptor.call(Object, Promise, "reject")?.value(error)',
      'return globalThis.Object["getOwnPropertyDescriptor"].apply(globalThis.Object, [Promise, "reject"])?.value(error)',
      'return Object.getOwnPropertyDescriptor(Promise, "reject")?.value.apply(Promise, [error])',
      'return Reflect.apply(Reflect.get(Promise, "reject"), Promise, [error])',
      'return globalThis.Reflect.apply(Reflect.get(Promise, "reject"), Promise, [error])',
      'return globalThis.Reflect["apply"](Object.getOwnPropertyDescriptor(Promise, "reject")?.value, Promise, [error])',
      'return (Reflect.apply)(Reflect.get(Promise, "reject"), Promise, [error])',
      'return (globalThis.Reflect["apply"])(Object.getOwnPropertyDescriptor(Promise, "reject")?.value, Promise, [error])',
      'return new Promise((_resolve, reject) => reject(error as Error))',
      'return new Promise((_resolve, reject) => reject?.(error as Error))',
      'return new Promise((_resolve, reject) => reject.call(undefined, error as Error))',
      'return new Promise((_resolve, reject) => reject.apply(undefined, [error as Error]))',
      'return new Promise((_resolve, reject) => reject.bind(undefined)(error as Error))',
      'return new Promise((_resolve, reject) => Reflect.apply(reject, undefined, [error as Error]))',
      'return new Promise((_resolve, reject) => globalThis.Reflect.apply(reject, undefined, [error as Error]))',
      'return new Promise((_resolve, reject) => globalThis.Reflect["apply"](reject, undefined, [error as Error]))',
      'return new Promise((_resolve, reject) => (Reflect.apply)(reject, undefined, [error as Error]))',
      'return new Promise((_resolve, reject) => { const apply = Reflect.apply; return apply(reject, undefined, [error as Error]) })',
      'return new Promise((_resolve, reject) => { const typedApply: typeof Reflect.apply = Reflect.apply; return typedApply(reject, undefined, [error as Error]) })',
      'return new Promise((_resolve, reject) => { const { apply } = Reflect; return apply(reject, undefined, [error as Error]) })',
      'return new Promise((_resolve, reject) => { const { apply: reflectApply } = Reflect; return reflectApply(reject, undefined, [error as Error]) })',
      'return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow(error as Error) })',
      'return new Promise((_resolve, reject) => { const typedReject: typeof reject = reject; return typedReject(error as Error) })',
      'return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow.call(undefined, error as Error) })',
      'return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow.apply(undefined, [error as Error]) })',
      'return new Promise((_resolve, reject) => { const rejectNow = reject; return rejectNow.bind(undefined)(error as Error) })',
      'return new Promise(function (_resolve, reject) { reject(error as Error) })',
      'return new Promise(function (_resolve, reject) { reject?.(error as Error) })',
    ]) {
      expect(
        messagesFor(`
          function rejectRouteFailure(error: unknown) {
            ${rejectedExpression}
          }
        `, 'chat.routes.ts').some((message) => message.includes('return raw error object')),
      ).toBe(true)
    }

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (cause) {
              return new Promise((_resolve, reject) => {
                reject(cause)
              })
            }
          })
      `, 'chat.routes.ts').some((message) => message.includes('return raw error object')),
    ).toBe(true)

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (cause) {
              return new Promise(function rejectRouteFailure(_resolve, reject) {
                globalThis.Reflect['apply'](reject, undefined, [cause])
              })
            }
          })
      `, 'chat.routes.ts').some((message) => message.includes('return raw error object')),
    ).toBe(true)

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (cause) {
              return new Promise(function rejectRouteFailure(_resolve, reject) {
                reject?.(cause)
              })
            }
          })
      `, 'chat.routes.ts').some((message) => message.includes('return raw error object')),
    ).toBe(true)

    expect(
      messagesFor(`
        const rejectNow = Promise.reject
        const typedRejectLater: typeof Promise.reject = Promise.reject
        let rejectLater = Promise?.['reject'] as typeof Promise.reject
        const { reject } = Promise
      `, 'chat.routes.ts').filter((message) => message === 'route ห้าม alias Promise.reject; ใช้ routeErrorResponse หรือ response ที่ควบคุมได้.'),
    ).toHaveLength(4)

    expect(
      messagesFor(`
        const { reject: reflectedReject } = Reflect.get(globalThis, 'Promise')
        const { reject: descriptorReject } = Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value
        const { reject: applyReflectedReject } = Reflect.get.apply(Reflect, [globalThis, 'Promise'])
        const { reject: bindDescriptorReject } = Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value
        const { reject: parenthesizedApplyReject } = (Reflect.get.apply)(Reflect, [globalThis, 'Promise'])
        const { reject: parenthesizedBindReject } = (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value
        const { reject: optionalApplyReject } = (Reflect.get.apply)?.(Reflect, [globalThis, 'Promise'])
        const { reject: optionalBindReject } = (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value
      `, 'chat.routes.ts').filter((message) => message.includes('alias Promise.reject')),
    ).toHaveLength(8)

    expect(
      messagesFor(`
        const promiseCtor = Promise
        const typedPromiseCtor: PromiseConstructor = globalThis.Promise
        promiseCtor = (globalThis.Promise)
        const bracketPromiseCtor = globalThis['Promise']
        promiseCtor = (globalThis)['Promise']
        const reflectedPromiseCtor = Reflect.get(globalThis, 'Promise')
        promiseCtor = Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value
        const applyReflectedPromiseCtor = Reflect.get.apply(Reflect, [globalThis, 'Promise'])
        promiseCtor = Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value
        const parenthesizedApplyPromiseCtor = (Reflect.get.apply)(Reflect, [globalThis, 'Promise'])
        promiseCtor = (Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value
        const optionalApplyPromiseCtor = (Reflect.get.apply)?.(Reflect, [globalThis, 'Promise'])
        promiseCtor = (Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value
      `, 'chat.routes.ts').filter((message) => message.includes('alias Promise object')),
    ).toHaveLength(13)

    expect(
      messagesFor(`
        const { reject: typedReject }: PromiseConstructor = Promise
      `, 'chat.routes.ts').filter((message) => message.includes('alias Promise.reject')),
    ).toHaveLength(1)

    expect(
      messagesFor(`
        const reflectedReject = Reflect.get(Promise, 'reject')
        const descriptorReject = Object.getOwnPropertyDescriptor(Promise, 'reject')?.value
        const reflectedRejectViaGlobal = globalThis.Reflect['get'](Promise, 'reject')
        const descriptorRejectViaBracket = Object['getOwnPropertyDescriptor'](Promise, 'reject')?.value
        const reflectedRejectViaParen = (Reflect.get)(Promise, 'reject')
        const descriptorRejectViaParen = (Object.getOwnPropertyDescriptor)(Promise, 'reject')?.value
        const reflectedRejectViaCall = Reflect.get.call(Reflect, Promise, 'reject')
        const descriptorRejectViaApply = Object.getOwnPropertyDescriptor.apply(Object, [Promise, 'reject'])?.value
        const reflectedNamespaceReject = Reflect.get(Reflect.get(globalThis, 'Promise'), 'reject')
        const descriptorNamespaceReject = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor(globalThis, 'Promise')?.value, 'reject')?.value
        const applyReflectedNamespaceReject = Reflect.get(Reflect.get.apply(Reflect, [globalThis, 'Promise']), 'reject')
        const bindDescriptorNamespaceReject = Object.getOwnPropertyDescriptor(Object.getOwnPropertyDescriptor.bind(Object)(globalThis, 'Promise')?.value, 'reject')?.value
        const parenthesizedApplyNamespaceReject = Reflect.get((Reflect.get.apply)(Reflect, [globalThis, 'Promise']), 'reject')
        const parenthesizedBindNamespaceReject = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))(globalThis, 'Promise')?.value, 'reject')?.value
        const optionalApplyNamespaceReject = Reflect.get((Reflect.get.apply)?.(Reflect, [globalThis, 'Promise']), 'reject')
        const optionalBindNamespaceReject = Object.getOwnPropertyDescriptor((Object.getOwnPropertyDescriptor.bind(Object))?.(globalThis, 'Promise')?.value, 'reject')?.value
      `, 'chat.routes.ts').filter((message) => message.includes('alias Promise.reject')),
    ).toHaveLength(16)

    expect(
      messagesFor(`
        const globalRejectNow = globalThis.Promise.reject
        const bracketRejectNow = globalThis['Promise']['reject']
        const parenthesizedRejectNow = (globalThis).Promise.reject
        const { reject: globalReject } = globalThis.Promise
      `, 'chat.routes.ts').filter((message) => message.includes('alias Promise.reject')),
    ).toHaveLength(4)

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (cause) {
              return Promise.reject(cause)
            }
          })
      `, 'chat.routes.ts').some((message) => message.includes('return raw error object')),
    ).toBe(true)

    expect(
      messagesFor(`
        function rejectRouteFailure(error: unknown) {
          return Promise.reject(error as Error)
        }
      `, 'chat.routes.ts').some((message) => message.includes('return raw error object')),
    ).toBe(true)

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (error) {
              return error
            }
          })
      `, 'chat.routes.ts'),
    ).toContain('route catch ห้าม return raw error object ตรงๆ; ใช้ routeErrorResponse หรือ response ที่ควบคุมได้.')

    expect(
      messagesFor(`
        function returnRouteFailure(error: unknown) {
          return (error as Error)
        }
      `, 'chat.routes.ts'),
    ).toContain('route catch ห้าม return raw error object ตรงๆ; ใช้ routeErrorResponse หรือ response ที่ควบคุมได้.')

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (error) {
              return (error)
            }
          })
      `, 'chat.routes.ts'),
    ).toContain('route catch ห้าม return raw error object ตรงๆ; ใช้ routeErrorResponse หรือ response ที่ควบคุมได้.')

    expect(
      messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (error) {
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
                return { error: 'chat_failed', message: error . message }
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
                return { error: 'chat_failed', message: String ( error ) }
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
                  message: error instanceof Error ? error . message : String ( error ),
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
                return { error: error . message, message: 'แชทไม่สำเร็จ' }
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
                return { error: String ( error ), message: 'แชทไม่สำเร็จ' }
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

                return { error: 'chat_failed', message: error . message }
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
                  return authErrorResponse(error)
                }
                return routeErrorResponse('unknown_error')
              }
            })
        `,
        'chat.routes.ts',
      ),
    ).toEqual([])
  })

  test('catches alternate route catch variable names', () => {
    const messages = [
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat/stream', async () => {
            try {
              return streamChat()
            } catch (err) {
              throw err
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat/stream', async () => {
            try {
              return streamChat()
            } catch (err) {
              console.error(err)
              console.warn('stream failed', err)
              console?.error(err)
              console.warn?.('stream failed', err)
              console['error'](err)
              console?.['warn']?.('stream failed', err)
              console.error.call(console, err)
              console.warn.apply(console, ['stream failed', err])
              console.error.bind(console)(err)
              console.warn.bind(console)('stream failed', err)
              Reflect.apply(console.error, console, [err])
              Reflect.apply(console.warn, console, ['stream failed', err])
              Reflect.get(console, 'error')(err)
              Reflect.get(globalThis.console, 'warn')('stream failed', err)
              Reflect.get(console, 'error').call(console, err)
              Reflect.get(globalThis.console, 'warn').apply(globalThis.console, ['stream failed', err])
              Reflect.get(console, 'error').bind(console)(err)
              Object.getOwnPropertyDescriptor(console, 'error')?.value(err)
              Object.getOwnPropertyDescriptor(globalThis.console, 'warn')?.value.call(globalThis.console, 'stream failed', err)
              Object.getOwnPropertyDescriptor(console, 'error')?.value.apply(console, [err])
              Object.getOwnPropertyDescriptor(console, 'error')?.value.bind(console)(err)
              globalThis.console.error(err)
              globalThis.console.warn('stream failed', err)
              return routeErrorResponse('unknown_error')
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (cause) {
              return (cause)
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (err) {
              return { error: 'chat_failed', message: err . message }
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (err) {
              return { error: String ( err ), message: 'เนเธเธ—เนเธกเนเธชเธณเน€เธฃเนเธ' }
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (err: unknown) {
              return { error: 'chat_failed', message: err instanceof Error ? err.message : String(err) }
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const adminRoutes = new Elysia()
          .get('/admin/evals/local', async () => {
            try {
              return await runLocalEvalSuite()
            } catch (reason) {
              return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: reason instanceof Error ? reason . message : String ( reason ) }
            }
          })
      `, 'admin.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (err) {
              if (err instanceof AuthError) {
                return { error: err.code, message: err.message }
              }
              return routeErrorResponse('unknown_error')
            }
          })
      `, 'chat.routes.ts'),
    ]

    expect(messages.some((message) => message.includes('route throw raw error object'))).toBe(true)
    expect(messages.some((message) => message.includes('route log raw error object'))).toBe(true)
    expect(messages.some((message) => message.includes('return raw error object'))).toBe(true)
    expect(messages.some((message) => message.includes('error.message') && message.includes('message'))).toBe(true)
    expect(messages.some((message) => message.includes('field error'))).toBe(true)
    expect(messages.some((message) => message.includes('raw error.message') && message.includes('detail'))).toBe(true)
    expect(messages.some((message) => message.includes('AuthError response'))).toBe(true)
  })

  test('catches type-asserted alternate route catch variables', () => {
    const messages = [
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat/stream', async () => {
            try {
              return streamChat()
            } catch (err) {
              throw (err as Error)
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat/stream', async () => {
            try {
              return streamChat()
            } catch (err) {
              console.error(err as Error)
              console.warn('stream failed', (err as Error))
              console?.error(err as Error)
              console.warn?.('stream failed', (err as Error))
              console['error'](err as Error)
              console?.['warn']?.('stream failed', (err as Error))
              console.error.call(console, err as Error)
              console.warn.apply(console, ['stream failed', (err as Error)])
              console.error.bind(console)(err as Error)
              console.warn.bind(console)('stream failed', (err as Error))
              Reflect.apply(console.error, console, [err as Error])
              Reflect.apply(console.warn, console, ['stream failed', (err as Error)])
              Reflect.get(console, 'error')(err as Error)
              Reflect.get(globalThis.console, 'warn')('stream failed', (err as Error))
              Reflect.get(console, 'error').call(console, err as Error)
              Reflect.get(globalThis.console, 'warn').apply(globalThis.console, ['stream failed', (err as Error)])
              Reflect.get(console, 'error').bind(console)(err as Error)
              Object.getOwnPropertyDescriptor(console, 'error')?.value(err as Error)
              Object.getOwnPropertyDescriptor(globalThis.console, 'warn')?.value.call(globalThis.console, 'stream failed', (err as Error))
              Object.getOwnPropertyDescriptor(console, 'error')?.value.apply(console, [err as Error])
              Object.getOwnPropertyDescriptor(console, 'error')?.value.bind(console)(err as Error)
              globalThis.console.error(err as Error)
              globalThis.console.warn('stream failed', (err as Error))
              return routeErrorResponse('unknown_error')
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (cause) {
              return (cause as Error)
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (err) {
              return { error: String ( err as Error ), message: (err as Error).message }
            }
          })
      `, 'chat.routes.ts'),
      ...messagesFor(`
        export const adminRoutes = new Elysia()
          .get('/admin/evals/local', async () => {
            try {
              return await runLocalEvalSuite()
            } catch (reason) {
              return { error: 'local_eval_unavailable', message: 'รันชุดทดสอบไม่สำเร็จ', detail: reason instanceof Error ? (reason as Error).message : String ( reason as Error ) }
            }
          })
      `, 'admin.routes.ts'),
      ...messagesFor(`
        export const chatRoutes = new Elysia()
          .post('/chat', async () => {
            try {
              return await sendChat()
            } catch (err) {
              if (err instanceof AuthError) {
                return { error: (err as AuthError).code, status: 401, message: (err as AuthError).message }
              }
              return routeErrorResponse('unknown_error')
            }
          })
      `, 'chat.routes.ts'),
    ]

    expect(messages.some((message) => message.includes('route throw raw error object'))).toBe(true)
    expect(messages.some((message) => message.includes('route log raw error object'))).toBe(true)
    expect(messages.some((message) => message.includes('return raw error object'))).toBe(true)
    expect(messages.some((message) => message.includes('error.message') && message.includes('message'))).toBe(true)
    expect(messages.some((message) => message.includes('field error'))).toBe(true)
    expect(messages.some((message) => message.includes('raw error.message') && message.includes('detail'))).toBe(true)
    expect(messages.some((message) => message.includes('AuthError response'))).toBe(true)
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
