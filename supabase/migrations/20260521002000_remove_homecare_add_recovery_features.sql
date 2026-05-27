drop table if exists public.home_care_bookings;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null,
  category text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  body_region text not null,
  duration_minutes integer,
  repetitions integer,
  sets integer,
  instructions text[] not null,
  precautions text[],
  image_url text,
  video_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.recovery_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  condition_type text not null,
  recovery_goal text not null,
  affected_body_region text not null,
  current_mobility_level text not null,
  preferred_difficulty text not null check (preferred_difficulty in ('beginner', 'intermediate', 'advanced')),
  sessions_per_week integer not null check (sessions_per_week between 1 and 7),
  notes text,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.recovery_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  recovery_plan_id uuid references public.recovery_plans(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  day_number integer not null,
  week_number integer not null,
  order_index integer not null,
  recommended_sets integer,
  recommended_repetitions integer,
  recommended_duration_minutes integer,
  created_at timestamptz default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  recovery_plan_id uuid references public.recovery_plans(id) on delete set null,
  exercise_id uuid references public.exercises(id) on delete set null,
  completed_at timestamptz default now(),
  pain_level integer check (pain_level between 0 and 10),
  fatigue_level integer check (fatigue_level between 0 and 10),
  mobility_score integer check (mobility_score between 0 and 100),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_exercises_category on public.exercises (category);
create index if not exists idx_exercises_difficulty on public.exercises (difficulty);
create index if not exists idx_exercises_body_region on public.exercises (body_region);
create index if not exists idx_exercises_slug on public.exercises (slug);
create index if not exists idx_recovery_plans_user on public.recovery_plans (user_id);
create index if not exists idx_recovery_plans_status on public.recovery_plans (status);
create index if not exists idx_exercise_logs_user_completed on public.exercise_logs (user_id, completed_at desc);

insert into public.subscriptions (id, name, price, description, features)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Basic', 99000, 'Ho tro co ban de bat dau hanh trinh phuc hoi co dinh huong.', '["Truy cap thu vien bai tap co ban", "Chatbot AI ho tro thong tin dich vu", "Dat lich tu van online"]'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Standard', 249000, 'Phu hop khi can lo trinh tap luyen va theo doi tien trinh.', '["Tat ca tinh nang Basic", "Tao lo trinh tap luyen ca nhan hoa", "Theo doi tien trinh phuc hoi", "Goi y bai tap theo muc tieu"]'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Premium', 599000, 'Dong hanh sau hon voi tu van uu tien va bao cao tien trinh nang cao.', '["Tat ca tinh nang Standard", "Uu tien tu van voi chuyen gia", "Bao cao tien trinh nang cao", "Goi y dieu chinh lo trinh dinh ky"]'::jsonb)
on conflict (name) do update set price = excluded.price, description = excluded.description, features = excluded.features;

insert into public.exercises (id, title, slug, description, category, difficulty, body_region, duration_minutes, repetitions, sets, instructions, precautions, image_url, is_active)
values
  ('f1111111-1111-4111-8111-111111111111', 'Nang tay thu dong', 'nang-tay-thu-dong', 'Bai tap nhe giup duy tri tam van dong vai va canh tay sau dot quy.', 'stroke_rehabilitation', 'beginner', 'arm', 8, 10, 2, array['Ngoi thang lung tren ghe chac chan.', 'Dung tay lanh nang nhe tay yeu len phia truoc.', 'Giu 2 giay roi ha cham ve vi tri ban dau.'], array['Khong keo qua tam van dong gay dau.', 'Nen co nguoi nha ho tro neu kha nang giu thang bang kem.'], '/images/exercises/passive-arm-raise.jpg', true),
  ('f1111111-1111-4111-8111-111111111112', 'Nam mo ban tay', 'nam-mo-ban-tay', 'Cai thien kha nang chu dong cua ngon tay va ban tay.', 'upper_limb', 'beginner', 'hand', 6, 12, 3, array['Dat cang tay len ban.', 'Nam ban tay cham rai.', 'Mo tung ngon tay het muc co the.'], array['Dung lai neu co co that hoac dau tang nhanh.'], '/images/exercises/hand-open-close.jpg', true),
  ('f1111111-1111-4111-8111-111111111113', 'Duoi co tay', 'duoi-co-tay', 'Keo gian nhe nhom co gap co tay, phu hop voi nguoi bi cung co.', 'flexibility', 'beginner', 'hand', 5, 8, 2, array['Dua canh tay ra truoc.', 'Dung tay con lai keo nhe ban tay ve phia sau.', 'Giu 10 giay va tho deu.'], array['Khong giat manh co tay.', 'Neu te lan xuong ngon tay, dung tap.'], '/images/exercises/wrist-stretch.jpg', true),
  ('f1111111-1111-4111-8111-111111111114', 'Nang chan khi ngoi', 'nang-chan-khi-ngoi', 'Tang suc manh dui truoc va kha nang kiem soat chan khi ngoi.', 'lower_limb', 'beginner', 'leg', 8, 10, 2, array['Ngoi tren ghe, hai chan cham san.', 'Duoi mot chan ve phia truoc den khi goi gan thang.', 'Ha chan cham va doi ben.'], array['Giu lung thang, khong nga nguoi ra sau.'], '/images/exercises/seated-leg-raise.jpg', true),
  ('f1111111-1111-4111-8111-111111111115', 'Tap dung len ngoi xuong', 'tap-dung-len-ngoi-xuong', 'Ho tro kha nang doc lap trong sinh hoat hang ngay.', 'strength', 'intermediate', 'leg', 10, 8, 3, array['Ngoi sat mep ghe chac chan.', 'Dat hai chan rong bang vai.', 'Day nguoi dung len roi ngoi xuong cham rai.'], array['Can co tay vin hoac nguoi ho tro neu thang bang chua tot.'], '/images/exercises/sit-to-stand.jpg', true),
  ('f1111111-1111-4111-8111-111111111116', 'Tap giu thang bang', 'tap-giu-thang-bang', 'Ren luyen thang bang tinh de giam nguy co te nga.', 'balance_training', 'beginner', 'full_body', 7, 5, 2, array['Dung gan mat ban hoac tay vin.', 'Giu hai chan rong bang hong.', 'Giu tu the 20-30 giay va tho deu.'], array['Luon tap gan diem bam chac chan.', 'Dung ngay neu chong mat.'], '/images/exercises/balance-training.jpg', true),
  ('f1111111-1111-4111-8111-111111111117', 'Buoc ngang co ho tro', 'buoc-ngang-co-ho-tro', 'Cai thien kha nang di chuyen ngang va kiem soat hong.', 'mobility', 'intermediate', 'hip', 10, 10, 2, array['Dung canh tay vin.', 'Buoc mot chan sang ngang.', 'Keo chan con lai ve gan va lap lai.'], array['Khong tap khi san tron.', 'Can nguoi giam sat neu tung te nga gan day.'], '/images/exercises/supported-side-step.jpg', true),
  ('f1111111-1111-4111-8111-111111111118', 'Keo gian vai', 'keo-gian-vai', 'Giam cang cung vung vai va cai thien tam van dong.', 'flexibility', 'beginner', 'shoulder', 6, 8, 2, array['Dua tay ngang nguc.', 'Dung tay con lai keo nhe canh tay ve phia than minh.', 'Giu 10 giay moi lan.'], array['Khong ep vai neu co dau nhon.'], '/images/exercises/shoulder-stretch.jpg', true),
  ('f1111111-1111-4111-8111-111111111119', 'Gap duoi goi', 'gap-duoi-goi', 'Ho tro tam van dong khop goi sau chan thuong hoac phau thuat.', 'injury_recovery', 'beginner', 'knee', 8, 10, 2, array['Ngoi hoac nam voi chan duoi thoai mai.', 'Gap goi cham rai trong muc khong dau.', 'Duoi chan ve vi tri ban dau.'], array['Tuan thu gioi han van dong neu moi phau thuat.'], '/images/exercises/knee-flexion-extension.jpg', true),
  ('f1111111-1111-4111-8111-111111111120', 'Tap phoi hop tay mat', 'tap-phoi-hop-tay-mat', 'Ren kha nang dieu khien dong tac va phoi hop sau dot quy.', 'coordination', 'intermediate', 'arm', 10, 12, 3, array['Dat cac vat nho tren ban.', 'Cham lan luot tung vat bang ngon tro.', 'Tang toc do khi kiem soat tot hon.'], array['Bat dau cham, uu tien chinh xac hon toc do.'], '/images/exercises/hand-eye-coordination.jpg', true)
on conflict (slug) do update set description = excluded.description, category = excluded.category, difficulty = excluded.difficulty, body_region = excluded.body_region, instructions = excluded.instructions, precautions = excluded.precautions;
