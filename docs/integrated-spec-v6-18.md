# RehabAI Integrated Specification v6.18

Last updated: 2026-05-28

This document integrates the RehabAI Final Specification, SRS v6.18, and the current `D:\Rehab1` implementation state. It is a planning and conflict-resolution document. It does not authorize implementation by itself.

## 1. Source Documents And Priority Rules

Sources reviewed:

- `C:\Users\admin\Downloads\Rehabai Final Specification.docx`
- `D:\Rehab_AI_Use_Case_Specification_v6_18_rehabilitation_exercise_video_library_update.docx`
- `docs/implementation-notes.md`
- `AGENTS.md`
- `README.md`
- `supabase/schema.sql`
- `supabase/seed.sql`
- Latest Supabase migrations through `20260527110002_fix_auth_user_token_nulls.sql`
- Relevant frontend routes, services, components, hooks, and guards

Priority rules:

- Final Spec is the baseline product vision.
- SRS v6.18 is the latest decision for Exercise Library, exercise videos, shipping, appointment request, Doctor public profile review, and product-commerce separation.
- If Final Spec conflicts with SRS v6.18, document the conflict and choose the safest final decision before coding.
- If both specs conflict with the current repo, do not silently rewrite the repo. Document the gap and implement only after an approved migration/task plan.
- Current repo schema uses `accounts`, `patients`, and `doctors`. Do not rename to `profiles`, `patient_profiles`, and `doctor_profiles` without a separate approved migration plan.
- Products are commerce-only. Rehabilitation exercise videos belong to the Exercise Library.
- Chatbot implementation is owned by another member unless a task explicitly assigns chatbot work to this agent.

## 2. Integrated Actors

| Actor | Integrated meaning | Current repo status |
| --- | --- | --- |
| Guest | Public visitor. Can view public landing, doctors, products, exercises, pricing, and limited public metadata. | Implemented for most public list pages. Product detail and doctor detail are currently auth-gated. `/faq` missing. |
| Patient | Registered user. Can manage profile, appointments, cart/order, subscriptions, recovery plans, progress, chatbot history, and exercise preview/full access by plan. | Partial. Core short routes exist, but order history, checkout route, wallet, notifications, and full video gating are missing. |
| Doctor | Admin-created clinical user. Uses private doctor workspace, manages schedule/profile/appointments/notes, sees related patients, and may view full exercise videos. | Partial. Doctor workspace exists, but public profile review and full exercise video access are missing. |
| Admin | Operates platform, users, doctors, products, orders, shipping, subscriptions, exercises, reports, settings, reviews, and audit. | Partial. Only `/admin` summary page exists. Full CRUD/admin subroutes are missing. |
| Authorized Internal Staff | Optional delegated operations staff for schedules/appointments. | Missing. No separate staff role or delegated permission model exists. |
| Email Delivery Service | Sends verification, invite, reset, appointment, order, shipment, subscription, and payment emails. | Partial via Supabase Auth recovery/verification. Custom email-code reset and operational emails missing. |
| Payment Gateway | External verified payment provider for orders/subscriptions/fees. | Deferred. Current checkout is mock and marks orders paid locally. |
| Shipping Provider | External delivery/logistics provider. MVP uses manual admin shipment tracking. | Deferred provider API. Manual shipping MVP is missing/partial. |
| AI Chatbot Service | External or internal AI service for general guidance and flow support. | Owned by another member. Current repo has rule-based chatbot service/widget; do not modify unless assigned. |

## 3. Integrated Role And Permission Matrix

| Capability | Guest | Patient | Doctor | Staff | Admin | External service |
| --- | --- | --- | --- | --- | --- | --- |
| Browse public homepage/pricing | Yes | Yes | Yes | Yes | Yes | No |
| Browse product metadata/images | Yes | Yes | Yes | Optional | Yes | No |
| Add cart / checkout / orders | No | Yes | No unless separately allowed | No | Manage only | Payment, email, shipping support |
| View own order history/shipping | No | Yes | No | Support only if delegated | Yes | Shipping/payment status |
| Browse exercise metadata | Yes if public | Yes | Yes | Optional | Yes | No |
| View full exercise video | No | Only Standard/Premium full-access plan | Yes | Only if delegated | Yes | Controlled media delivery only |
| Preview one-third exercise video | Maybe login required | Yes if not full access | Not needed | Optional | Yes | Controlled media delivery only |
| Book appointment | No | Yes | No | Can assist if delegated | Can manage | Email/payment support |
| Flexible appointment request | No | Yes | Review if assigned | Can manage if delegated | Can manage | Email support |
| Manage own profile | No | Yes | Yes for allowed fields | Yes own staff profile | Yes all relevant records | No |
| Doctor public profile approval | No | No | Submit only | No unless delegated | Approve/reject | Email notification |
| Manage products/images | No | No | No | No unless delegated | Yes | Storage only |
| Manage rehabilitation exercises/videos | No | No | No | No unless delegated | Yes | Storage/media only |
| Manage users/RBAC | No | No | No | No | Yes | Email invite support |
| Reports/audit logs | No | No | No | Limited if delegated | Yes | No |
| Chatbot | Limited | Yes by quota/plan | Optional clinical guidance only if defined | Optional | Observe/configure only | AI service |

## 4. Full Integrated Use Case List

Status values: implemented, partial, broken, missing, deferred, owned by another member.

| UC | Name | Integrated decision | Current status |
| --- | --- | --- | --- |
| UC-01 | Register Patient Account | Public registration creates Patient account; Doctor accounts are admin-created only. Final Spec default Free subscription/wallet are desired but current repo lacks wallet and automatic Free subscription. | Partial |
| UC-02 | Login / Logout | Supabase Auth login/logout. Status eligibility should be enforced by account status. | Partial |
| UC-03 | Verify Patient Email | Supabase email confirmation is acceptable. Doctor invite/setup is UC-31/UC-34. | Partial |
| UC-04 | Manage Profile | Patient and Doctor may update allowed profile fields. Repo uses `accounts`/`patients`/`doctors`, not spec profile names. | Partial |
| UC-05 | View Medical Services | Public medical services are in spec. Current repo has doctors/appointments but no services table/pages. | Missing |
| UC-06 | Search Doctors | Public search/list by profile data. SRS says approved active doctors remain visible even without slots. | Partial |
| UC-07 | Book Appointment | Must support direct slot booking and flexible appointment requests. Current flow is basic appointment creation. | Partial |
| UC-08 | Manage Appointment | Patient history/detail/cancel; current `/appointments` list exists but detail/cancel flow is limited. | Partial |
| UC-09 | Chat With AI Assistant | Chatbot scope belongs to another member. Document boundaries only; do not modify implementation in current scope. | Owned by another member |
| UC-10 | Browse Products | Products are commerce-only. Guests may view public metadata/images; cart/checkout require Patient login. SRS product-video wording is superseded by UC-40..42. | Partial |
| UC-11 | Manage Cart | Patient adds/updates/removes cart. Current UI adds and checks out, but quantity/remove UI and stock validation are incomplete. | Partial |
| UC-12 | Place Order | Patient creates order from cart. Must not imply gateway-confirmed payment unless verified. Current mock order creation marks paid. | Partial/broken |
| UC-13 | Make Payment | Real gateway/webhook is future work. MVP may use mock payment if clearly modeled. | Deferred |
| UC-14 | Manage Doctor Schedule | Doctor schedule slots exist and doctor route exists. Staff delegation missing. | Partial |
| UC-15 | Confirm / Cancel Appointment | Doctor/admin/staff status transitions. Current doctor appointment status actions exist but full rules/admin/staff are incomplete. | Partial |
| UC-16 | Manage Services | Admin services CRUD is required by SRS. | Missing |
| UC-17 | Manage Products | Admin product CRUD/images/stock for commerce-only products. Services exist; full admin UI missing. | Partial |
| UC-18 | Manage Users | Admin user/doctor/staff management, account status, public profile approval. | Missing/partial |
| UC-19 | View Reports | Revenue/order/appointment/user reports. Current `/admin` summary is not full reporting. | Partial |
| UC-20 | Send Email Notification | Included system behavior for auth, appointments, orders, shipments, subscriptions, payments. Supabase auth emails only. | Partial |
| UC-21 | Forgot / Reset Password | Final MVP decision: keep Supabase recovery link/token. SRS email-code reset is deferred. | Partial |
| UC-22 | Manage Orders | Patient order history/detail/shipping/cancel. Service functions exist; pages missing. | Missing |
| UC-23 | Manage Orders Admin | Admin order status, shipping, cancellation/refund handling. | Missing |
| UC-24 | Subscribe to Plan | Patient subscription selection exists with Free/Basic/Standard/Premium. Final decision maps SRS v6.18 Pro video access to Standard and Premium. | Partial |
| UC-25 | Manage Subscription | Patient subscription status/cancel/payment method/quota. Current pricing creates records; management page missing. | Partial |
| UC-26 | Subscription Renewal | Recurring renewal/retry/failure states. | Missing/deferred |
| UC-27 | Manage Subscriptions Admin | Admin subscription data/revenue/manual overrides. | Partial/missing UI |
| UC-28 | Manage Disputes | Appointment disputes/no-show outcomes. | Missing/deferred |
| UC-29 | Submit Review | Patient appointment review and moderation. | Missing |
| UC-30 | Manage Payouts | Doctor earnings, commission, payouts. | Missing/deferred |
| UC-31 | Create Doctor Account | Admin-created Doctor with invitation setup and unpublished public profile until approval. Test doctor is seeded; admin onboarding UI missing. | Partial |
| UC-32 | Manage Product Order Shipping | MVP manual shipment tracking by Admin. Current schema only has `shipping_address`. | Missing/partial |
| UC-33 | View Order Shipping Status | Patient sees carrier/tracking/delivery dates. | Missing |
| UC-34 | Doctor Setup Password and Dashboard Access | Doctor first-login password change and dashboard exist. Invite flow incomplete. | Partial |
| UC-35 | View Doctor Appointments | Doctor own appointment list/detail exists. | Partial |
| UC-36 | Upload Patient Profile Image | Patient profile image upload/replacement. | Missing |
| UC-37 | Upload Product Image | Admin product image upload/replacement. Current product images are paths; storage bucket is generic `images`; admin upload UI missing. | Partial/missing UI |
| UC-38 | View Lookup Lists | Active specialties/categories filters/dropdowns. Product categories derive from products; no dedicated lookup tables. | Partial |
| UC-39 | Submit and Review Doctor Public Profile | Doctor submits, Admin approves/rejects, only approved profiles public. | Missing |
| UC-40 | Manage Rehabilitation Exercises | Admin CRUD/publish/unpublish/soft-delete exercise records separate from products. Current exercise table/services exist; admin UI incomplete. | Partial |
| UC-41 | Manage Rehabilitation Exercise Video | Admin adds/replaces/removes one primary exercise video by URL or upload, with validation and source priority. | Missing/partial schema |
| UC-42 | View Subscription-Gated Rehabilitation Exercise Video | Doctor full video; Patient one-third preview on Free/Basic; Standard/Premium full access. Must be enforced server-side/controlled delivery. | Missing |

## 5. Contradiction And Inconsistency Audit

| ID | Conflict or inconsistency | Evidence | Final decision |
| --- | --- | --- | --- |
| A | Product video vs Exercise video | Older/product wording and SRS UC-10 mention optional exercise video metadata in product browsing, while v6.18 change log and UC-17/UC-40/UC-41 separate rehabilitation videos from products. | Products are commerce-only. Exercise videos belong to Exercise Library. Do not add product video fields/UI. |
| B | Doctor visibility vs available schedule slots | Some discovery wording implies search by available time; SRS role matrix says public visibility requires active/approved/not deleted and slots only affect direct booking. | Public visibility must not require available slots. No slots means Patient can submit flexible appointment request. |
| C | Forgot/reset password code vs Supabase recovery link | SRS v6.18 describes email verification code; current repo uses Supabase recovery link/token. | Keep Supabase recovery link/token for MVP. Custom email-code reset is deferred unless explicitly required. |
| D | Final Spec schema names vs current repo schema | Final Spec uses `profiles`, `patient_profiles`, `doctor_profiles`; current schema/migrations use `accounts`, `patients`, `doctors`. | Keep current schema names unless a future migration plan is approved. |
| E | Payment status and checkout | Specs mention real gateway/webhook; current repo mock checkout inserts `orders.status = 'paid'`. | Mock checkout is allowed, but paid must not mean gateway-confirmed unless webhook/payment verification exists. |
| F | Shipping | SRS requires manual shipping and tracking; current repo only has `orders.shipping_address`. | Shipping MVP is missing/partial and must be implemented separately. |
| G | Admin scope | Specs require full admin CRUD and management pages; current repo has one admin summary page and some services. | Full admin suite is missing/partial. Build focused admin subroutes as separate tasks. |
| H | Exercise video gating | SRS requires one-third preview and full-access gating; current repo has `exercises.video_url` but no video UI and uses client guards. | Full exercise video access must be enforced server-side or through signed/controlled delivery. Client-only timers are insufficient. |
| I | Chatbot scope | Specs include chatbot/OpenRouter; current ownership says chatbot belongs to another member. | Do not touch chatbot implementation unless explicitly assigned. Preserve integration boundaries only. |
| J | Guest/product access | Final Spec gates product detail; SRS allows Guest to view product metadata/images. Current product detail is `RequireAuth`. | Guest may view product metadata/images. Cart/checkout/order require Patient login. |
| K | Subscription plan naming | Final Spec and seed use Free/Basic/Standard/Premium; SRS v6.18 says Free/Pro and Pro unlocks full video. | Do not add a Pro plan. SRS v6.18 Pro maps to current Standard and Premium for full exercise video access. Free and Basic do not receive full exercise video access. |
| L | Route namespace mismatch | Final Spec uses `/patient/...` and `/admin/dashboard`; current repo uses `/dashboard`, `/profile`, `/appointments`, `/cart`, `/recovery-plan`, `/progress`, and `/admin`. | Keep current routes unless a route migration is approved; missing pages can use current namespace or planned `/patient` namespace by explicit decision. |
| M | Product category model | Final Spec has `product_categories`; current repo stores category text on `products`. | Keep category text for now. Add category table only with a migration task. |
| N | Storage buckets | Final Spec names `patient-images`, `doctor-images`, `product-images`, `rehab-files`, `ai-files`; current repo creates one public `images` bucket. | Keep current bucket for existing images. Add private/controlled buckets only with a media/security task. |
| O | Doctor public profile review | SRS v6.18 requires Draft/Submitted/Rejected/Approved public profile review; current `doctors` table lacks review status fields. | Missing. Do not infer approval from account active status. |
| P | Staff role | SRS includes Authorized Internal Staff; current `account_type` only allows admin/doctor/patient. | Staff is missing/deferred unless explicitly prioritized. |
| Q | Wallet | Final Spec includes wallets and wallet transactions; SRS payment/refund lifecycle implies financial records; current repo has no wallet tables. | Wallet is deferred. Do not add unless payment/refund scope is approved. |
| R | Audit logs | Final Spec requires admin audit logs; current repo lacks audit log table/UI. | Audit logs are missing and should be part of security/admin polish. |
| S | Exercise difficulty values | Current schema restricts English `beginner/intermediate/advanced`, while seed contains Vietnamese text in some rows. Later migrations may alter taxonomy; verify effective DB after reset before adding constraints/data. | Before exercise work, inspect effective local DB and generated types. Do not assume schema snapshot alone is authoritative. |
| T | README stale table names | README still mentions `users` in several places; migrations now use `accounts`/`patients`/`doctors`. | Treat `docs/integrated-spec-v6-18.md` and implementation notes as newer than README for schema status. Update README separately if requested. |
| U | Security model for direct Supabase access | Specs require route protection and RLS; current app uses direct browser Supabase access, so client guards cannot be the only protection. | Any new sensitive feature must be backed by RLS, storage policies, RPC, or controlled server route. |
| V | Auth seed token fields | A prior migration inserted auth users with NULL token strings causing login failure. | Preserve `20260527110000_fix_pk_and_recursion.sql` token fields and `20260527110002_fix_auth_user_token_nulls.sql`. |

## 6. Final Conflict Resolutions To Apply Before Coding

Use this table before opening any feature branch or editing application code. If a task touches a row marked with an open decision or a later code change, confirm the implementation choice first.

| Conflict | Final decision | Impacted module | Code change needed later? | Priority |
| --- | --- | --- | --- | --- |
| Product video vs Exercise video | Products are commerce-only. Rehabilitation exercise videos belong only to Exercise Library. | Products, Exercise Library, Admin Products, Admin Exercises, Storage | Yes, for Exercise Library video only. No product-video code. | P0 guardrail |
| Guest product detail access | Product detail page should be public-read for active products. Add-to-cart, buy-now, checkout, cart, and orders require Patient login. | `/products/[id]`, product service, auth guards, RLS | Yes | P0 |
| Doctor as product browser but not buyer | Doctor may browse products but is not a buyer role in MVP. Admin manages products/orders but does not buy products. | Product pages, cart buttons, checkout guards, role checks | Yes | P1 |
| Doctor visibility vs available slots | Public Doctor visibility does not require available slots. Active, approved, not-deleted public doctors can appear; lack of slots routes Patient to flexible appointment request. | Doctors list/detail, appointment booking, doctor schedule, public profile review | Yes | P0 |
| Forgot/reset password code vs Supabase recovery link | Keep Supabase recovery link/token for MVP. Custom email-code reset is deferred. | Forgot/reset password pages, Supabase Auth config, email docs | No immediate change unless UX copy conflicts | P2 |
| `profiles` schema names vs `accounts`/`patients`/`doctors` | Keep current `accounts`, `patients`, and `doctors` schema names. Do not rename without approved migration plan. | Supabase schema, migrations, RLS, services, generated types | No immediate change | P0 guardrail |
| Free/Pro vs Free/Basic/Standard/Premium subscription mapping | Keep the existing Free, Basic, Standard, Premium model. Do not add Pro. SRS v6.18 Pro maps to Standard and Premium for full exercise video access; Free and Basic receive preview only. Premium includes all Standard features plus priority/specialist/advanced report features. | Subscriptions, pricing, video gating, feature gates | Yes | P0 |
| Mock payment vs real payment | Mock checkout is allowed, but it must be labeled as mock payment and not treated as real gateway-confirmed revenue. | Cart, checkout, orders, admin revenue/reporting | Yes | P0 |
| Shipping MVP missing | MVP uses manual admin shipment tracking. Real shipping provider API is deferred. | Orders, admin orders, patient order detail, schema/RLS | Yes | P1 |
| Admin summary vs full admin suite | Current `/admin` summary is not enough. Build admin pages as scoped tasks. | Admin layout/routes, products, orders, doctors, exercises, reports | Yes | P1 |
| Route mismatch `/patient/...` vs current short routes | Keep current route namespace unless a route migration task is approved. | Patient routes, navigation, middleware, docs | No immediate change; ask before new patient pages | P1 open |
| Exercise video server-side gating | Full video access must be enforced server-side or through signed/controlled delivery. Client-only timers are insufficient. | Exercise detail, storage, subscription access, RLS/RPC/server routes | Yes | P0 |
| Chatbot owned by another member | Do not modify chatbot implementation unless explicitly assigned. Only document boundaries and integration notes. | Chatbot widget/service/messages, OpenRouter, prompt storage | No for current scope | P0 guardrail |
| Storage bucket mismatch | Keep current public `images` bucket for existing assets. Add private/controlled buckets only under a media/security task. | Supabase Storage, image helpers, uploads, exercise videos | Yes for uploads/video | P1 |
| Product category text vs `product_categories` table | Keep product category text for now. Move to `product_categories` only with approved schema migration. | Products schema, filters, admin products, seed data | No immediate change | P2 open |
| Audit logs missing | Audit logs are required for sensitive admin actions but missing. Add during security/admin polish or before high-risk admin writes. | Admin actions, schema/RLS, reporting | Yes | P2 |
| Wallet/refund deferred | Wallet and refund ledger are deferred until payment/refund scope is approved. Do not add ad hoc wallet behavior. | Wallet, payments, refunds, orders, reports | No immediate change | P2 deferred |
| Staff role deferred | Authorized Internal Staff is deferred. Current account roles remain admin/doctor/patient. | RBAC, accounts, middleware, admin users | No immediate change | P2 deferred |

## 7. Approved MVP Decisions

- Products are commerce-only.
- Rehabilitation exercise videos belong only to Exercise Library.
- Product detail page should be public-read for active products.
- Add-to-cart, buy-now, checkout, and orders require Patient login.
- Doctor may browse products but is not a buyer role in MVP.
- Admin manages products and orders, but does not buy products.
- Keep Supabase recovery link/token for forgot/reset password.
- Keep `accounts`/`patients`/`doctors` schema names for now.
- Keep current route namespace unless a route migration task is approved.
- Mock checkout is allowed but must be labeled as mock payment and not treated as real gateway-confirmed revenue.
- Chatbot implementation is out of scope and owned by another member.
- Exercise video full access must be server-side or controlled-delivery gated.
- Use the existing subscription model: Free, Basic, Standard, Premium. Do not introduce a new Pro plan.
- Free is the default plan for newly registered Patients.
- Basic is the entry paid plan.
- Standard is the main full-rehabilitation plan and maps to SRS v6.18 Pro for exercise video access.
- Premium is the advanced plan, includes all Standard features, adds priority/specialist/advanced report features, and also has full exercise video access.
- Free and Basic do not receive full exercise video access; they receive only the approved preview behavior.
- Real recurring payment and payment webhooks remain deferred.
- Current subscription purchase is mock unless a real payment gateway is implemented.

## 8. Open Decisions Before Implementation

Do not code a feature affected by these questions until the decision is made.

- Should new patient pages use current short routes or `/patient/...` routes?
- Should shipping use a new `shipments` table now or extend `orders` first?
- Should product categories remain text or move to a `product_categories` table?
- Should admin pages be built one by one or as a full admin layout first?

## 9. Implementation Backlog From Resolved Conflicts

Safe UI tasks:

- Keep homepage Product/Marketplace CTA linked to `/products`.
- Make product detail public-read for active products while keeping purchase actions auth-gated.
- Add clear guest/doctor/admin messaging when a role can browse but cannot buy.
- Add missing `/faq` only if scoped as static/public content.

Commerce tasks:

- Add cart quantity update/remove UI.
- Add stock-aware add-to-cart and checkout validation.
- Refactor checkout into transaction-safe order creation through RPC or another controlled server-side path.
- Change mock checkout labels/status handling so mock payment is not represented as real gateway-confirmed revenue.
- Add patient order list/detail pages after route namespace decision.

Admin tasks:

- Build admin product management for commerce-only products.
- Build admin order management with status transitions.
- Add Doctor public profile review after schema/RLS plan.
- Expand admin modules one by one unless full admin layout is approved first.

Shipping tasks:

- Decide `shipments` table vs extending `orders`.
- Add manual shipment status, carrier, tracking number, shipped/delivered timestamps, and admin update UI.
- Add patient order shipping status view.
- Keep real shipping provider API deferred.

Exercise video tasks:

- Apply the approved full-video mapping: Standard and Premium get full access; Free and Basic get preview only.
- Add Exercise Library video rendering for approved URLs.
- Add upload/replacement rules for one primary exercise video.
- Add controlled delivery or signed access for Doctor full video and Patient one-third/full access.
- Keep all video work out of Product management.

Security/RLS tasks:

- Back every sensitive route with RLS, storage policies, RPC, or controlled server route.
- Add audit logs before high-risk admin write flows.
- Preserve the Supabase Auth seed token fix.
- Regenerate/verify Supabase TypeScript types after schema changes.

Deferred tasks:

- Chatbot/OpenRouter implementation unless explicitly assigned.
- Real payment gateway, webhooks, refunds, and confirmed revenue reporting.
- Shipping provider API, delivery webhooks, returns, and automation.
- Custom email-code reset password.
- Full schema rename to Final Spec profile table names.
- Wallet/refund ledger.
- Staff role/RBAC expansion.

## 10. Doctor Flow Final Decision

Integrated Doctor flow:

1. Admin creates Doctor account.
2. Doctor receives password setup/invitation, or uses seeded local test account.
3. Doctor logs in.
4. Doctor completes first-login password change when required.
5. Doctor accesses private Doctor workspace.
6. Doctor completes profile, avatar, bio, and schedule.
7. Doctor submits public profile for Admin review.
8. Admin approves or rejects the public profile with a reason.
9. Only active, approved, not-deleted Doctor profiles appear publicly.
10. Doctor manages schedules.
11. Doctor views assigned appointments and requests.
12. Doctor accepts or rejects appointment requests with reason.
13. Doctor writes notes and completes appointments.
14. Doctor can view full Exercise Library videos under SRS v6.18.

Final Doctor decisions:

- Doctor self-registration is not allowed.
- Doctor account is Admin-created.
- Doctor workspace access and public visibility are separate.
- `ACTIVE` Doctor account status does not automatically mean public visible.
- Public visibility requires `ACTIVE` account status, approved public profile, and not deleted.
- Available schedule slots do not control public visibility.
- No slots means Patient may submit a flexible appointment request.
- Doctor cannot approve their own public profile.
- Admin must approve or reject Doctor public profile with reason.
- Doctor may browse products but is not a buyer role in MVP.
- Doctor full exercise video access belongs to Exercise Library, not Product.

## 11. Doctor Flow Current Repo Status

| Area | Current repo status | Existing surface | Notes |
| --- | --- | --- | --- |
| Doctor route shell | Implemented | `/doctor`, `/doctor/layout.tsx`, `DoctorLayout` | `/doctor` redirects to `/doctor/dashboard`; layout checks auth, role, account status, and linked doctor row. |
| Doctor dashboard | Partial | `/doctor/dashboard`, `doctor-dashboard.service.ts` | Shows pending/today/upcoming appointments, schedule preview, notes/patients summary. |
| First-login password change | Partial | `/doctor/change-password`, `must_change_password` | Local seeded `doctor@test.com` has `must_change_password = true`; no invitation-token flow. |
| Doctor profile editing | Partial | `/doctor/profile`, `DoctorProfileForm`, `updateDoctor` | Allows immediate edit of name, specialty, bio, experience, fee, avatar URL/upload path. No restricted-field review. |
| Doctor avatar upload | Broken/partial | `uploadDoctorAvatar` uses storage bucket `avatars` | Current migrations create only `images` bucket. Upload may fail unless `avatars` exists outside repo. |
| Doctor schedules | Partial | `/doctor/schedules`, `doctor_schedule_slots`, `doctor-schedules.service.ts` | Doctor can create one-hour slots and mark available/blocked/cancelled. Conflict handling with active appointments is missing. |
| Doctor appointments | Partial | `/doctor/appointments`, `/doctor/appointments/[appointmentId]`, `appointments.service.ts` | List/detail, accept/reject/cancel/reschedule-note/complete actions exist. State machine is simpler than SRS. |
| Doctor notes | Partial | `/doctor/notes`, `doctor_notes`, `doctor-notes.service.ts` | Notes can be created during completion and listed. No formal `appointment_notes` table name from Final Spec. |
| Doctor patients | Partial | `/doctor/patients`, `buildDoctorPatientSummaries` | Derived from assigned appointments. No patient detail page or consent model. |
| Doctor notifications | Partial | `/doctor/notifications`, `notifications` | Reads/marks notifications for current account. Creation triggers are limited. |
| Public profile review | Missing | No route/table fields | No `public_profile_status`, `submitted_at`, `approved_at`, `rejected_reason`, reviewer id, or review table. |
| Public Doctor visibility | Broken vs SRS | `getDoctors`, RLS `"Doctors are publicly readable" using (true)` | All doctors are public-readable; no active/approved/not-deleted filter. |
| Flexible appointment requests | Missing/partial | `appointments` supports `pending` only | No `REQUESTED` status, preferred time range, or separate request table. |
| Doctor full exercise video access | Missing | Exercise detail is subscription-gated for patients | No role-aware Doctor full-video access or controlled delivery. |
| Doctor product browsing | Partial | `/products` public | No explicit Doctor buyer restriction on purchase actions yet. |

Doctor-related schema currently present:

- `accounts.id`, `email`, `account_type`, `must_change_password`, `account_status`.
- `doctors.id`, `full_name`, `specialty`, `avatar_url`, `bio`, `experience_years`, `rating`, `consultation_fee`, `available_online`, `created_at`.
- `doctor_schedule_slots.doctor_id`, `slot_date`, `start_time`, `end_time`, `status`.
- `appointments.doctor_id`, `patient_id`, `appointment_date`, `appointment_time`, `status`, `payment_status`, `meeting_url`, reason/note fields.
- `doctor_notes.doctor_id`, `patient_id`, `appointment_id`, `note`.
- `notifications.account_id`, `title`, `content`, `type`, `is_read`.

Doctor-related schema missing or insufficient:

- Public review fields: `public_profile_status`, `public_profile_submitted_at`, `public_profile_reviewed_at`, `public_profile_reviewed_by`, `public_profile_rejection_reason`.
- Soft delete/public visibility fields: `deleted_at`, `is_public`, or equivalent.
- Restricted profile review support for specialty/credentials changes.
- Credential/qualification fields and documents if required by SRS.
- Invitation-token or `PENDING_PASSWORD_SETUP` status support beyond `must_change_password`.
- Flexible appointment request fields such as `preferred_start_at`, `preferred_end_at`, `request_reason`, `request_status`, or a separate `appointment_requests` table.
- Exercise video access policy fields or controlled-delivery tables.

Doctor RLS/security status:

- Doctor own-row policies exist after latest migrations, but `schema.sql` still contains earlier account-id patterns and must not be trusted alone.
- Doctor schedule, appointment, note, and related-patient RLS are scoped to `auth.uid()` matching the Doctor id after `20260527110000_fix_pk_and_recursion.sql`.
- Public `doctors` policy currently reads `using (true)`; this conflicts with SRS public visibility rules.
- Admin policies use `accounts.account_type = 'admin'` in later migrations, but older migrations/README still mention `users.role`.
- Client-side Doctor layout checks are not enough; future public visibility, review, appointment, and exercise-video rules need RLS/RPC/server enforcement.

## 12. Doctor Flow Missing Features

- Admin-created Doctor account UI and invitation setup.
- Proper `PENDING_PASSWORD_SETUP`/`ACTIVE`/`SUSPENDED` or equivalent account lifecycle.
- Public profile submission route/action in Doctor workspace.
- Admin approve/reject Doctor public profile with reason.
- Public Doctor search/detail filtering by active + approved + not deleted.
- Flexible appointment request model when no slots exist.
- Appointment state machine for requested, pending payment, confirmed, rejected, cancelled, completed, expired, no-show if needed.
- Schedule conflict checks before blocking/cancelling slots with active appointments.
- Restricted-field review for specialty/credentials.
- Doctor credential document support.
- Doctor full Exercise Library video access with controlled delivery.
- Doctor product browse-only behavior for cart/checkout.
- Audit logs for Doctor profile approval and high-risk appointment/admin actions.

## 13. Doctor Flow Implementation Roadmap

1. Add Doctor public profile review schema after choosing fields vs separate review table.
2. Update RLS/public doctor reads to require active + approved + not deleted.
3. Add Doctor workspace submit-for-review action and status display.
4. Add Admin Doctor review UI with approve/reject reason and audit log decision.
5. Add flexible appointment request model and Doctor accept/reject handling.
6. Harden Doctor schedule updates against active appointment conflicts.
7. Add Doctor full Exercise Library video access after subscription/video gating design.
8. Add Doctor browse-only product guard for purchase actions.

## 14. Admin Flow Final Decision

Integrated Admin flow:

1. Admin dashboard.
2. User/account management.
3. Patient management.
4. Doctor account management.
5. Doctor public profile review approve/reject with reason.
6. Appointment management.
7. Product management.
8. Order management.
9. Shipping management.
10. Subscription management.
11. Exercise management.
12. Exercise video management.
13. Reports.
14. Audit logs/settings.

Final Admin decisions:

- Admin currently has only a summary page; full admin suite is missing.
- Admin does not buy products.
- Admin manages products, orders, and shipping.
- Admin manages Exercise Library videos, not Product videos.
- Admin must approve or reject Doctor public profile submissions with reason.
- Admin actions that change visibility, orders, shipments, subscriptions, or exercise/video access should be auditable.
- Admin write operations need RLS/RPC/server-side protection, not only `RequireAdmin`.

## 15. Admin Flow Current Repo Status

| Area | Current repo status | Existing surface | Notes |
| --- | --- | --- | --- |
| Admin route guard | Partial | `RequireAdmin`, `/admin` | Checks `profile.role === "admin"` from `accounts.account_type`. No server-side route handler; relies on RLS for data protection. |
| Admin dashboard | Partial | `/admin/page.tsx` | One summary page with read-only tables for doctors, appointments, products, subscriptions, exercises, recovery plans, exercise logs. |
| `/admin/*` subroutes | Missing | Only `/admin` file exists | No `/admin/dashboard`, `/admin/users`, `/admin/doctors`, `/admin/products`, `/admin/orders`, etc. |
| User/account management | Missing | `accounts` table exists | No UI/service for account create/update/status/role management. |
| Patient management | Missing | `patients` table exists | No admin patient list/detail/edit route. |
| Doctor account management | Partial/missing UI | `createDoctor`, `updateDoctor`, `deleteDoctor` service functions | No admin UI to create auth user + account + doctor row safely. |
| Doctor public profile review | Missing | No schema fields/table | No submit/review status, reason, reviewer, or audit. |
| Appointment management | Partial read-only | `/admin` reads `getAppointments(undefined, "admin")` | No admin appointment detail/status transitions. |
| Product management | Partial service only | `products.service.ts` CRUD functions | No admin product CRUD UI; Products remain commerce-only. |
| Order management | Missing | `orders` and `order_items`; read functions require user id | No admin order list/detail/status/shipping management. |
| Shipping management | Missing | `orders.shipping_address` only | No carrier/tracking/status/timestamps. |
| Subscription management | Partial read-only | `subscriptions.service.ts`, `/admin` table | No admin overrides/cancel/renewal/revenue UI. |
| Exercise management | Partial service only | `exercises.service.ts` CRUD functions | No admin exercise CRUD UI. |
| Exercise video management | Missing | `exercises.video_url` exists | No upload/URL validation, no controlled delivery, no admin video UI. |
| Reports | Partial/missing | `/admin` summary tables | No revenue/payment/shipping/subscription/reporting model. |
| Audit logs/settings | Missing | No tables/routes | Required before high-risk admin approvals or status changes. |

Admin-related schema currently present:

- `accounts.account_type` and `account_status`.
- Domain tables for doctors, patients, appointments, products, orders, subscriptions, exercises, recovery plans, exercise logs.
- No dedicated admin settings, reports, audit log, profile review, services, reviews, payouts, or shipment tables.

Admin RLS/security status:

- Later migrations define admin policies for doctors/products/subscriptions/exercises and admin read access for appointments/recovery data using `accounts.account_type = 'admin'`.
- Current `/admin` calls broad reads from the browser. Any future write must verify that effective RLS matches the intended admin scope.
- Admin order management policies appear incomplete; `orders` currently has user-owned policies and no clear admin read/write policy in the latest effective docs.
- Admin product/exercise service functions exist, but using them from UI before verifying RLS and validation could expose broad client-side writes.
- No audit log exists for admin actions.

## 16. Admin Flow Missing Features

- Full admin layout/sidebar and `/admin/*` route structure.
- User/account management, including Doctor account creation and account status changes.
- Patient management list/detail/edit.
- Doctor public profile review approve/reject with reason.
- Admin appointment list/detail/status handling.
- Admin product CRUD UI for commerce-only products.
- Admin order management and manual shipping management.
- Admin subscription management and manual overrides.
- Admin Exercise Library CRUD and exercise video management.
- Reports for appointments, orders, revenue, subscriptions, shipments.
- Admin settings.
- Audit logs for sensitive actions.
- RLS/RPC/server validation for admin writes.

## 17. Admin Flow Implementation Roadmap

1. Decide whether to build a full admin layout/sidebar first or build `/admin/*` pages one by one.
2. Add audit log schema if Doctor approval/order/shipping/admin status writes are in scope.
3. Add Doctor public profile review schema and Admin review UI.
4. Add Admin doctors/account management with safe auth/account creation flow.
5. Add Admin appointments list/detail and allowed status transitions.
6. Add Admin products CRUD for commerce-only products.
7. Add Admin orders and shipping MVP.
8. Add Admin subscriptions and reporting.
9. Add Admin exercises and exercise video management under Exercise Library only.
10. Harden all admin writes with RLS/RPC/server validation and regenerate types after schema changes.

## 18. Admin/Doctor Open Decisions Before Coding

- Should Admin routes be built one by one under `/admin/*` or first create a full admin layout/sidebar?
- Should Doctor public profile review require new fields on `doctors` table or a separate review table?
- Should account status use current fields (`active`, `inactive`, `locked`, `must_change_password`) or require migration for `PENDING_PASSWORD_SETUP`, `ACTIVE`, `SUSPENDED`, and related statuses?
- Should flexible appointment requests reuse `appointments` table or create a separate `appointment_requests` table?
- Should admin audit logs be introduced before admin approve/reject actions?
- Should Doctor restricted-field changes reopen public profile review automatically?
- Should Doctor avatar upload use the existing `images` bucket or add a dedicated `doctor-images` bucket?
- Should Admin order access be implemented through direct RLS policies, RPC, or server route handlers?

## 19. Patient Flow Final Decision

The integrated MVP Patient flow is:

Guest registers a Patient account, verifies email through Supabase Auth, logs in, reaches the Patient dashboard, manages profile, views public doctors, books a direct slot or submits a flexible appointment request, views appointment history/detail/cancel state, browses active products, adds products to cart, checks out with clearly labeled mock payment, views order history/detail, views manual shipping status when available, manages subscription, accesses the Exercise Library, sees one-third exercise video preview without an eligible full-access plan, sees full exercise video with the approved full-access plan, tracks recovery plan/progress, and receives notifications.

Final Patient decisions:

- Patient is the only buyer role in MVP.
- Guest may browse active product metadata and images.
- Product detail should be public-read for active products.
- Add-to-cart, buy-now, checkout, order history, and shipping status require Patient login.
- Doctor and Admin are not buyer roles in MVP.
- Current short routes may remain unless a route migration is explicitly approved.
- Supabase recovery link/token remains the MVP forgot/reset password flow.
- Wallet/refund lifecycle is deferred unless approved.
- Real payment gateway is deferred; mock checkout is allowed but must be labeled mock.
- Exercise video full access must be server-side or controlled-delivery gated.
- SRS v6.18 Pro maps to Standard and Premium in the current repo. Free and Basic do not receive full exercise video access.
- Standard is the main full-rehabilitation plan. Premium includes all Standard features plus priority/specialist/advanced report features.
- Chatbot implementation is out of scope and owned by another member.

## 20. Patient Flow Current Repo Status

| Patient area | Current repo status | Existing routes/files/tables | Notes |
| --- | --- | --- | --- |
| Patient registration/login | Partial | `/register`, `/login`, `/forgot-password`, `/reset-password`, Supabase Auth, `accounts`, `patients` | Supabase recovery link/token is implemented directionally. Username-login, full account-status enforcement, automatic Free subscription, and wallet creation are incomplete. |
| Patient dashboard | Partial | `/dashboard`, `frontend/app/dashboard/page.tsx` | Requires auth and summarizes appointments/recovery plans. It is not a complete Patient command center. |
| Patient profile | Partial | `/profile`, `users.service.ts`, `accounts`, `patients` | Basic account/profile read and update exist. Full Final Spec profile fields and account lifecycle are incomplete. |
| Doctor browsing | Partial | `/doctors`, `/doctors/[id]`, `doctors` | Doctor list exists, but public visibility is not yet tied to active + approved + not deleted review fields. Detail page is auth-wrapped, which conflicts with public-read doctor profile intent. |
| Appointment booking/history | Partial | `/appointments`, `/doctors/[id]`, `appointments.service.ts`, `appointments` | Patient can create/read basic appointments. Patient appointment detail, cancel/status detail, flexible request, slot semantics, and full state machine are missing. |
| Product browsing | Partial | `/products`, `products.service.ts`, `products` | Active products can be listed. Search/sort/pagination/category management are incomplete. |
| Product detail | Broken against MVP decision | `/products/[id]` | Current detail route uses `RequireAuth`, but active product detail should be public-read for Guests. Purchase actions should remain Patient-protected. |
| Cart | Partial | `/cart`, `ProductCard`, `cart.service.ts`, `useCart`, `cart_items` | Add-to-cart exists. Quantity/remove service functions exist, but user-facing controls and robust stock validation are incomplete. |
| Checkout/order creation | Partial/broken | `/cart`, `orders.service.ts`, `orders`, `order_items` | Mock checkout creates orders from cart, but it is not transaction-safe, does not decrement stock, and inserts `status: "paid"`, which must not imply real gateway-confirmed revenue. |
| Patient order history/detail | Missing | `orders.service.ts` has `getOrders` and `getOrderById`; `orders`, `order_items` | No `/orders`, `/orders/[id]`, `/patient/orders`, or equivalent UI exists. |
| Shipping status | Missing/partial | `orders.shipping_address` | No shipment status, carrier, tracking number, shipped/delivered timestamps, admin shipping UI, or Patient tracking UI. |
| Subscription management | Partial | `/pricing`, `subscriptions.service.ts`, `subscriptions`, `user_subscriptions`, `RequireSubscription` | Plan listing and subscription access helpers exist. Approved video mapping is Standard/Premium full access, Free/Basic preview only. Real recurring payment/webhook remains deferred. |
| Exercise Library | Partial | `/exercises`, `/exercises/[id]`, `exercises.service.ts`, `exercises` | Exercise list/detail exist. Detail is Basic subscription-gated and does not implement one-third preview or full video access rules. |
| Exercise video access | Missing/partial | `exercises.video_url`, `ExerciseDetail`, `RequireSubscription` | No controlled delivery, no server-side one-third preview/full-access enforcement, and no Doctor full-access exception. |
| Recovery plan | Partial | `/recovery-plan`, `/recovery-plan/create`, `/recovery-plan/[id]`, `recovery_plans`, `recovery_plan_exercises` | Standard subscription gate exists. Plan generation/detail exist but need stronger business validation and ownership checks for production. |
| Progress tracking | Partial | `/progress`, `progress.service.ts`, `exercise_logs` | Premium subscription gate exists. Full progress analytics and patient recovery reporting are incomplete. |
| Patient notifications | Missing UI | `notifications.service.ts`, `notifications` | Notification service/table exist, but there is no patient `/notifications` page. |
| Wallet/refund | Deferred/missing | None found | Wallet and refund lifecycle remain deferred unless explicitly approved. |
| Chatbot boundary | Owned by another member | `ChatbotWidget`, `chatbot.service.ts`, `chatbot_messages` | Do not modify implementation. Document only integration boundaries. |

## 21. Patient Flow Missing Features

- Public active product detail page that keeps product metadata/images visible to Guests while protecting buyer actions.
- Patient-only buyer enforcement across add-to-cart, buy-now, checkout, orders, and shipping status.
- Patient order history and order detail pages.
- Checkout route or clear cart-based checkout UX decision.
- Mock payment labeling and order status semantics that do not claim gateway-confirmed payment.
- Transaction-safe checkout/order creation with stock validation and stock decrement rules.
- Manual shipping MVP fields and Patient shipping status UI.
- Patient appointment detail page, cancellation flow, and flexible appointment request flow.
- Route namespace decision for current short Patient routes versus `/patient/...`.
- Subscription management page beyond pricing and helpers.
- Implementation of the approved Standard/Premium full-video access and Free/Basic preview behavior.
- Server-side or controlled-delivery exercise video preview/full-access enforcement.
- Patient notifications page.
- Recovery plan/progress hardening, including ownership/security verification and richer reporting.
- Wallet/refund flow, if later approved.

Required future schema or policy support, depending on approved implementation tasks:

- Product public-read RLS should allow active product metadata/images for Guests while write/cart/order actions remain protected.
- Cart and order RLS should remain user-owned and should prevent Doctor/Admin buyer behavior in MVP.
- Checkout should use an RPC, route handler, or equivalent controlled path if order creation, stock updates, and cart clearing must be atomic.
- Shipping MVP needs either order-level shipment fields or a `shipments` table.
- Flexible appointment requests need either new appointment request fields/statuses on `appointments` or a separate `appointment_requests` table.
- Exercise video access needs signed/controlled media delivery or a server-side access model; client-only timers are not acceptable.
- Notifications RLS should allow Patients to read/update only their own notifications.

## 22. Patient Flow Broken/Partial Flows

- Product detail is auth-gated through `RequireAuth`, conflicting with the approved public-read product detail decision.
- Doctor detail is auth-gated even though public Doctor profile visibility should be independent from booking/login.
- Cart services support update/remove, but the current cart UI does not expose a complete quantity/remove workflow.
- `createOrderFromCart()` inserts orders with `status: "paid"` during mock checkout, which conflicts with the decision that mock checkout must not be treated as real gateway-confirmed revenue.
- Checkout is performed inside `/cart`; there is no standalone `/checkout` route.
- Order read functions exist but no Patient order list/detail pages use them.
- `orders.shipping_address` exists, but shipping status/tracking is not modeled.
- `/appointments` is a basic list only; there is no Patient detail/cancel/flexible-request workflow.
- `/exercises/[id]` is Basic subscription-gated as a whole page; it does not provide one-third preview for non-eligible Patients or controlled full access for eligible Patients.
- `/progress` and recovery-plan routes use client-side subscription guards; sensitive access rules still need RLS/server validation when the feature is hardened.
- `notifications` table/service exist, but only Doctor notifications UI is present.
- No `/orders`, `/checkout`, `/notifications`, `/wallet`, or `/patient/*` route folder exists.

## 23. Patient Flow Implementation Roadmap

1. Align product detail with the approved access model: active product metadata/images public, buyer actions Patient-protected.
2. Stabilize cart UX with quantity update/remove controls and stock-aware validation.
3. Fix mock checkout semantics: label as mock, avoid gateway-confirmed `paid` meaning, and choose `/checkout` versus cart-based checkout.
4. Make order creation transaction-safe through an approved controlled path, including stock decrement and cart clearing.
5. Add Patient order history and order detail pages using the existing order read functions.
6. Add manual shipping MVP after deciding whether to extend `orders` or create `shipments`.
7. Expand Patient appointments with detail, cancel/status view, and flexible appointment request after the data model decision.
8. Add or confirm subscription management UX and apply the approved Standard/Premium full-video access mapping.
9. Implement Exercise Library video preview/full access under controlled delivery, not under Product.
10. Add Patient notifications after appointment/order notification events are defined.
11. Harden RLS/server checks for Patient-owned records, buyer-only actions, subscription-gated data, and video delivery.

## 24. Patient Flow Open Decisions Before Coding

- Should new Patient pages use current short routes or `/patient/...`?
- Should order history be `/orders` or `/patient/orders`?
- Should checkout be a separate `/checkout` route or remain in `/cart`?
- Should shipping MVP use a `shipments` table or extend `orders` first?
- Should the notifications page be implemented now or after appointment/order flows define notification events?
- Should wallet/refund remain deferred or be included with cancellation/refund tasks?
- Should public Doctor detail also be made Guest-readable in the same access pass as product detail, or handled as a separate Doctor-profile task?

## 25. Current Repo Status Per Feature

| Feature | Current status | Existing surface | Main gap |
| --- | --- | --- | --- |
| Public website | Partial | `/`, `/doctors`, `/products`, `/exercises`, `/pricing` | `/faq` missing; some detail pages auth-gated against SRS public metadata decision. |
| Auth | Partial | `/login`, `/register`, `/forgot-password`, `/reset-password`, Supabase Auth helpers | Username-login mapping, account-status enforcement, email-code reset, automatic Free subscription, wallet creation incomplete. |
| Products | Partial | `/products`, `/products/[id]`, `products.service.ts`, `products` table | Product detail auth conflict; search/sort/pagination/admin CRUD incomplete. |
| Cart | Partial | `/cart`, `useCart`, `cart.service.ts`, `cart_items` | Quantity/remove UI and stock validation incomplete. |
| Checkout/order | Partial/broken | `/cart`, `orders.service.ts`, `orders`, `order_items` | Mock paid status, no transaction/RPC, no stock decrement, no payment model. |
| Patient order history | Missing | `orders.service.ts` read functions | No patient order list/detail pages. |
| Admin product/order management | Partial/missing | `/admin`, admin tables, product service functions | No `/admin/products`, `/admin/orders`, CRUD forms, status/shipping management. |
| Shipping | Missing/partial | `orders.shipping_address` | No carrier/tracking/shipment status/timestamps/admin UI/patient UI. |
| Doctor workspace | Partial | `/doctor/*`, doctor services/components | Public profile review, invite onboarding, full exercise video access missing. |
| Appointment booking/request | Partial | `/doctors/[id]`, `/appointments`, doctor appointment pages, `appointments` table | Flexible request model, slot booking semantics, patient detail/cancel, admin/staff management incomplete. |
| Exercise Library | Partial | `/exercises`, `/exercises/[id]`, `exercises.service.ts`, `exercises` table | Video UI/access/upload/admin management incomplete. |
| Exercise video | Missing/partial schema | `exercises.video_url` exists | No rendering, upload, validation, one-third preview, doctor full access, or controlled delivery. |
| Subscription gating | Partial | `/pricing`, `RequireSubscription`, `subscriptions`, `user_subscriptions` | Plan mapping is resolved: Standard/Premium full exercise video access; Free/Basic preview only. Client-only gates remain insufficient for media access. |
| Reports/audit logs | Missing/partial | `/admin` summary | No audit log table/UI, real reports, revenue/payment data. |
| Chatbot boundary | Owned by another member | `ChatbotWidget`, `chatbot.service.ts`, `chatbot_messages` | Do not modify. Only document integration needs and protect secrets. |

## 26. Implementation Roadmap

Phase 1: Navigation and obvious broken flows

- Keep homepage Product/Marketplace CTA linked to `/products`.
- Decide public product detail access and align with SRS v6.18.
- Fix obvious UI dead ends without changing schema or business logic.
- Keep chatbot untouched.

Phase 2: Commerce stabilization

- Add cart quantity update/remove controls.
- Add stock-aware cart and checkout validation.
- Replace multi-step client checkout with transaction-safe RPC or equivalent controlled order creation.
- Keep mock payment, but model status as pending/mock-confirmed instead of gateway-confirmed paid.

Phase 3: Patient order history and admin order management

- Add patient order list/detail pages.
- Add admin order list/detail pages.
- Add order status transition rules.
- Add cancellation/refund placeholders without real gateway behavior.

Phase 4: Shipping MVP

- Add manual shipment fields and policies.
- Admin records carrier/tracking/status/timestamps.
- Patient views shipping status for own orders.
- Do not add shipping provider API in MVP.

Phase 5: Exercise video library and access gating

- Keep videos in Exercise Library only.
- Use the approved Standard/Premium full-video access mapping against the current Free/Basic/Standard/Premium seed.
- Add safe exercise `video_url` rendering.
- Add upload/replacement policy if required.
- Enforce Doctor full access and Patient one-third preview/full access through controlled delivery, not a client-only timer.

Phase 6: Admin expansion

- Build separate admin subroutes for products, orders, doctors, appointments, subscriptions, exercises, reviews/FAQs/testimonials/settings as prioritized.
- Add Doctor public profile review flow.
- Add services and lookup management if still required.

Phase 7: Security/RLS/audit polish

- Add audit logs for sensitive admin actions.
- Harden RLS/storage policies for every new table/bucket.
- Regenerate/verify TypeScript DB types after schema changes.
- Add smoke tests for auth, route guards, RLS, checkout, and media access.

## 27. Do Not Implement Yet

- Chatbot implementation or OpenRouter integration unless explicitly assigned to this agent.
- Real payment gateway, payment webhooks, refunds, or real paid status confirmation.
- Shipping provider API, delivery webhooks, returns, or automated refund integration.
- Custom email-code reset password flow.
- Full schema rename from `accounts`/`patients`/`doctors` to `profiles`/`patient_profiles`/`doctor_profiles`.
- Product videos or product video upload fields.
- Staff role/RBAC expansion unless scoped as a separate task.
- Wallet and payout systems unless payment/refund scope is approved.
