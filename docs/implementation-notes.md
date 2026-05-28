# RehabAI Implementation Notes

Last updated: 2026-05-28

## Integrated Spec v6.18 Status

Read `docs/integrated-spec-v6-18.md` before coding any feature from the Final Spec or SRS v6.18. That document is now the project-level conflict log and implementation planning source for Final Spec plus SRS v6.18.

Most important sections for planning:

- `Final Conflict Resolutions To Apply Before Coding`: resolved conflicts, impacted modules, later code-change needs, and priority.
- `Approved MVP Decisions`: decisions that are already safe to apply in later implementation tasks.
- `Open Decisions Before Implementation`: items that require user/product confirmation before coding.
- `Implementation Backlog From Resolved Conflicts`: grouped backlog for safe UI, commerce, admin, shipping, exercise video, security/RLS, and deferred work.
- `Doctor Flow Final Decision` through `Doctor Flow Implementation Roadmap`: source of truth for Doctor workspace, public profile review, appointment handling, and Doctor exercise-video access planning.
- `Admin Flow Final Decision` through `Admin Flow Implementation Roadmap`: source of truth for admin dashboard, management modules, review/approval, shipping, reports, and audit planning.
- `Admin/Doctor Open Decisions Before Coding`: unresolved schema/route/security choices for Doctor/Admin work.
- `Patient Flow Final Decision` through `Patient Flow Open Decisions Before Coding`: source of truth for Patient dashboard/profile, product/cart/checkout/orders, appointments, subscription, exercise access, recovery/progress, notifications, and wallet/refund deferral.

Before coding, check whether the task is affected by an open decision. If yes, ask for the decision first.

Final decisions from the integrated audit:

- Products are commerce-only. Do not add product videos, product video upload, or exercise video behavior to Product pages, Product services, Product tables, or admin Product management.
- Rehabilitation exercise videos belong to the Exercise Library. Doctor full access and Patient preview/full access must be designed there.
- Guest users may view public product metadata/images; cart, checkout, and order actions require Patient login.
- Patient is the only buyer role in MVP. Doctor and Admin may browse public products, but they are not buyer roles.
- Product detail should be public-read for active products; add-to-cart, buy-now, checkout, order history, and shipping status require Patient login.
- Public Doctor visibility should depend on active/approved/not-deleted public profile state, not on whether the Doctor currently has available slots. If no slot exists, Patient should be able to submit a flexible appointment request.
- Keep Supabase recovery link/token for MVP forgot/reset password. SRS email-code reset is deferred.
- Keep current `accounts`/`patients`/`doctors` schema names unless a future migration plan is explicitly approved.
- Mock checkout is allowed for MVP, but real `paid` status must not be treated as gateway-confirmed payment unless webhook/payment verification exists.
- Shipping MVP is missing/partial and should be implemented as a separate task with manual admin shipment tracking.
- Full admin management is missing/partial; current `/admin` is only a summary page.
- Exercise video gating must be enforced server-side or through signed/controlled delivery. A frontend-only timer is not enough.
- Chatbot implementation is owned by another member. Current tasks should only document boundaries unless chatbot is explicitly assigned.

Current missing/broken features from the integrated spec:

- `/faq` is missing.
- Product detail is currently auth-gated, which conflicts with the SRS v6.18 decision that Guests may view public product metadata/images.
- Cart lacks quantity update/remove UI and robust stock validation.
- Checkout/order creation is mock-only, not transaction-safe, does not decrement stock, and currently marks orders as `paid`.
- Patient order history/detail pages are missing.
- Patient shipping status is missing.
- Patient appointment detail/cancel and flexible appointment request are missing.
- Patient notifications page is missing even though `notifications` table/service exist.
- Patient Exercise Library video access is incomplete: `/exercises/[id]` is Basic-gated as a whole page, with no one-third preview or controlled full-access delivery.
- Admin product CRUD and admin order management pages are missing.
- Manual shipping fields, shipment tracking UI, and patient shipping status are missing.
- Flexible appointment request, patient appointment detail/cancel, and admin/staff appointment handling are incomplete.
- Doctor public profile review is missing.
- Exercise video rendering/upload/validation/access gating is missing even though `exercises.video_url` exists.
- Pro-vs-Free/Basic/Standard/Premium subscription mapping is unresolved for full exercise video access.
- Reports, audit logs, services management, reviews, payouts, wallet, and staff delegation are missing or deferred.
- Chatbot/OpenRouter integration remains outside this agent's current implementation scope.

Doctor/Admin flow audit summary:

- Doctor workspace routes exist: `/doctor`, `/doctor/dashboard`, `/doctor/change-password`, `/doctor/profile`, `/doctor/schedules`, `/doctor/appointments`, `/doctor/appointments/[appointmentId]`, `/doctor/patients`, `/doctor/notes`, `/doctor/notifications`.
- Doctor account is local-testable through seeded `doctor@test.com`; invite-token setup is not implemented.
- Doctor password-change flow uses `accounts.must_change_password`; richer statuses like `PENDING_PASSWORD_SETUP` and `SUSPENDED` are not implemented.
- Doctor profile edit is immediate and lacks public profile submission/review, restricted-field review, credential review, and approval/rejection reasons.
- Current public Doctor read policy and `getDoctors()` do not enforce active + approved + not deleted visibility because review/deleted fields do not exist.
- Doctor schedule and appointment actions are partial; flexible appointment request flow and full SRS appointment state machine are missing.
- Doctor avatar upload currently targets an `avatars` bucket, while migrations create only `images`; treat this as a likely setup/schema mismatch before coding avatar work.
- Doctor full Exercise Library video access is missing and must not be implemented under Products.
- Admin currently has only `/admin`, a read-only summary-style page. There are no `/admin/*` management subroutes.
- Admin service functions exist for doctors/products/exercises, but full admin CRUD UI, order management, shipping, Doctor public profile review, reports, settings, and audit logs are missing.
- Before implementing Admin/Doctor writes, verify RLS and decide whether to use direct RLS, RPC, or server route handlers.

Patient flow audit summary:

- Patient-facing routes currently use short paths: `/dashboard`, `/profile`, `/appointments`, `/cart`, `/recovery-plan`, `/recovery-plan/create`, `/recovery-plan/[id]`, `/progress`, `/products`, `/products/[id]`, `/exercises`, `/exercises/[id]`, and `/pricing`.
- Missing Patient routes include `/orders`, `/orders/[id]`, `/checkout` if separated from cart, `/notifications`, `/wallet`, and any `/patient/*` namespace.
- Product detail currently uses `RequireAuth`; the integrated decision is that active product detail metadata/images should be public-read while buyer actions stay Patient-protected.
- `/cart` performs mock checkout through `createOrderFromCart()`. The service inserts `status: "paid"`, does not decrement stock, and is not transaction-safe, so it must be fixed before treating orders as real revenue.
- `orders.service.ts` has read functions for order history/detail, but no Patient UI consumes them.
- `notifications.service.ts` and the `notifications` table exist, but only Doctor notifications UI exists.
- `/exercises/[id]` uses `RequireSubscription requiredPlan="Basic"` and does not implement SRS v6.18 Patient one-third preview or full-access controlled delivery.
- Before coding Patient work, check `Patient Flow Open Decisions Before Coding` in `docs/integrated-spec-v6-18.md`.

## Scope And Stack

RehabAI is a rehabilitation support application. The current repo is a Next.js App Router frontend backed directly by Supabase Auth, Supabase Postgres, Supabase Storage, and Row Level Security policies.

Do not add a Python or FastAPI backend. The project architecture is Next.js plus Supabase. Do not expose Supabase `service_role`, secret keys, or OpenRouter keys to frontend code. `frontend/.env.local` is required for local development and must not be committed.

## Project Structure

```text
D:\Rehab1
  README.md
  AGENTS.md
  docs/
    implementation-notes.md
    integrated-spec-v6-18.md
  frontend/
    app/                 Next.js App Router pages and layouts
    components/          UI components and auth guards
    config/              Sidebar/page navigation metadata
    hooks/               Auth, cart, toast, subscription access hooks
    lib/                 Supabase client helpers, constants, utilities
    public/images/       Local image assets for doctors, products, exercises, hero
    services/            Supabase data access layer
    types/               App and generated Supabase TypeScript types
    .env.example         Local env template
  supabase/
    config.toml          Local Supabase CLI configuration
    schema.sql           Schema snapshot
    seed.sql             Seeded auth users and domain data
    migrations/          Ordered SQL migrations
    snippets/            Scratch SQL
```

## Local Setup

Use Windows command shims because PowerShell may block `npm.ps1` and `npx.ps1`.

```powershell
cd D:\Rehab1
npx.cmd supabase start
```

Local Supabase endpoints:

- API URL: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Mailpit: `http://127.0.0.1:54324`
- DB port from `supabase/config.toml`: `54322`

Create `D:\Rehab1\frontend\.env.local` from `frontend/.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local Supabase anon/publishable key>
```

Never place `service_role` or other secret keys in `frontend/.env.local`. Do not commit `.env.local`.

Run the frontend:

```powershell
cd D:\Rehab1\frontend
npm.cmd run dev
```

Common local Supabase commands:

```powershell
cd D:\Rehab1
npx.cmd supabase start
npx.cmd supabase stop
npx.cmd supabase status
npx.cmd supabase db reset
```

After `db reset`, restart the Next.js dev server and refresh browser sessions. Existing browser cookies can point at deleted users/sessions and cause confusing auth behavior until the app is reloaded or the browser session is cleared.

## Implemented Frontend Routes

Public/auth routes:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/doctors`
- `/doctors/[id]`
- `/products`
- `/products/[id]`
- `/exercises`
- `/exercises/[id]`
- `/pricing`

Authenticated patient-style routes currently use short paths, not the spec's `/patient/...` namespace:

- `/dashboard`
- `/profile`
- `/appointments`
- `/cart`
- `/recovery-plan`
- `/recovery-plan/create`
- `/recovery-plan/[id]`
- `/progress`

Doctor routes:

- `/doctor`
- `/doctor/dashboard`
- `/doctor/change-password`
- `/doctor/profile`
- `/doctor/schedules`
- `/doctor/appointments`
- `/doctor/appointments/[appointmentId]`
- `/doctor/patients`
- `/doctor/notes`
- `/doctor/notifications`

Admin route:

- `/admin`

The specification lists many `/admin/...` subroutes. The current implementation has one admin summary page instead of separate admin CRUD pages.

## Implemented Features And Modules

Auth and account flow:

- Supabase Auth login, registration, forgot password, reset password.
- Client Supabase helpers under `frontend/lib/supabase/`.
- Middleware session refresh in `frontend/middleware.ts` through `frontend/lib/supabase/middleware.ts`.
- Auth guards: `RequireAuth`, `RequireAdmin`, `RequireSubscription`.
- Account/profile reads combine `accounts` plus `patients` in `frontend/services/users.service.ts`.
- Doctor first-login password-change UI exists at `/doctor/change-password`.

Public website:

- Landing page with doctor/product/exercise/pricing sections.
- Doctor list/detail with appointment CTA.
- Product list/detail and cart flow.
- Exercise list/detail with subscription guard.
- Pricing/subscription selection.

Patient-style features:

- Dashboard summary.
- Profile view/update.
- Appointments list and appointment creation through doctor detail.
- Cart and mock checkout/order creation.
- Subscription records and access gating.
- Recovery plan list/create/detail with rule-based exercise selection.
- Exercise log creation and progress summary.
- Rule-based chatbot widget and message persistence.

Doctor features:

- Doctor dashboard.
- Doctor profile.
- Schedule slots.
- Appointment list/detail.
- Appointment status actions through service functions.
- Doctor notes.
- Related patients summary.
- Notifications.

Admin features:

- Admin-only summary dashboard at `/admin`.
- Reads doctors, appointments, products, subscriptions, exercises, recovery plans, and exercise logs.
- Admin CRUD service functions exist for doctors, products, and exercises, but the UI is not a full CRUD admin suite.

Data/service modules:

- `appointments.service.ts`
- `cart.service.ts`
- `chatbot.service.ts`
- `doctor-dashboard.service.ts`
- `doctor-notes.service.ts`
- `doctor-schedules.service.ts`
- `doctors.service.ts`
- `exercises.service.ts`
- `notifications.service.ts`
- `orders.service.ts`
- `products.service.ts`
- `progress.service.ts`
- `recovery-plan-generator.ts`
- `recovery-plans.service.ts`
- `subscriptions.service.ts`
- `users.service.ts`

## Supabase Schema, Migrations, Seed, Storage, RLS

Current `supabase/schema.sql` defines these public tables:

- `accounts`
- `patients`
- `doctors`
- `appointments`
- `doctor_schedule_slots`
- `doctor_notes`
- `notifications`
- `products`
- `cart_items`
- `orders`
- `order_items`
- `subscriptions`
- `user_subscriptions`
- `chatbot_messages`
- `exercises`
- `recovery_plans`
- `recovery_plan_exercises`
- `exercise_logs`

Important migrations:

- `20260520000000_initial_schema.sql`: original base schema with `users`.
- `20260521000000_auth_profile_sync.sql`: auth user trigger/profile sync.
- `20260521001000_use_local_image_paths.sql`: local image paths.
- `20260521002000_remove_homecare_add_recovery_features.sql`: exercises, recovery plans, exercise logs.
- `20260522000000_add_free_subscription.sql`: Free subscription.
- `20260522001000_create_chatbot_messages.sql`: chatbot messages.
- `20260524000000_vietnamese_product_categories.sql`: product category/content updates.
- `20260524095013_harden_public_table_rls.sql`: RLS hardening.
- `20260524095519_revoke_public_role_table_privileges.sql`: privilege revocation.
- `20260525000000_frontend_supabase_rls_policies.sql`: frontend RLS policies.
- `20260526100459_vietnamese_exercises_products_content.sql`: Vietnamese content seed.
- `20260526101504_vietnamese_exercise_taxonomy_subscriptions.sql`: taxonomy/subscription changes.
- `20260527090000_doctor_frontend_workflow.sql`: doctor workflow tables, schedules, notes, notifications.
- `20260527100000_accounts_patients_split.sql`: split account/profile model into `accounts` and `patients`.
- `20260527110000_fix_pk_and_recursion.sql`: changed patient/doctor primary keys to align with auth/account ids and fixed recursive policy patterns. Preserve the Auth token field fix in this file.
- `20260527110001_create_buckets.sql`: creates public `images` storage bucket.
- `20260527110002_fix_auth_user_token_nulls.sql`: repairs `auth.users` token string fields from `NULL` to `''`.

RLS is enabled for all user/domain tables listed in `schema.sql`. Policies include own-row access for accounts/patients, public doctor reads, doctor own profile/schedule/notes access, appointment ownership policies, notification ownership, and earlier migration policies for products, subscriptions, exercises, cart, orders, recovery plans, exercise logs, chatbot messages, and admin access. The effective schema has evolved from `users` to `accounts`/`patients`/`doctors`; check the latest migrations before adding policies.

Storage:

- Bucket `images`, public, created by `20260527110001_create_buckets.sql`.
- Frontend image URL helpers fall back to local `/images/...` assets and support Supabase Storage paths.

Auth trigger:

- `public.handle_new_auth_user()` creates/updates an `accounts` row and creates/updates a patient row for new Supabase Auth users.
- Trigger `on_auth_user_created` runs after insert on `auth.users`.

## Seeded Accounts And Data

Seed/migrations create these local Auth users. Known plaintext credentials from the spec/migrations are the three main test accounts; additional doctor accounts are seeded with password hashes, but their plaintext passwords are not explicitly documented in SQL.

| Email | Intended role | Login credential/source |
| --- | --- | --- |
| `patient@test.com` | patient | password `1111` per test-account convention |
| `admin@test.com` | admin | password `1112` per test-account convention |
| `doctor@test.com` | doctor | password `1111`; explicit `extensions.crypt('1111', ...)` in `20260527110000_fix_pk_and_recursion.sql` |
| `doctor1@test.com` | doctor | seeded doctor account; bcrypt hash in `seed.sql`, plaintext not documented |
| `doctor2@test.com` | doctor | seeded doctor account; bcrypt hash in `seed.sql`, plaintext not documented |
| `doctor3@test.com` | doctor | seeded doctor account; bcrypt hash in `seed.sql`, plaintext not documented |
| `doctor4@test.com` | doctor | seeded doctor account; bcrypt hash in `seed.sql`, plaintext not documented |
| `doctor5@test.com` | doctor | seeded doctor account; bcrypt hash in `seed.sql`, plaintext not documented |

The final specification mentions `admin@rehabai.vn`, `patient@rehabai.vn`, and `doctor@rehabai.vn` as possible test emails, but this repo seed currently uses `@test.com` emails.

Other seed data includes:

- `accounts`, `patients`, and `doctors`.
- Products and product images.
- Exercises with Vietnamese categories, instructions, and image paths.
- Subscriptions: Free, Basic, Standard, Premium.

## Comparison Against Final Specification

Implemented or partially implemented:

- Next.js App Router, TypeScript, Tailwind CSS.
- Supabase Auth, Database, Storage bucket, SQL migrations, and RLS.
- Public landing page, doctors, products, exercises, pricing.
- Login, register, forgot/reset password.
- Patient-style dashboard/profile/appointments/cart/checkout/subscription/recovery plan/progress.
- Doctor dashboard/profile/schedules/appointments/notes/patients/notifications.
- Basic admin summary view.
- Mock checkout/payment style through subscription/cart/order flows.
- Chatbot safety is rule-based and does not diagnose.

Incomplete, broken, or missing relative to the specification:

- Route map mismatch: spec uses `/patient/...`; repo currently uses `/dashboard`, `/profile`, `/appointments`, `/cart`, `/recovery-plan`, `/progress`.
- Missing `/faq`.
- Missing `/patient/subscription`, `/patient/orders`, `/patient/orders/[orderId]`, `/patient/checkout`, `/patient/chat-history`, `/patient/wallet`, `/patient/notifications` as separate pages.
- Missing most admin subroutes: `/admin/dashboard`, `/admin/users`, `/admin/patients`, `/admin/doctors`, `/admin/appointments`, `/admin/products`, `/admin/product-categories`, `/admin/orders`, `/admin/subscriptions`, `/admin/exercises`, `/admin/exercise-categories`, `/admin/reviews`, `/admin/faqs`, `/admin/testimonials`, `/admin/notifications`, `/admin/settings`, `/admin/audit-logs`.
- Admin operations are mostly client-side reads and simple tables, not a full server-validated admin system.
- RLS/table names differ from spec's `profiles`, `patient_profiles`, and `doctor_profiles`; repo uses `accounts`, `patients`, and `doctors`.
- OpenRouter API integration is not implemented server-side; chatbot is currently rule-based client/service logic.
- `system_prompt.md` in Supabase Storage bucket `ai-files` is not implemented.
- Wallet balance and wallet transaction flow are not implemented.
- Audit log for sensitive admin actions is not implemented.
- Reviews, FAQs, testimonials, admin settings, and audit-log modules are not implemented.
- shadcn/ui is listed in the spec, but the repo currently uses local components such as `Button`, `Card`, and `AdminTable`.
- Zustand is listed in the spec, but the repo currently uses React hooks/state and does not list `zustand` in `package.json`.
- Vercel preview/dashboard access is external to the local repo; local agents may not be able to inspect Vercel dashboards or protected previews.

## Known Issues And Gotchas

- `frontend/.env.local` is required. Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` causes registration/login setup errors.
- Use the local Supabase anon/publishable key only. Never put `service_role` or secret keys in frontend env files.
- On this Windows machine, use `npm.cmd` and `npx.cmd` because PowerShell may block `npm.ps1` and `npx.ps1`.
- Preserve the Supabase Auth seed token fix:
  - `20260527110000_fix_pk_and_recursion.sql` now includes missing Auth token string fields in the inserted `doctor@test.com` row.
  - `20260527110002_fix_auth_user_token_nulls.sql` repairs any existing `NULL` token values.
  - Reverting either can bring back `Database error querying schema` with `confirmation_token: converting NULL to string is unsupported`.
- After `npx.cmd supabase db reset`, local browser sessions can break because cookies reference old sessions. Sign out, clear site data, or use a fresh browser session.
- `seed.sql` uses `ON CONFLICT DO NOTHING`, so earlier migration-created rows may not be repaired by seed alone.
- `.vs/` and `frontend/.env.local` are ignored and should not be committed.
- `frontend/package-lock.json` may show unrelated npm metadata rewrites if npm install was run; do not mix that churn into DB/doc commits unless intended.

## Recent Changes/Fixes

- Added a corrective migration for Supabase Auth token fields:
  - `supabase/migrations/20260527110002_fix_auth_user_token_nulls.sql`
- Updated the original test doctor Auth insert to include token string columns:
  - `supabase/migrations/20260527110000_fix_pk_and_recursion.sql`
- These changes fix local login failures where Supabase Auth returned:
  - `Database error querying schema`
  - Auth log: `confirmation_token: converting NULL to string is unsupported`

## What Still Needs To Be Built

High priority:

- Decide whether to keep short patient routes or migrate to spec-compliant `/patient/...` routes.
- Build missing patient pages for subscription, orders, checkout, chat history, wallet, and notifications.
- Expand admin from one summary page into the spec's separate management pages.
- Add server-side validation patterns for admin operations.
- Implement audit logs for sensitive admin actions.

Medium priority:

- Implement FAQ, reviews, testimonials, settings, product/exercise categories management.
- Implement wallet data model and UI if still required.
- Implement OpenRouter chatbot through a server-side surface only, with secrets kept out of the client.
- Add `ai-files` private bucket and `system_prompt.md` handling if the AI flow is built.
- Align seeded test emails with the spec or update the spec handoff to document `@test.com` emails.

Quality/maintenance:

- Regenerate/verify `frontend/types/supabase.ts` after schema changes.
- Add automated smoke tests for auth, guarded routes, and key Supabase policies.
- Confirm local image path and Storage behavior after every reset.

## Final Spec + SRS v6.18 Integration Audit

Audit date: 2026-05-28

Documents compared:

- `C:\Users\admin\Downloads\Rehabai Final Specification.docx`
- `D:\Rehab_AI_Use_Case_Specification_v6_18_rehabilitation_exercise_video_library_update.docx`

Decision rule for this audit:

- SRS v6.18 is the latest decision for rehabilitation exercise videos.
- Products remain commerce-only.
- Rehabilitation exercise videos belong to the Exercise Library.
- Do not implement Product videos under the Product module unless a newer spec explicitly reverses v6.18.

### Feature Integration Matrix

| Feature | Final Spec? | SRS v6.18? | Current status | Existing routes/files/tables | Gap | Priority | Recommended next task |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage navigation to Products | Yes, homepage should expose product browsing | Yes, product store is a core module | Partial/broken | `frontend/app/page.tsx`, `/products` exists | Homepage has a service card mentioning products but no clear `/products` button/link or product preview section | P0 | Add a visible homepage CTA/section linking to `/products`; keep Product commerce-only |
| Product browsing | Yes | Yes | Implemented/partial | `/products`, `ProductCard`, `products.service.ts`, `products` table | Category filtering exists; no search/sort/pagination; guest list works but add-cart redirects | P1 | Add product search/filter UX and empty/loading/error states |
| Product detail | Yes, Final Spec says guest deep click redirects login | Yes, SRS allows public product metadata/images | Partial/conflict | `/products/[id]`, `getProductById`, `products` table | Current detail is wrapped in `RequireAuth`; conflict with SRS public metadata expectation | P1 | Decide access rule; likely allow public product detail metadata and gate only add-to-cart/checkout |
| Add to cart | Yes | Yes | Partial | `ProductCard`, `/products/[id]`, `cart.service.ts`, `cart_items` table | Adds/increments cart rows; no stock validation, no max quantity, no disabled state for out-of-stock | P0 | Add stock-aware cart validation and user feedback |
| Cart persistence | Yes | Yes | Partial | `/cart`, `useCart`, `cart_items` table | Persisted in Supabase; UI cannot update/remove quantities despite service functions existing | P1 | Add quantity update/remove controls and verify RLS ownership |
| Checkout/order creation | Yes, mock checkout in early phase | Yes, payment gateway later but MVP still needs order flow | Partial/broken | `/cart`, `orders.service.ts`, `orders`, `order_items` tables | Inserts order as `paid` immediately, no transaction, no stock decrement, no pending payment state, no error rollback | P0 | Implement MVP checkout transaction semantics or RPC: create order, order_items, clear cart, handle pending/paid deliberately |
| Patient order history | Yes | Yes | Missing | `orders.service.ts` has `getOrders`/`getOrderById`; `orders` and `order_items` tables | No `/patient/orders`, `/patient/orders/[id]`, or short-route equivalent | P1 | Build order list/detail pages using existing service functions |
| Admin product management | Yes | Yes | Partial/missing UI | `/admin`, `AdminTable`, `products.service.ts`, `products` table | Admin page reads products only; create/update/delete services exist but no admin product CRUD route/form | P0 | Build `/admin/products` CRUD with image URL/upload policy and server-side/RLS-aware validation |
| Admin order management | Yes | Yes | Missing | `/admin` reads appointments/products etc.; `orders` table exists | Admin page does not read/manage orders; no status/shipping management | P1 | Build `/admin/orders` list/detail with status and shipping fields |
| Shipping MVP | Implied by product checkout/order | Yes, manual shipment tracking in MVP | Partial/missing | `orders.shipping_address` only | No shipment status, tracking number, carrier, shipment timestamps, admin edit UI, or patient tracking UI | P1 | Extend schema for manual shipping fields and add admin/patient order views |
| Payment placeholder vs real gateway | Final Spec says mock checkout early, real-ready design | SRS v6.18 requires secure gateway eventually | Partial/broken | `orders.status`, `createOrderFromCart` | Current mock marks orders `paid` immediately and has no payment records/webhook-ready shape | P1 | Introduce explicit payment placeholder state/model without real secrets; keep real gateway for later |
| Exercise Library | Yes | Yes | Implemented/partial | `/exercises`, `/exercises/[id]`, `ExerciseCard`, `ExerciseDetail`, `exercises.service.ts`, `exercises` table | List/detail/instructions exist; video behavior from v6.18 missing | P0 | Add Exercise Library video display/access model |
| Exercise video URL | Final Spec mentions exercises; SRS v6.18 explicitly requires exercise video | Yes | Schema partial, UI missing | `exercises.video_url`, `Exercise` type, `exercises.service.ts` | `video_url` exists but is not rendered in `ExerciseDetail`; no URL validation policy | P0 | Render safe external/direct exercise videos; validate source rules in admin/data layer |
| Exercise video upload | Not detailed in Final Spec | Yes | Missing | `images` bucket only; no exercise-video bucket/table fields beyond `video_url` | No upload UI, no storage bucket/policy, no file validation, no replacement semantics | P1 | Add controlled exercise video upload path, bucket/policies, type/size validation, and URL-vs-upload priority rule |
| Doctor full exercise video access | Doctor features exist | Yes | Missing | `/doctor/*`, `/exercises/[id]`, subscriptions guards | Doctor route/workspace exists, but exercise detail is Basic subscription-gated and does not grant doctor full video access | P0 | Define role-aware exercise video access: doctors full access independent of patient subscription |
| Patient one-third preview | Not explicit in Final Spec | Yes | Missing | `RequireSubscription`, `useSubscriptionAccess`, `ExerciseDetail` | Current detail requires Basic for whole page; no one-third preview; no controlled playback enforcement | P0 | Build preview/full playback model: patients without Pro see one-third preview and upgrade CTA |
| Patient Pro full exercise access | Final Spec uses Basic/Standard/Premium; SRS says Pro | Yes | Conflict/partial | `subscriptions` table has Free/Basic/Standard/Premium; `RequireSubscription` gates detail at Basic and progress at Premium | Plan naming/access conflicts with SRS v6.18 Pro terminology | P0 | Decide mapping: add Pro plan or map Pro to existing Premium/Standard before implementing video gating |
| Product video direction | Earlier direction superseded | Explicitly superseded | Correctly absent | `products` table has no `video_url`; product pages show images only | None; keep it absent | P0 guardrail | Do not add product video fields/UI; put video work in Exercise Library |

### Conflicts Between Final Spec And SRS v6.18

- Product detail access: Final Spec says guest can browse lists but deep product detail redirects to `/login`; SRS v6.18 says guests may view public product metadata/images. Recommended resolution: follow SRS v6.18 for public product metadata and gate add-to-cart/checkout.
- Payment: Final Spec allows mock checkout/payment in the early phase; SRS v6.18 describes secure external payment gateway and webhook validation. Recommended resolution: keep MVP placeholder now but model states so real gateway can be added later.
- Subscription naming: Final Spec seed/subscription model uses Free, Basic, Standard, Premium; SRS v6.18 says Free/Pro and Pro unlocks full exercise videos. Recommended resolution: choose a single mapping before video access work, probably by adding a Pro plan or mapping Pro to the current highest eligible plan.
- Exercise video location: any earlier Product Video direction is superseded by SRS v6.18. Recommended resolution: Products are commerce-only; exercise videos belong only to Exercise Library.
- Media storage model: SRS v6.18 discusses controlled local server media folders for MVP and durable cloud storage later; current repo uses Supabase Storage/local public image helpers. Recommended resolution: continue Supabase Storage because it matches the current architecture, but enforce the validation/access rules from SRS v6.18.
- Route map: Final Spec uses `/patient/...`; current repo uses short patient routes; SRS v6.18 is broader and does not remove the need for patient history/subscription/shipping views. Recommended resolution: decide route namespace before building missing pages.

### Missing Or Broken Flows From This Audit

- Homepage has no clear CTA/link to `/products`.
- Product detail is auth-gated; this may conflict with SRS v6.18 public product metadata.
- Cart lacks quantity update/remove controls in UI.
- Checkout creates orders as `paid` immediately and is not transaction-safe.
- Checkout does not decrement stock or validate stock at order time.
- Patient order history/detail pages are missing.
- Admin product CRUD UI is missing.
- Admin order management and manual shipping updates are missing.
- Shipping MVP fields are incomplete beyond `shipping_address`.
- Real payment gateway is not implemented; placeholder is not clearly modeled.
- Exercise video rendering is missing despite `exercises.video_url`.
- Exercise video upload and validation are missing.
- Doctor full exercise video access is missing.
- Patient one-third preview and Pro full-access gating are missing.

### Recommended Implementation Roadmap

1. Add homepage Product CTA/preview section linking to `/products`.
2. Stabilize commerce MVP: public product detail decision, cart quantity/remove controls, stock checks, and transaction-safe mock checkout.
3. Add patient order history/detail plus admin order management with manual shipping MVP fields.
4. Add admin product management UI for commerce-only products and keep videos out of Product.
5. Implement Exercise Library video model: safe `video_url` rendering, video upload/replacement policy, role/subscription access rules.
6. Resolve Pro vs Basic/Standard/Premium subscription naming before enforcing full-video access.
7. Add server-side/RLS-backed checks where client-only gates are currently used for feature access.

### Known Integration Risks

- Direct browser Supabase access means RLS must carry real authorization guarantees; client-only checks are not enough for video/full-access enforcement.
- One-third video preview cannot be strongly enforced with a plain public video URL. It needs controlled delivery, signed URLs with metadata, segmented video, or an equivalent server-side strategy.
- Mock checkout without a database transaction can create partial orders if `order_items` insert or cart clearing fails.
- Stock checks done only on the client can oversell under concurrent checkout.
- Adding real payment later will require webhook signature validation and secrets that must never enter frontend env files.
- Product image/video upload rules must avoid exposing private paths or trusting original filenames.
- Current docs and README still contain some older `users` wording; latest migrations use `accounts`/`patients`/`doctors`.
