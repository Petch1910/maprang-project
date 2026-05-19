# Release Handoff Template

Use this template after `production:check` passes and before sending real users to the release. Do not paste secrets,
tokens, private database URLs, service role keys, or raw user data into this file.

## Release Identity

- Release date:
- Git commit:
- Branch:
- Owner:
- Environment: staging / production

## Deployed URLs

- Frontend URL:
- Backend URL:
- Health URL:
- Ready URL:

## Database And Migrations

- Database host/provider:
- Migration command:
- Migration result:
- Prisma migration version:

## Auth, Storage, And CORS

- Auth mode:
- Supabase project ref:
- Avatar storage provider:
- Avatar storage access:
- Signed URL expiry:
- CORS origins:

## AI Provider Verification

- Chat model:
- Chat live smoke command:
- Chat live smoke result:
- `CHAT_PROVIDER_LIVE_VERIFIED` value:
- Image model:
- Image live smoke command:
- Image live smoke result:
- `IMAGE_GENERATION_LIVE_VERIFIED` value:

## QA Gates

- `bun run qa:local`:
- `bun run e2e:smoke`:
- `bun run staging:verify`:
- `bun run production:check`:
- GitHub Production Smoke run:

## Admin Checks

- `/admin/health`:
- `/admin/prompt-inspector`:
- `/admin/evals`:
- Moderation reports:
- Admin audit logs:

## Known Limitations

- Open blockers:
- Provider quota risks:
- Manual follow-ups:
- Rollback trigger:

## Release Decision

- Go / no-go:
- Approved by:
- Notes:
