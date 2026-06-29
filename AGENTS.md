# AGENTS.md

Instructions for future coding agents working in `D:\Rehab2`.

## Mandatory Reading Order

Before modifying files, read in this order:

1. `C:\Users\admin\Downloads\Rehabai Final Specification.docx` if available.
2. `D:\Rehab_AI_Use_Case_Specification_v6_18_rehabilitation_exercise_video_library_update.docx` if the task touches products, commerce, Exercise Library, exercise videos, subscriptions, media, Doctor access, Patient access, or Admin management.
3. `docs/integrated-spec-v6-18.md` before coding any feature from Final Spec or SRS v6.18.
4. `docs/implementation-notes.md`.
5. `README.md`.
6. `supabase/migrations/`, `supabase/schema.sql`, and `supabase/seed.sql`.
7. Relevant frontend route, component, hook, service, and type files for the task.

If the `.docx` is locked by another process, read it with a non-destructive method that allows shared read access. Do not introduce Python just to read it.

## Audit Before Code

For any task that touches Final Spec or SRS v6.18 scope, audit before editing application code:

- Identify which document requires the feature.
- Check current routes, services, components, schema, seed, migrations, storage buckets, and RLS policies.
- Record whether the repo status is implemented, partial, broken, or missing.
- Note conflicts between documents before choosing an implementation path.
- If a conflict is found between the specs and the repo, document it before coding.
- Check `docs/integrated-spec-v6-18.md` for `Open Decisions Before Implementation`.
- If the task is affected by any open decision, ask the user/product owner before coding.
- For Doctor or Admin work, also check `Doctor Flow Final Decision`, `Admin Flow Final Decision`, and `Admin/Doctor Open Decisions Before Coding`.
- For Patient work, also check `Patient Flow Final Decision`, `Patient Flow Current Repo Status`, and `Patient Flow Open Decisions Before Coding`.
- Update documentation first when the user asks for audit/documentation only.

Do not make business-logic changes during audit-only tasks.

## Conflict Resolution

- If SRS v6.18 conflicts with older Product Video direction, SRS v6.18 wins.
- Products remain commerce-only.
- Rehabilitation exercise videos belong to the Exercise Library.
- Do not implement product videos under Product routes, Product tables, Product admin forms, or Product services unless a newer explicit spec reverses SRS v6.18.
- Product videos are not allowed in the current integrated decision. Exercise videos belong to Exercise Library only.
- Do not implement product videos.
- If Final Spec and SRS v6.18 differ on route/access details, state the conflict and ask or document the recommended resolution before coding.

## Chatbot Boundary

- Do not modify chatbot implementation unless the task explicitly says chatbot is assigned to this agent.
- Do not implement chatbot unless explicitly assigned.
- Chatbot requirements may be documented as boundaries, dependencies, and integration notes only.
- Do not add or expose OpenRouter keys, prompts, or server calls from frontend code.
- Preserve existing chatbot files unless the task explicitly scopes chatbot work.

## SRS v6.18 Exercise Video Rules

- Admin manages rehabilitation exercise videos in the Exercise Library, not Product.
- Exercise video source may be an external URL or uploaded file, but the implementation must prevent two active sources or define deterministic priority.
- Exercise video URLs must be validated before use.
- Uploaded exercise videos must validate extension, content type, size, safe filename, and storage path.
- Doctors may view full rehabilitation exercise videos for clinical guidance.
- Patients without eligible full-access subscription may preview only the first one-third of a video before upgrade prompting.
- Do not introduce a new Pro plan. SRS v6.18 Pro maps to the existing Standard and Premium plans.
- Free is the default plan for newly registered Patients, and Basic is the entry paid plan.
- Standard is the main full-rehabilitation plan and receives full exercise video access.
- Premium includes all Standard features plus priority/specialist/advanced report features and also receives full exercise video access.
- Free and Basic do not receive full exercise video access.
- Full Patient video access must be enforced server-side or by a controlled delivery strategy; client-only hiding is not sufficient.
- Exercise videos must not expose internal paths, private storage paths, secrets, or sensitive metadata.

## Required Skill Protocol

The specification requires agents to read task-relevant skills before coding. State the checklist before edits:

```text
Skills can doc:
- [skill 1]
- [skill 2]

Ly do:
- Task nay lien quan toi ... nen can doc ...
```

Apply this mapping:

- Next.js routing, App Router, layouts, pages, route handlers, middleware, Server Components, navigation, metadata, or data fetching: read Next.js/React/Vercel best-practice skills available in the environment.
- Supabase Auth, Database, Storage, RLS, Realtime, migrations, seed data, SQL functions, RPC, indexing, or query optimization: read Supabase and Supabase Postgres skills available in the environment.
- UI/UX, dashboards, landing pages, forms, modals, tables, feature locks, pricing, booking, cart/checkout, chatbot UI, responsive design, or transitions: read UI/UX and Next.js/React skills available in the environment.
- Full-stack feature tasks touching UI plus Supabase plus Next.js: read all relevant skills before editing.

If a named skill from the spec is not available in the current environment, say so briefly and use the closest available skill.

## Hard Rules

- Do not introduce Python or FastAPI. RehabAI is a Next.js plus Supabase project.
- Do not change business logic unless the task explicitly requests it.
- Do not expose Supabase `service_role`, secret keys, OpenRouter keys, or other secrets in frontend code or committed files.
- Do not commit `frontend/.env.local`, `.env`, `.vs/`, build outputs, or local IDE files.
- Do not run `npx.cmd supabase db reset` unless explicitly approved by the user for the current task.
- Do not run `npm.cmd run db:reset` unless explicitly approved by the user for the current task.
- Do not expose `SUPABASE_SECRET_KEY` in browser/client code. It is only for local scripts or server-only contexts.
- Do not add random external image domains to `frontend/next.config.js` to bypass bad seed data.
- Seeded image fields should use relative Supabase Storage paths, for example `products/hand-grip.jpg`, `doctors/le-minh-khoa.jpg`, and `exercises/passive-arm-raise.jpg`.
- `npx.cmd supabase db reset` does not upload storage images.
- `npm.cmd run db:reset` resets the database and then uploads storage images via `frontend/seed-storage.js`.
- Manual storage seed command: `cd D:\Rehab2\frontend; node .\seed-storage.js`.
- After every approved local `npx.cmd supabase db reset`, run the manual storage seed command again before frontend/manual testing. A DB reset recreates rows/buckets but does not upload Storage image objects.
- Do not touch chatbot/OpenRouter/message files unless explicitly requested.
- Use `npm.cmd` and `npx.cmd` on Windows PowerShell.
- Check `git status --short` before and after changes.
- Preserve the Supabase Auth seed token fix in:
  - `supabase/migrations/20260527110000_fix_pk_and_recursion.sql`
  - `supabase/migrations/20260527110002_fix_auth_user_token_nulls.sql`
- Do not revert unrelated user changes. Work with dirty-tree changes and keep your own edits scoped.
- Prefer small, focused commits when asked to commit.

## Local Supabase / Windows Command Rules

- Current local repo is `D:\Rehab2`.
- Current local branch is `test2`.
- Current local Supabase project id should be `rehab2`, not `rehabai`.
- Before running any Supabase start/stop/status/reset command, inspect the local project id:

```powershell
cd D:\Rehab2
type supabase\config.toml | findstr project_id
```

- If the output is not `project_id = "rehab2"`, stop and report the mismatch before running any Supabase command.
- Use Windows command shims in PowerShell: `npx.cmd` and `npm.cmd`.
- Prefer `npx.cmd supabase ...` for Supabase CLI commands. Do not assume global `supabase` is available in `PATH`.
- Do not run package scripts that call plain `supabase` unless the script has been audited for Windows/PATH compatibility. In this repo, `frontend/package.json` has `db:reset` calling plain `supabase`, so do not use `npm run db:reset` / `npm.cmd run db:reset` as a shortcut.
- `rehab2` and the old `rehabai` local Supabase stacks use the same ports. Do not try to run both stacks at the same time.
- Do not delete Docker containers or volumes unless explicitly requested. Old local data may still live in `supabase_db_rehabai` and `supabase_storage_rehabai`.

## DB Reset And Storage Seed Rules

- Do not run `npx.cmd supabase db reset` unless explicitly approved by the user for the current task.
- Do not run `npm run db:reset` or `npm.cmd run db:reset` unless explicitly approved by the user for the current task and the script has been checked for Windows/PATH compatibility.
- `npx.cmd supabase db reset` applies migrations and `supabase/seed.sql`; it does not upload Supabase Storage image files.
- After every approved local `npx.cmd supabase db reset`, run the Storage seed manually before frontend/manual testing:

```powershell
cd D:\Rehab2\frontend
node .\seed-storage.js
```

- If the current task explicitly forbids storage seeding, or if the env points to Supabase Cloud instead of local Supabase, do not run the script; stop and report why images were not reseeded.
- `frontend/seed-storage.js` requires `SUPABASE_SECRET_KEY` in `frontend/.env.local`. Use the local service role key from `npx.cmd supabase status`; never expose it in browser/client code or committed files.
- Before running the storage seed script, confirm `NEXT_PUBLIC_SUPABASE_URL` points to local Supabase, normally `http://127.0.0.1:54321`, not Supabase Cloud.
- The storage seed script uploads to the `images` bucket with `upsert: true`; it overwrites same-path objects but does not delete stale objects.

## Image URL And Seed Data Rules

- Seeded image fields should store paths that resolve through the Supabase Storage bucket `images`.
- Relative object paths should be bucket-relative, for example `doctors/dr-test.jpg`, `products/hand-grip.jpg`, and `exercises/passive-arm-raise.jpg`.
- Public image URLs must include the bucket segment: `/storage/v1/object/public/images/...`.
- A URL such as `/storage/v1/object/public/doctors/dr-test.jpg` is wrong because it omits the `images` bucket.
- Do not add external image domains such as `static.vecteezy.com` to `frontend/next.config.js` to hide bad seed data. Fix the seed data path, upload the missing object to the `images` bucket, or document the mismatch.

## Local Development

Start Supabase:

```powershell
cd D:\Rehab2
npx.cmd supabase start
```

Reset local database only after explicit user approval for the current task:

```powershell
cd D:\Rehab2
npx.cmd supabase db reset
```

Stop Supabase:

```powershell
cd D:\Rehab2
npx.cmd supabase stop
```

Run frontend:

```powershell
cd D:\Rehab2\frontend
npm.cmd run dev
```

Build frontend:

```powershell
cd D:\Rehab2\frontend
npm.cmd run build
```

Local endpoints:

- Supabase API: `http://127.0.0.1:54321`
- Supabase Studio: `http://127.0.0.1:54323`
- Mailpit: `http://127.0.0.1:54324`
- Frontend dev server: usually `http://localhost:3000`

## Environment Rules

`frontend/.env.local` must exist locally and contain:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local Supabase anon/publishable key>
SUPABASE_SECRET_KEY=<local Supabase service role key, only for local seed scripts>
```

Only the anon/publishable key belongs in browser/client code. Never expose `service_role`, `SUPABASE_SECRET_KEY`, or other secret keys in committed files or frontend runtime code.

After an explicitly approved `npx.cmd supabase db reset`, restart the frontend dev server and clear or refresh browser sessions if auth acts strangely.

## Architecture Notes

- Frontend app lives under `frontend/app`.
- Supabase client helpers live under `frontend/lib/supabase`.
- Data access lives under `frontend/services`.
- Auth guards live under `frontend/components/auth`.
- Current patient-facing routes use short paths like `/dashboard`, `/profile`, `/appointments`, `/cart`, `/recovery-plan`, and `/progress`; the final specification lists `/patient/...` routes, so treat route changes as product/business decisions.
- Current admin implementation is one `/admin` summary page, not the full set of spec admin subroutes.
- Doctor workspace access and Doctor public visibility are separate. Do not treat an active Doctor account as publicly approved.
- Admin currently has only a summary page. Do not assume `/admin/*` management routes exist.
- Current profile model uses `accounts`, `patients`, and `doctors`, not spec names `profiles`, `patient_profiles`, and `doctor_profiles`.

## Supabase Auth Seed Token Fix

Do not revert this fix.

The local login bug was:

```text
Database error querying schema
confirmation_token: converting NULL to string is unsupported
```

Cause: a migration inserted `auth.users` rows without Auth token string fields, producing `NULL` values that Supabase Auth could not scan.

Fix:

- `20260527110000_fix_pk_and_recursion.sql` includes the missing token fields in the `doctor@test.com` insert.
- `20260527110002_fix_auth_user_token_nulls.sql` updates existing `NULL` token fields to empty strings.

When adding test Auth users directly in SQL, include Auth token string fields as empty strings or use a proven seed pattern that avoids `NULL` token strings.

## Before Finishing A Task

- Run the smallest useful validation for the change.
- For frontend changes, prefer `npm.cmd run build` when feasible.
- For Supabase changes, consider whether validation would require `npx.cmd supabase db reset`, but ask for explicit approval before running it.
- Re-check `git status --short`.
- Summarize changed files, validation run, and any remaining risks.
