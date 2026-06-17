import { describe, expect, test } from 'bun:test'
import { buildLocalDbCommandPlan, parseLocalDbToolArgs } from './local-db-backup'

describe('local database backup and restore plan', () => {
  test('builds a safe backup command using docker compose pg_dump', () => {
    const plan = buildLocalDbCommandPlan(
      { mode: 'backup' },
      new Date('2026-06-17T12:34:56.000Z'),
    )

    expect(plan.mode).toBe('backup')
    expect(plan.destructive).toBe(false)
    expect(plan.file.replace(/\\/g, '/')).toContain('backups/maprang-local-20260617T123456Z.dump')
    expect(plan.command).toBe('docker')
    expect(plan.args).toEqual([
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_dump',
      '-U',
      'admin',
      '-d',
      'maprang_local',
      '-Fc',
    ])
  })

  test('builds a destructive restore command only for explicit restore mode', () => {
    const plan = buildLocalDbCommandPlan({
      mode: 'restore',
      file: 'backups/snapshot.dump',
    })

    expect(plan.mode).toBe('restore')
    expect(plan.destructive).toBe(true)
    expect(plan.file.replace(/\\/g, '/')).toContain('backups/snapshot.dump')
    expect(plan.args).toEqual([
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_restore',
      '-U',
      'admin',
      '-d',
      'maprang_local',
      '--clean',
      '--if-exists',
      '--no-owner',
    ])
  })

  test('parses Bun-style restore arguments with confirm flag', () => {
    const options = parseLocalDbToolArgs([
      'restore',
      '--',
      '--file',
      'backups/manual.dump',
      '--confirm-restore',
      '--database',
      'maprang_local_copy',
    ])

    expect(options).toMatchObject({
      mode: 'restore',
      file: 'backups/manual.dump',
      confirmRestore: true,
      database: 'maprang_local_copy',
    })
  })
})
