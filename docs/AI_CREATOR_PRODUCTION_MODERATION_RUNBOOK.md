# AI Creator Production Moderation Runbook

Last updated: 2026-06-17

This runbook covers Public Gallery and generation-output moderation for AI Creator. It is repo-owned operational guidance, not a payment/provider setup guide.

## Scope

In scope:

- Public Gallery outputs published through `POST /generation/gallery/:id/publish`.
- Public Gallery unpublish through `DELETE /generation/gallery/:id`.
- Public generation-output reports submitted through `POST /reports` with `targetType=GENERATION_OUTPUT`.
- Admin queue review through `/moderation`, `GET /admin/reports`, `PATCH /admin/reports/:id`, and `POST /admin/reports/:id/actions`.
- Admin action `HIDE_GENERATION_OUTPUT`, which sets the generation output visibility back to private and writes an admin audit log.

Out of scope:

- Real payment/top-up flows.
- Provider billing disputes.
- Rewriting private prompts or exposing private `storageKey` values.
- Treating local fallback images as live-provider production evidence.

## Production Policy Copy

Use short product-facing copy:

- Publish confirmation: "เผยแพร่ผลงานนี้ไป Public Gallery"
- Unpublish confirmation: "ยกเลิกเผยแพร่และเก็บกลับเป็นส่วนตัว"
- Report button: "รายงานผลงาน"
- Report reason helper: "แจ้งเหตุผลสั้น ๆ เพื่อให้ผู้ดูแลตรวจสอบ"
- Admin hide action: "ซ่อนผลงานสร้างและปิดรายงาน"
- Hidden state: "ผลงานสร้างนี้ถูกซ่อนแล้ว"

Avoid copy that says or implies:

- Public Gallery contains demo/fake production content.
- Reported media will be deleted immediately without review.
- Private prompt, source file, raw provider payload, or storage path is visible to public users.

## Review Workflow

1. User reports a public output from AI Creator Public Gallery.
2. Backend creates a `Report` with `targetType=GENERATION_OUTPUT` and `generationOutputId`.
3. Admin opens `/moderation`, filters target type `GENERATION_OUTPUT` if needed, and reviews media summary/reason/details.
4. Admin chooses one outcome:
   - `REVIEWED`: report was inspected but not resolved yet.
   - `REJECTED`: report is invalid or no action needed.
   - `RESOLVED`: issue handled without hiding the output.
   - `HIDE_GENERATION_OUTPUT`: hide the output, set it private, resolve the report, and create an admin audit log.
5. Admin checks latest audit entries to confirm the action and actor were recorded.

## Data And Privacy Rules

- Public Gallery list/detail DTOs must stay sanitized.
- Public DTOs must not expose `storageKey`, raw provider responses, private prompt metadata, source upload metadata, or owner-private account fields.
- Owner-only download routes may resolve direct/public/signed URLs, but admin/public UI must never show `storageKey`.
- Hiding a generation output should preserve the report record and audit log for traceability.

## Local QA

Run after moderation or Public Gallery changes:

```powershell
bun run frontend:components:test
bun run frontend:check
bun run api:audit
bun run backend:check
```

Run when local backend/PostgreSQL/browser are available:

```powershell
bun run qa:seed
bun run smoke:local
bun run e2e:smoke
```

Expected local evidence:

- `/moderation` can filter and act on `GENERATION_OUTPUT` reports.
- `HIDE_GENERATION_OUTPUT` is accepted by the frontend API type and backend route.
- Admin audit logs include `HIDE_GENERATION_OUTPUT`.
- Public Gallery reuse/report still works without exposing private metadata.

## Production Gate

Do not mark production ready until all are true:

- Production/staging DB migrations are applied.
- `ADMIN_API_KEY` is configured and not reused from local examples.
- Public Gallery reports can be created against deployed backend.
- `/moderation` can load deployed reports and audit logs over HTTPS.
- `HIDE_GENERATION_OUTPUT` hides a real public output and audit log appears.
- Supabase signed storage is configured for private media.
- Live image provider smoke passes separately from local fallback output.
