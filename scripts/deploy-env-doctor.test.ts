import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { hasRealValue, jwtRole, normalizeUrl, parseArgs, readEnvFile } from './deploy-env-doctor'

const tempDir = join(import.meta.dir, '..', '.tmp', 'deploy-env-doctor-unit')

describe('deploy env doctor helpers', () => {
  test('parses flags and key value arguments without running the doctor', () => {
    const args = parseArgs(['--backend-env', 'backend.env', '--allow-unverified-image', '--frontend-env', 'frontend.env'])

    expect(args.get('backend-env')).toBe('backend.env')
    expect(args.get('frontend-env')).toBe('frontend.env')
    expect(args.get('allow-unverified-image')).toBe('1')
  })

  test('loads env files with comments, exports, and quoted values', async () => {
    await rm(tempDir, { recursive: true, force: true })
    await mkdir(tempDir, { recursive: true })
    const envPath = join(tempDir, 'sample.env')

    try {
      await writeFile(
        envPath,
        [
          '# comment',
          'export NODE_ENV=production',
          'CORS_ORIGINS="https://app.maprang.example"',
          "SUPABASE_STORAGE_BUCKET='avatars'",
          'EMPTY=',
          '',
        ].join('\n'),
      )

      const env = await readEnvFile(envPath)
      expect(env.get('NODE_ENV')).toBe('production')
      expect(env.get('CORS_ORIGINS')).toBe('https://app.maprang.example')
      expect(env.get('SUPABASE_STORAGE_BUCKET')).toBe('avatars')
      expect(env.get('EMPTY')).toBe('')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  test('detects placeholder values and normalizes production URLs', () => {
    expect(hasRealValue('postgresql://USER:PASSWORD@HOST:5432/DATABASE')).toBe(false)
    expect(hasRealValue('replace-with-long-random-admin-key')).toBe(false)
    expect(hasRealValue('https://api.maprang.example/')).toBe(true)
    expect(normalizeUrl('https://api.maprang.example///')).toBe('https://api.maprang.example')
    expect(normalizeUrl('not a url')).toBeNull()
  })

  test('reads Supabase JWT roles without leaking or requiring valid signatures', () => {
    expect(jwtRole(fakeJwt('anon'))).toBe('anon')
    expect(jwtRole(fakeJwt('service_role'))).toBe('service_role')
    expect(jwtRole('not-a-jwt')).toBeNull()
  })
})

function fakeJwt(role: 'anon' | 'service_role') {
  return [base64Url({ alg: 'HS256', typ: 'JWT' }), base64Url({ role, iss: 'supabase', exp: 4102444800 }), 'signature'].join('.')
}

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}
