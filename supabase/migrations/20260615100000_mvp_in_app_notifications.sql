alter table public.notifications
add column if not exists related_entity_type text,
add column if not exists related_entity_id uuid,
add column if not exists action_url text;

create index if not exists idx_notifications_account_unread_created
on public.notifications (account_id, created_at desc)
where is_read = false;

revoke update on table public.notifications from authenticated;
grant update (is_read) on table public.notifications to authenticated;

drop policy if exists "Accounts can manage own notifications" on public.notifications;
drop policy if exists "Active accounts can read own notifications" on public.notifications;
create policy "Active accounts can read own notifications"
on public.notifications
for select
to authenticated
using (
  account_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_status = 'active'
  )
);

drop policy if exists "Active accounts can mark own notifications read" on public.notifications;
create policy "Active accounts can mark own notifications read"
on public.notifications
for update
to authenticated
using (
  account_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_status = 'active'
  )
)
with check (
  account_id = (select auth.uid())
  and exists (
    select 1
    from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.account_status = 'active'
  )
);

create or replace function public.create_role_notification(
  target_account_id uuid,
  expected_account_type text,
  notification_type text,
  notification_title text,
  notification_content text,
  entity_type text,
  entity_id uuid,
  destination_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_account_id is null then
    return;
  end if;

  insert into public.notifications (
    account_id,
    title,
    content,
    type,
    related_entity_type,
    related_entity_id,
    action_url
  )
  select
    accounts.id,
    notification_title,
    notification_content,
    notification_type,
    entity_type,
    entity_id,
    destination_url
  from public.accounts
  where accounts.id = target_account_id
    and accounts.account_type = expected_account_type
    and accounts.account_status = 'active';
end;
$$;

create or replace function public.notify_order_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_type text;
begin
  select accounts.account_type
    into v_actor_type
  from public.accounts
  where accounts.id = v_actor_id
    and accounts.account_status = 'active';

  if tg_op = 'INSERT' then
    if v_actor_type = 'patient'
      and new.user_id = v_actor_id
      and new.status = 'pending' then
      insert into public.notifications (
        account_id,
        title,
        content,
        type,
        related_entity_type,
        related_entity_id,
        action_url
      )
      select
        accounts.id,
        'Có đơn hàng mới cần xác nhận',
        'Một đơn hàng mới đang chờ Admin xác nhận.',
        'order_created',
        'order',
        new.id,
        '/admin/orders/' || new.id::text
      from public.accounts
      where accounts.account_type = 'admin'
        and accounts.account_status = 'active';
    end if;

    return new;
  end if;

  if v_actor_type <> 'admin' or new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status = 'confirmed' then
    perform public.create_role_notification(
      new.user_id,
      'patient',
      'order_confirmed',
      'Đơn hàng đã được xác nhận',
      'Admin đã tiếp nhận đơn hàng của bạn để xử lý.',
      'order',
      new.id,
      '/patient/orders/' || new.id::text
    );
  elsif new.status = 'cancelled' then
    perform public.create_role_notification(
      new.user_id,
      'patient',
      'order_cancelled',
      'Đơn hàng đã bị hủy',
      'Admin đã hủy đơn hàng. Lý do: ' || coalesce(nullif(btrim(new.cancellation_reason), ''), 'Không có lý do được cung cấp.'),
      'order',
      new.id,
      '/patient/orders/' || new.id::text
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_shipment_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_patient_id uuid;
  v_title text;
  v_content text;
begin
  if not public.is_active_admin_account(v_actor_id) then
    return new;
  end if;

  if new.shipping_status not in ('preparing', 'shipped')
    or (tg_op = 'UPDATE' and new.shipping_status is not distinct from old.shipping_status) then
    return new;
  end if;

  select orders.user_id
    into v_patient_id
  from public.orders
  where orders.id = new.order_id;

  if new.shipping_status = 'preparing' then
    v_title := 'Đơn hàng đang được chuẩn bị';
    v_content := 'Admin đang chuẩn bị đơn hàng để bàn giao cho đơn vị vận chuyển.';
  else
    v_title := 'Đơn hàng đang được giao';
    v_content := 'Đơn hàng đã được bàn giao cho đơn vị vận chuyển.';
  end if;

  perform public.create_role_notification(
    v_patient_id,
    'patient',
    'order_status_updated',
    v_title,
    v_content,
    'order',
    new.order_id,
    '/patient/orders/' || new.order_id::text
  );

  return new;
end;
$$;

create or replace function public.notify_appointment_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_type text;
begin
  select accounts.account_type
    into v_actor_type
  from public.accounts
  where accounts.id = v_actor_id
    and accounts.account_status = 'active';

  if tg_op = 'INSERT' then
    if v_actor_type = 'patient'
      and new.patient_id = v_actor_id
      and new.status = 'pending' then
      perform public.create_role_notification(
        new.doctor_id,
        'doctor',
        'appointment_created',
        'Có lịch hẹn mới',
        'Một Bệnh nhân đã gửi yêu cầu lịch hẹn mới.',
        'appointment',
        new.id,
        '/doctor/appointments/' || new.id::text
      );
    end if;

    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if v_actor_type = 'patient'
    and new.patient_id = v_actor_id
    and old.status = 'pending'
    and new.status = 'cancelled' then
    perform public.create_role_notification(
      new.doctor_id,
      'doctor',
      'appointment_cancelled_by_patient',
      'Bệnh nhân đã hủy lịch hẹn',
      'Bệnh nhân đã hủy lịch hẹn. Lý do: ' || coalesce(nullif(btrim(new.cancel_reason), ''), 'Không có lý do được cung cấp.'),
      'appointment',
      new.id,
      '/doctor/appointments/' || new.id::text
    );
  elsif v_actor_type = 'doctor'
    and new.doctor_id = v_actor_id
    and old.status = 'pending'
    and new.status = 'confirmed' then
    perform public.create_role_notification(
      new.patient_id,
      'patient',
      'appointment_confirmed',
      'Lịch hẹn đã được xác nhận',
      'Bác sĩ đã xác nhận lịch hẹn của bạn.',
      'appointment',
      new.id,
      '/patient/appointments/' || new.id::text
    );
  elsif v_actor_type = 'doctor'
    and new.doctor_id = v_actor_id
    and old.status = 'pending'
    and new.status = 'rejected' then
    perform public.create_role_notification(
      new.patient_id,
      'patient',
      'appointment_rejected',
      'Lịch hẹn đã bị từ chối',
      'Bác sĩ đã từ chối lịch hẹn. Lý do: ' || coalesce(nullif(btrim(new.reject_reason), ''), 'Không có lý do được cung cấp.'),
      'appointment',
      new.id,
      '/patient/appointments/' || new.id::text
    );
  elsif v_actor_type = 'doctor'
    and new.doctor_id = v_actor_id
    and new.status = 'cancelled' then
    perform public.create_role_notification(
      new.patient_id,
      'patient',
      'appointment_cancelled',
      'Lịch hẹn đã bị hủy',
      'Bác sĩ đã hủy lịch hẹn. Lý do: ' || coalesce(nullif(btrim(new.cancel_reason), ''), 'Không có lý do được cung cấp.'),
      'appointment',
      new.id,
      '/patient/appointments/' || new.id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_order_events_trigger on public.orders;
create trigger notify_order_events_trigger
after insert or update on public.orders
for each row execute function public.notify_order_events();

drop trigger if exists notify_shipment_events_trigger on public.shipments;
create trigger notify_shipment_events_trigger
after insert or update on public.shipments
for each row execute function public.notify_shipment_events();

drop trigger if exists notify_appointment_events_trigger on public.appointments;
create trigger notify_appointment_events_trigger
after insert or update on public.appointments
for each row execute function public.notify_appointment_events();

revoke execute on function public.create_role_notification(uuid, text, text, text, text, text, uuid, text) from public;
revoke execute on function public.create_role_notification(uuid, text, text, text, text, text, uuid, text) from anon;
revoke execute on function public.create_role_notification(uuid, text, text, text, text, text, uuid, text) from authenticated;

revoke execute on function public.notify_order_events() from public;
revoke execute on function public.notify_order_events() from anon;
revoke execute on function public.notify_order_events() from authenticated;

revoke execute on function public.notify_shipment_events() from public;
revoke execute on function public.notify_shipment_events() from anon;
revoke execute on function public.notify_shipment_events() from authenticated;

revoke execute on function public.notify_appointment_events() from public;
revoke execute on function public.notify_appointment_events() from anon;
revoke execute on function public.notify_appointment_events() from authenticated;
