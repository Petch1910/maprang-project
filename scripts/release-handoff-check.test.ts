import { describe, expect, test } from 'bun:test'
import { checkReleaseHandoffContent } from './release-handoff-check'

const filledHandoff = [
  '# Release Handoff Template',
  '',
  '## Release Identity',
  '- Release date: 2026-05-19',
  '- Git commit: abc1234',
  '- Branch: main',
  '- Owner: release lead',
  '- Environment: production',
  '',
  '## Deployed URLs',
  '- Frontend URL: https://app.maprang.example',
  '- Backend URL: https://api.maprang.example',
  '- Health URL: https://api.maprang.example/health',
  '- Ready URL: https://api.maprang.example/ready',
  '',
  '## Database And Migrations',
  '- Database host/provider: managed postgres',
  '- Migration command: bunx prisma migrate deploy',
  '- Migration result: pass',
  '- Prisma migration version: 20260513103000_add_lore_parent_index',
  '',
  '## Auth, Storage, And CORS',
  '- Auth mode: supabase-jwt',
  '- Supabase project ref: project-ref-only',
  '- Avatar storage provider: supabase',
  '- Avatar storage access: signed',
  '- Signed URL expiry: 3600',
  '- CORS origins: https://app.maprang.example',
  '',
  '## AI Provider Verification',
  '- Chat model: google/gemini-2.0-flash-001',
  '- Chat live smoke command: bun run smoke:chat',
  '- Chat live smoke result: pass',
  '- `CHAT_PROVIDER_LIVE_VERIFIED` value: 1',
  '- Image model: gpt-image-1.5',
  '- Image live smoke command: bun run smoke:image:live',
  '- Image live smoke result: pass',
  '- `IMAGE_GENERATION_LIVE_VERIFIED` value: 1',
  '',
  '## QA Gates',
  '- `bun run qa:local`: pass',
  '- `bun run e2e:smoke`: pass',
  '- `bun run staging:verify`: pass',
  '- `bun run production:check`: pass',
  '- GitHub Production Smoke run: pass',
  '',
  '## Admin Checks',
  '- `/admin/health`: pass',
  '- `/admin/prompt-inspector`: pass',
  '- `/admin/evals`: pass',
  '- Moderation reports: pass',
  '- Admin audit logs: pass',
  '',
  '## Known Limitations',
  '- Open blockers: none',
  '- Provider quota risks: monitored',
  '- Manual follow-ups: none',
  '- Rollback trigger: provider outage',
  '',
  '## Release Decision',
  '- Go / no-go: go',
  '- Approved by: release lead',
  '- Notes: ready',
  '',
].join('\n')

describe('release handoff check', () => {
  test('accepts a filled release handoff', () => {
    expect(checkReleaseHandoffContent(filledHandoff, { requireFilled: true })).toEqual([])
  })

  test('allows the empty template unless filled mode is required', () => {
    const template = filledHandoff.replace('2026-05-19', '').replace('abc1234', '')

    expect(checkReleaseHandoffContent(template)).toEqual([])
    expect(checkReleaseHandoffContent(template, { requireFilled: true })).toEqual(
      expect.arrayContaining(['line 4 is still blank: - Release date:', 'line 5 is still blank: - Git commit:']),
    )
  })

  test('reports missing sections and secret-shaped values', () => {
    const fakeOpenRouterKey = ['sk', 'or', 'v1', '1234567890abcdef1234567890abcdef'].join('-')
    const fakeGithubToken = `ghp_${'a'.repeat(36)}`
    const unsafe = filledHandoff
      .replace('## Release Decision', '## Decision')
      .replace('project-ref-only', `${fakeOpenRouterKey}\n- Debug token: ${fakeGithubToken}`)

    expect(checkReleaseHandoffContent(unsafe)).toEqual(
      expect.arrayContaining(['missing section: Release Decision', 'contains OpenRouter key', 'contains GitHub token']),
    )
  })
})
