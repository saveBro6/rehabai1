# RehabAI

RehabAI is a rehabilitation support platform for patients recovering after stroke or injury. The app includes appointment booking, an exercise library, personalized recovery plans, progress tracking, a recovery product marketplace, subscription plans, a simple admin view, and a rule-based chatbot.

## Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Data: Supabase Postgres
- Auth: Supabase Auth
- Client SDK: `@supabase/supabase-js`
- Deploy target: Vercel

There is no Python API server in the current architecture. The Next.js app reads and writes Supabase directly with the browser anon key, and Supabase Row Level Security protects user-owned data.

## Project Structure

```text
frontend/   Next.js app, reusable UI components, hooks, services, Supabase client, types
supabase/   schema.sql, seed.sql, CLI config, and migrations
```

## Local Setup

### 1. Supabase Remote

1. Create a Supabase project.
2. Install the Supabase CLI and log in.
3. Link this repo to the Supabase project from the `rehabai` directory:

```bash
supabase link --project-ref your-project-ref
```

4. Push schema migrations and seed data:

```bash
supabase db push --include-seed
```

5. In the Supabase dashboard, copy:
   - Project URL
   - Anon public key

### 2. Supabase Local

For local development, start Supabase from the `supabase` directory:

```bash
cd supabase
supabase start
supabase status
```

Copy the local API URL, anon key, and service role key from `supabase status` into `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=your-local-service-role-key
```

`SUPABASE_SECRET_KEY` is only used by the local seed storage script. Do not expose it in browser code or deploy it as a public `NEXT_PUBLIC_` variable.

To reset the local database and upload seed images to Supabase Storage:

```bash
cd frontend
npm run db:reset
```

This command runs `supabase db reset`, creates the public `images` bucket from `supabase/seed.sql`, then uploads images from `supabase/seed_assets` using `frontend/seed-storage.js`. Seed images must be 5MB or smaller.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Set these variables in `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

When using Supabase Local, use the local values shown by `supabase status` instead.

The website runs at `http://localhost:3000`.

## Supabase Security

The app uses direct Supabase access from the browser, so RLS is required for all exposed public tables.

Public readable tables:

- `doctors`
- `products`
- `subscriptions`
- `exercises`

User-owned tables:

- `users`
- `appointments`
- `cart_items`
- `orders`
- `order_items`
- `user_subscriptions`
- `recovery_plans`
- `recovery_plan_exercises`
- `exercise_logs`
- `chatbot_messages`

Admin-write tables:

- `doctors`
- `products`
- `subscriptions`
- `exercises`

The migration `supabase/migrations/20260525000000_frontend_supabase_rls_policies.sql` grants the browser roles only the operations they need and adds ownership/admin policies.

## Main Frontend Routes

- `/`: landing page
- `/login`, `/register`, `/forgot-password`, `/reset-password`: Supabase Auth flows
- `/profile`: current user profile
- `/dashboard`: appointments, plan summary, subscription, and progress overview
- `/doctors`, `/doctors/[id]`: doctor list, filters, detail, appointment form
- `/appointments`: current user appointment list
- `/exercises`, `/exercises/[id]`: exercise library, filters, detail, completion logging
- `/recovery-plan`, `/recovery-plan/create`, `/recovery-plan/[id]`: personalized plan creation and schedule
- `/progress`: progress summary, charts, recent logs, post-session log form
- `/products`, `/products/[id]`, `/cart`: marketplace, cart, simulated checkout
- `/pricing`: Basic, Standard, Premium subscription selection
- `/admin`: management dashboard for admin users

## Data Access Layer

Frontend data access is organized under `frontend/services/`:

- `doctors.service.ts`
- `appointments.service.ts`
- `products.service.ts`
- `cart.service.ts`
- `orders.service.ts`
- `subscriptions.service.ts`
- `exercises.service.ts`
- `recovery-plans.service.ts`
- `recovery-plan-generator.ts`
- `progress.service.ts`
- `chatbot.service.ts`
- `users.service.ts`

The shared Supabase client lives in `frontend/lib/supabase/client.ts`.

## Chatbot Safety

The chatbot is a client-side rule-based assistant. It does not diagnose disease, prescribe medicine, or replace professional medical care. Severe symptom prompts such as sudden weakness, shortness of breath, chest pain, altered consciousness, fainting, or stroke signs return emergency-care guidance.

## Deploy To Vercel

1. Import the monorepo in Vercel.
2. Set the root directory to `frontend`.
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Build command:

```bash
npm run build
```

## Build

```bash
cd frontend
npm run build
```

## Functional Test Checklist

1. Guest can view `/doctors`, `/products`, `/exercises`, and `/pricing`.
2. Guest actions that require identity redirect to `/login?redirect=...`.
3. Register and login use Supabase Auth.
4. Login redirects to the safe `redirect` target when present.
5. Profile reads and updates the authenticated user's `users` row.
6. Doctor filters work and authenticated users can submit an appointment.
7. Appointments page shows only the current user's appointments.
8. Products page filters by category and authenticated users can add items to cart.
9. Cart creates an order from the authenticated user's cart and clears the cart.
10. Pricing creates a user subscription for the authenticated user.
11. Exercises page filters by category, difficulty, body region, and search.
12. Exercise detail can log completion for Premium users.
13. Recovery plan create page generates a rule-based schedule.
14. Progress page logs pain, fatigue, mobility score, and shows summary charts.
15. Admin page is only available to `users.role = 'admin'`.
16. Non-admin writes to admin tables are blocked by RLS.
17. Chatbot severe symptom prompts return emergency guidance.
