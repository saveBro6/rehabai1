insert into storage.buckets (id, name, public)
values
  ('images', 'images', true)
on conflict (id) do nothing;
