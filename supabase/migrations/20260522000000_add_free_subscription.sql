insert into public.subscriptions (id, name, price, description, features)
values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc0',
    'Free',
    0,
    'Goi mac dinh cho tai khoan da dang nhap nhung chua mua subscription.',
    '["Truy cap Dashboard", "Xem bac si", "Dat lich hen", "Mua san pham", "Xem bang gia"]'::jsonb
  )
on conflict (name) do update
set price = excluded.price,
    description = excluded.description,
    features = excluded.features;
