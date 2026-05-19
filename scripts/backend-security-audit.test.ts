import { describe, expect, test } from 'bun:test'
import { collectBackendSecurityFindingsFromSource } from './backend-security-audit'

function messagesFor(content: string) {
  return collectBackendSecurityFindingsFromSource('fixture.ts', content).map((finding) => finding.message)
}

describe('backend security audit', () => {
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
        'Prisma $queryRawUnsafe is forbidden; use Prisma query builders or tagged $queryRaw with parameters.',
        'Prisma $executeRawUnsafe is forbidden; use Prisma query builders or tagged $executeRaw with parameters.',
        'Prisma $queryRaw function-call form is forbidden; use tagged template parameterization.',
        'Prisma $executeRaw function-call form is forbidden; use tagged template parameterization.',
        'Prisma.raw is forbidden because it can bypass parameterization.',
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

  test('catches admin routes without admin api key guards', () => {
    expect(
      messagesFor(`
        export const adminRoutes = new Elysia()
          .get('/admin/summary', ({ set }) => {
            return { ok: true }
          })
      `),
    ).toContain('admin route is missing requireAdminApiKey guard in the route handler block.')
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
    ).toContain('route with /:id is missing rejectInvalidUuid guard before resource access.')
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
})
