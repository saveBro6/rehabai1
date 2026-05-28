# AGENTS.md

Instructions for future coding agents working in `D:\Rehab1`.

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
- Use `npm.cmd` and `npx.cmd` on Windows PowerShell.
- Check `git status --short` before and after changes.
- Preserve the Supabase Auth seed token fix in:
  - `supabase/migrations/20260527110000_fix_pk_and_recursion.sql`
  - `supabase/migrations/20260527110002_fix_auth_user_token_nulls.sql`
- Do not revert unrelated user changes. Work with dirty-tree changes and keep your own edits scoped.
- Prefer small, focused commits when asked to commit.

## Local Development

Start Supabase:

```powershell
cd D:\Rehab1
npx.cmd supabase start
```

Reset local database:

```powershell
cd D:\Rehab1
npx.cmd supabase db reset
```

Stop Supabase:

```powershell
cd D:\Rehab1
npx.cmd supabase stop
```

Run frontend:

```powershell
cd D:\Rehab1\frontend
npm.cmd run dev
```

Build frontend:

```powershell
cd D:\Rehab1\frontend
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
```

Only the anon/publishable key belongs in frontend env. Never add `service_role` or secret keys.

After `npx.cmd supabase db reset`, restart the frontend dev server and clear or refresh browser sessions if auth acts strangely.

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
- For Supabase changes, consider `npx.cmd supabase db reset` when the task changes migrations or seed data.
- Re-check `git status --short`.
- Summarize changed files, validation run, and any remaining risks.
