alter table public.orders
add column if not exists payment_status text not null default 'unpaid',
add column if not exists payment_method text,
add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_status_check'
  ) then
    alter table public.orders
    add constraint orders_payment_status_check
    check (payment_status in ('unpaid', 'paid', 'refunded'));
  end if;
end
$$;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid unique not null references public.patients(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  currency text not null default 'VND',
  status text not null default 'active' check (status in ('active', 'locked', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled', 'expired')),
  topup_code text unique not null,
  payment_instruction text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  type text not null check (type in ('top_up', 'product_payment', 'appointment_payment', 'subscription_payment', 'refund', 'admin_adjustment')),
  amount numeric(12,2) not null check (amount > 0),
  balance_before numeric(12,2) not null check (balance_before >= 0),
  balance_after numeric(12,2) not null check (balance_after >= 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_topups_patient_created
on public.wallet_topups (patient_id, created_at desc);

create index if not exists idx_wallet_topups_status
on public.wallet_topups (status);

create index if not exists idx_wallet_transactions_patient_created
on public.wallet_transactions (patient_id, created_at desc);

create index if not exists idx_wallet_transactions_reference
on public.wallet_transactions (reference_type, reference_id);

create index if not exists idx_wallet_transactions_type_created
on public.wallet_transactions (type, created_at desc);

alter table public.wallets enable row level security;
alter table public.wallet_topups enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all privileges on table public.wallets from public, anon, authenticated;
revoke all privileges on table public.wallet_topups from public, anon, authenticated;
revoke all privileges on table public.wallet_transactions from public, anon, authenticated;

grant select on public.wallets, public.wallet_topups, public.wallet_transactions to authenticated;

drop policy if exists "Patients can read own wallets" on public.wallets;
create policy "Patients can read own wallets"
on public.wallets
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallets" on public.wallets;
create policy "Admins can read wallets"
on public.wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet topups" on public.wallet_topups;
create policy "Patients can read own wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet topups" on public.wallet_topups;
create policy "Admins can read wallet topups"
on public.wallet_topups
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Patients can read own wallet transactions" on public.wallet_transactions;
create policy "Patients can read own wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  patient_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Admins can read wallet transactions" on public.wallet_transactions;
create policy "Admins can read wallet transactions"
on public.wallet_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_type = 'admin'
      and accounts.account_status = 'active'
  )
);

create or replace function public.ensure_patient_wallet(target_patient_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
begin
  if target_patient_id is null then
    raise exception 'Patient id is required.';
  end if;

  insert into public.wallets (patient_id)
  values (target_patient_id)
  on conflict (patient_id) do update
    set updated_at = public.wallets.updated_at
  returning * into v_wallet;

  return v_wallet;
end;
$$;

create or replace function public.create_wallet_for_new_patient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_patient_wallet(new.id);
  return new;
end;
$$;

drop trigger if exists create_wallet_after_patient_insert on public.patients;
create trigger create_wallet_after_patient_insert
after insert on public.patients
for each row
execute function public.create_wallet_for_new_patient();

insert into public.wallets (patient_id)
select patients.id
from public.patients
on conflict (patient_id) do nothing;

create or replace function public.get_my_wallet()
returns table (
  id uuid,
  patient_id uuid,
  balance numeric,
  currency text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_wallet public.wallets%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can read wallet.';
  end if;

  v_wallet := public.ensure_patient_wallet(v_patient_id);

  return query
  select
    v_wallet.id,
    v_wallet.patient_id,
    v_wallet.balance,
    v_wallet.currency,
    v_wallet.status,
    v_wallet.created_at,
    v_wallet.updated_at;
end;
$$;

create or replace function public.create_wallet_topup(p_amount numeric)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_amount numeric(12,2);
  v_wallet public.wallets%rowtype;
  v_topup public.wallet_topups%rowtype;
  v_code text;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can create wallet top-up.';
  end if;

  v_amount := round(coalesce(p_amount, 0)::numeric, 2);
  if v_amount <= 0 then
    raise exception 'Top-up amount must be greater than 0.';
  end if;

  v_wallet := public.ensure_patient_wallet(v_patient_id);

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_code := 'TOPUP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.wallet_topups (
    wallet_id,
    patient_id,
    amount,
    status,
    topup_code,
    payment_instruction,
    updated_at
  )
  values (
    v_wallet.id,
    v_patient_id,
    v_amount,
    'pending',
    v_code,
    'Nạp ví mô phỏng RehabAI. Mã nạp: ' || v_code || '. Số tiền: ' || v_amount::text || ' VND.',
    now()
  )
  returning * into v_topup;

  return v_topup;
end;
$$;

create or replace function public.confirm_simulated_wallet_topup(target_topup_id uuid)
returns public.wallet_topups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_topup public.wallet_topups%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can confirm wallet top-up.';
  end if;

  select *
    into v_topup
  from public.wallet_topups
  where id = target_topup_id
    and patient_id = v_patient_id
  for update;

  if v_topup.id is null then
    raise exception 'Wallet top-up was not found.';
  end if;

  if v_topup.status = 'completed' then
    return v_topup;
  end if;

  if v_topup.status <> 'pending' then
    raise exception 'Only pending wallet top-ups can be confirmed.';
  end if;

  select *
    into v_wallet
  from public.wallets
  where id = v_topup.wallet_id
    and patient_id = v_patient_id
  for update;

  if v_wallet.id is null or v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_topup.amount;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  update public.wallet_topups
  set status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = v_topup.id
  returning * into v_topup;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_patient_id,
    'top_up',
    v_topup.amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'wallet_topup',
    v_topup.id,
    'Nạp ví mô phỏng. Top-up không được tính là doanh thu.'
  );

  return v_topup;
end;
$$;

create or replace function public.pay_order_with_wallet(p_shipping_address text)
returns table (
  order_id uuid,
  total_amount numeric,
  item_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cart_item_ids uuid[];
  v_cart_row_count integer;
  v_product_count integer;
  v_updated_product_count integer;
  v_total_amount numeric(12,2);
  v_total_quantity integer;
  v_order_id uuid;
  v_shipping_address text;
  v_product_name text;
  v_available_quantity integer;
  v_requested_quantity integer;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'Authentication is required to checkout.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_user_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can checkout.';
  end if;

  v_shipping_address := nullif(btrim(p_shipping_address), '');
  if v_shipping_address is null then
    raise exception 'Shipping address is required.';
  end if;

  select array_agg(id order by product_id), count(*)::integer
    into v_cart_item_ids, v_cart_row_count
  from public.cart_items
  where user_id = v_user_id;

  if coalesce(v_cart_row_count, 0) = 0 then
    raise exception 'Cart is empty.';
  end if;

  perform 1
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id
  order by product_id
  for update;

  perform 1
  from public.products
  where id in (
    select product_id
    from public.cart_items
    where id = any(v_cart_item_ids)
      and user_id = v_user_id
  )
  order by id
  for update;

  select *
    into v_wallet
  from public.wallets
  where patient_id = v_user_id
  for update;

  if v_wallet.id is null then
    v_wallet := public.ensure_patient_wallet(v_user_id);
    select *
      into v_wallet
    from public.wallets
    where patient_id = v_user_id
    for update;
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  select p.name
    into v_product_name
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and (
      p.is_active is not true
      or p.deleted_at is not null
    )
  order by p.id
  limit 1;

  if found then
    raise exception 'Product % is no longer available for sale.', v_product_name;
  end if;

  select p.name, p.stock_quantity, ci.quantity
    into v_product_name, v_available_quantity, v_requested_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.stock_quantity < ci.quantity
  order by p.id
  limit 1;

  if found then
    raise exception 'Insufficient stock for %. Available: %, requested: %.',
      v_product_name, v_available_quantity, v_requested_quantity;
  end if;

  select coalesce(sum(ci.quantity * p.price), 0)::numeric(12,2),
         coalesce(sum(ci.quantity), 0)::integer
    into v_total_amount, v_total_quantity
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  if v_total_amount <= 0 then
    raise exception 'Checkout total must be greater than 0.';
  end if;

  if v_wallet.balance < v_total_amount then
    raise exception 'Insufficient wallet balance. Missing amount: %.', v_total_amount - v_wallet.balance;
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - v_total_amount;

  insert into public.orders (
    user_id,
    total_amount,
    status,
    shipping_address,
    payment_status,
    payment_method,
    paid_at
  )
  values (
    v_user_id,
    v_total_amount,
    'pending',
    v_shipping_address,
    'paid',
    'internal_wallet',
    now()
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select v_order_id, ci.product_id, ci.quantity, p.price
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.is_active is true
    and p.deleted_at is null;

  update public.products p
  set stock_quantity = p.stock_quantity - ci.quantity,
      updated_at = now()
  from public.cart_items ci
  where ci.id = any(v_cart_item_ids)
    and ci.user_id = v_user_id
    and p.id = ci.product_id
    and p.is_active is true
    and p.deleted_at is null
    and p.stock_quantity >= ci.quantity;

  get diagnostics v_updated_product_count = row_count;

  select count(distinct product_id)::integer
    into v_product_count
  from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  if v_updated_product_count <> v_product_count then
    raise exception 'Checkout failed because product availability or stock changed. Please refresh your cart and try again.';
  end if;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_user_id,
    'product_payment',
    v_total_amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'order',
    v_order_id,
    'Thanh toán đơn hàng bằng ví RehabAI.'
  );

  delete from public.cart_items
  where id = any(v_cart_item_ids)
    and user_id = v_user_id;

  return query
  select v_order_id, v_total_amount, v_total_quantity;
end;
$$;

create or replace function public.pay_subscription_with_wallet(p_plan_type text)
returns public.user_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid := auth.uid();
  v_plan_key text := lower(btrim(coalesce(p_plan_type, '')));
  v_plan_name text;
  v_plan_tier integer;
  v_subscription_id uuid;
  v_amount numeric(12,2);
  v_active_plan_name text;
  v_active_tier integer;
  v_wallet public.wallets%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
  v_subscription public.user_subscriptions%rowtype;
begin
  if v_patient_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.accounts
    where accounts.id = v_patient_id
      and accounts.account_type = 'patient'
      and accounts.account_status = 'active'
  ) then
    raise exception 'Only active Patient accounts can pay for subscriptions.';
  end if;

  if v_plan_key = 'basic' then
    v_plan_name := 'Basic';
    v_plan_tier := 1;
  elsif v_plan_key = 'standard' then
    v_plan_name := 'Standard';
    v_plan_tier := 2;
  elsif v_plan_key = 'premium' then
    v_plan_name := 'Premium';
    v_plan_tier := 3;
  else
    raise exception 'Invalid subscription plan.';
  end if;

  select subscriptions.id, subscriptions.price
    into v_subscription_id, v_amount
  from public.subscriptions
  where subscriptions.name = v_plan_name;

  if v_subscription_id is null then
    raise exception 'Subscription plan is not configured.';
  end if;

  if v_amount <= 0 then
    raise exception 'Only paid plans can be purchased with wallet.';
  end if;

  select subscriptions.name,
    case lower(subscriptions.name)
      when 'basic' then 1
      when 'standard' then 2
      when 'premium' then 3
      else 0
    end
    into v_active_plan_name, v_active_tier
  from public.user_subscriptions
  join public.subscriptions on subscriptions.id = user_subscriptions.subscription_id
  where user_subscriptions.user_id = v_patient_id
    and user_subscriptions.status = 'active'
    and user_subscriptions.start_date <= current_date
    and user_subscriptions.end_date >= current_date
  order by user_subscriptions.created_at desc
  limit 1;

  if v_active_tier is not null and v_plan_tier <= v_active_tier then
    raise exception 'Downgrade or same-tier subscription payment is not supported while % is active.', v_active_plan_name;
  end if;

  select *
    into v_wallet
  from public.wallets
  where patient_id = v_patient_id
  for update;

  if v_wallet.id is null then
    v_wallet := public.ensure_patient_wallet(v_patient_id);
    select *
      into v_wallet
    from public.wallets
    where patient_id = v_patient_id
    for update;
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'Wallet is not active.';
  end if;

  if v_wallet.balance < v_amount then
    raise exception 'Insufficient wallet balance. Missing amount: %.', v_amount - v_wallet.balance;
  end if;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - v_amount;

  update public.user_subscriptions
  set status = 'cancelled',
      expires_at = coalesce(expires_at, now()),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'pending_payment';

  update public.user_subscriptions
  set status = 'cancelled',
      end_date = current_date,
      expires_at = now(),
      updated_at = now()
  where user_id = v_patient_id
    and status = 'active'
    and v_active_tier is not null
    and v_plan_tier > v_active_tier;

  insert into public.user_subscriptions (
    user_id,
    subscription_id,
    start_date,
    end_date,
    status,
    amount,
    payment_method,
    payment_reference,
    started_at,
    expires_at,
    updated_at
  )
  values (
    v_patient_id,
    v_subscription_id,
    current_date,
    current_date + 30,
    'active',
    v_amount,
    'internal_wallet',
    'WALLET-SUB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    now(),
    now() + interval '30 days',
    now()
  )
  returning * into v_subscription;

  update public.wallets
  set balance = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    wallet_id,
    patient_id,
    type,
    amount,
    balance_before,
    balance_after,
    status,
    reference_type,
    reference_id,
    description
  )
  values (
    v_wallet.id,
    v_patient_id,
    'subscription_payment',
    v_amount,
    v_balance_before,
    v_balance_after,
    'completed',
    'user_subscription',
    v_subscription.id,
    'Thanh toán gói ' || v_plan_name || ' bằng ví RehabAI.'
  );

  return v_subscription;
end;
$$;

revoke execute on function public.ensure_patient_wallet(uuid) from public;
revoke execute on function public.ensure_patient_wallet(uuid) from anon;
revoke execute on function public.ensure_patient_wallet(uuid) from authenticated;

revoke execute on function public.create_wallet_for_new_patient() from public;
revoke execute on function public.create_wallet_for_new_patient() from anon;
revoke execute on function public.create_wallet_for_new_patient() from authenticated;

revoke execute on function public.get_my_wallet() from public;
revoke execute on function public.get_my_wallet() from anon;
grant execute on function public.get_my_wallet() to authenticated;

revoke execute on function public.create_wallet_topup(numeric) from public;
revoke execute on function public.create_wallet_topup(numeric) from anon;
grant execute on function public.create_wallet_topup(numeric) to authenticated;

revoke execute on function public.confirm_simulated_wallet_topup(uuid) from public;
revoke execute on function public.confirm_simulated_wallet_topup(uuid) from anon;
grant execute on function public.confirm_simulated_wallet_topup(uuid) to authenticated;

revoke execute on function public.pay_order_with_wallet(text) from public;
revoke execute on function public.pay_order_with_wallet(text) from anon;
grant execute on function public.pay_order_with_wallet(text) to authenticated;

revoke execute on function public.pay_subscription_with_wallet(text) from public;
revoke execute on function public.pay_subscription_with_wallet(text) from anon;
grant execute on function public.pay_subscription_with_wallet(text) to authenticated;
