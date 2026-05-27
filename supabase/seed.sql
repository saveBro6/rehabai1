insert into public.users (id, full_name, email, phone, role, date_of_birth, address, medical_condition)
values
  ('11111111-1111-4111-8111-111111111111', 'Nguyen Van An', 'an@example.com', '0901000001', 'patient', '1968-04-12', 'Quan 7, TP.HCM', 'Phuc hoi sau dot quy'),
  ('22222222-2222-4222-8222-222222222222', 'Tran Thi Binh', 'binh@example.com', '0901000002', 'admin', '1985-09-20', 'Quan 1, TP.HCM', null)
on conflict (email) do nothing;

insert into public.doctors (id, full_name, specialty, avatar_url, bio, experience_years, rating, consultation_fee, available_online)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'BS. Lê Minh Khoa', 'Phục hồi chức năng', '/images/doctors/le-minh-khoa.jpg', 'Chuyên điều trị phục hồi sau đột quỵ và chấn thương.', 12, 4.9, 350000, true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'ThS. Nguyễn Hà My', 'Vật lý trị liệu', '/images/doctors/nguyen-ha-my.jpg', 'Tập trung vào bài tập cá nhân hóa và phục hồi khả năng di chuyển.', 9, 4.8, 280000, true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'BS. Phạm Đức Trí', 'Thần kinh', '/images/doctors/pham-duc-tri.jpg', 'Tư vấn theo dõi biến chứng thần kinh sau đột quỵ.', 15, 4.9, 450000, true),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'BS. Võ Anh Thư', 'Cơ xương khớp', '/images/doctors/vo-anh-thu.jpg', 'Hỗ trợ phục hồi sau chấn thương và đau mỏi vận động.', 10, 4.7, 320000, false),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'CNDD. Hoàng Ngọc Lan', 'Dinh dưỡng phục hồi', '/images/doctors/hoang-ngoc-lan.jpg', 'Tư vấn dinh dưỡng giúp người bệnh có nền tảng phục hồi tốt hơn.', 8, 4.8, 250000, true)
on conflict (id) do nothing;

insert into public.products (id, name, description, category, price, image_url, stock_quantity, is_recommended)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'Bộ bóng mềm tập nắm tay', 'Dụng cụ tập lực nắm và vận động bàn tay cho người cần phục hồi sau đột quỵ.', 'Dụng cụ tập tay', 180000, '/images/products/hand-grip.jpg', 40, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'Dây kéo kháng lực RehabAI', 'Dây kháng lực nhiều mức độ cho bài tập tay, vai và chân.', 'Dây kháng lực', 220000, '/images/products/resistance-band.jpg', 35, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 'Khung tập đi gấp gọn', 'Hỗ trợ người bệnh tập đi an toàn trong quá trình tập luyện có giám sát.', 'Khung tập đi', 1250000, '/images/products/walker.jpg', 12, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'Bóng tập phục hồi 55cm', 'Bóng tập giúp cải thiện thăng bằng, sức mạnh thân mình và độ linh hoạt.', 'Bóng tập phục hồi', 360000, '/images/products/therapy-ball.jpg', 24, false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', 'Bàn đạp tập chân tại nhà', 'Dụng cụ tập chân nhỏ gọn cho người cần cải thiện tầm vận động.', 'Dụng cụ tập chân', 690000, '/images/products/pedal-trainer.jpg', 18, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6', 'Ghế tắm hỗ trợ an toàn', 'Ghế chống trượt hỗ trợ sinh hoạt hằng ngày cho người cao tuổi và người yếu vận động.', 'Ghế hỗ trợ', 780000, '/images/products/shower-chair.jpg', 14, false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7', 'Máy đo huyết áp điện tử', 'Thiết bị theo dõi sức khỏe tại nhà, phù hợp với người cần quan sát chỉ số định kỳ.', 'Thiết bị theo dõi sức khỏe', 950000, '/images/products/blood-pressure-monitor.jpg', 30, true)
on conflict (id) do update set name = excluded.name, description = excluded.description, category = excluded.category, price = excluded.price, image_url = excluded.image_url, stock_quantity = excluded.stock_quantity, is_recommended = excluded.is_recommended;

insert into public.subscriptions (id, name, price, description, features)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc0', 'Free', 0, 'Gói mặc định cho tài khoản đã đăng nhập nhưng chưa mua gói dịch vụ.', '["Truy cập Dashboard", "Xem danh sách bác sĩ", "Đặt lịch hẹn", "Mua sản phẩm", "Xem bảng giá"]'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Basic', 99000, 'Hỗ trợ cơ bản để bắt đầu hành trình phục hồi có định hướng.', '["Truy cập thư viện bài tập cơ bản", "Chatbot AI hỗ trợ thông tin dịch vụ", "Đặt lịch tư vấn online"]'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Standard', 249000, 'Phù hợp khi cần lộ trình tập luyện và theo dõi tiến trình.', '["Tất cả tính năng Basic", "Tạo lộ trình tập luyện cá nhân hóa", "Theo dõi tiến trình phục hồi", "Gợi ý bài tập theo mục tiêu"]'::jsonb),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Premium', 599000, 'Đồng hành sâu hơn với tư vấn ưu tiên và báo cáo tiến trình nâng cao.', '["Tất cả tính năng Standard", "Ưu tiên tư vấn với chuyên gia", "Báo cáo tiến trình nâng cao", "Gợi ý điều chỉnh lộ trình định kỳ"]'::jsonb)
on conflict (name) do update set price = excluded.price, description = excluded.description, features = excluded.features;

insert into public.exercises (id, title, slug, description, category, difficulty, body_region, duration_minutes, repetitions, sets, instructions, precautions, image_url, is_active)
values
  ('f1111111-1111-4111-8111-111111111111', 'Nâng tay thụ động', 'nang-tay-thu-dong', 'Bài tập nhẹ giúp duy trì tầm vận động vai và cánh tay sau đột quỵ.', 'Phục hồi sau đột quỵ', 'Cơ bản', 'Cánh tay', 8, 10, 2, array['Ngồi thẳng lưng trên ghế chắc chắn.', 'Dùng tay lành nâng nhẹ tay yếu lên phía trước.', 'Giữ 2 giây rồi hạ chậm về vị trí ban đầu.'], array['Không kéo quá tầm vận động gây đau.', 'Nên có người nhà hỗ trợ nếu khả năng giữ thăng bằng kém.'], '/images/exercises/passive-arm-raise.jpg', true),
  ('f1111111-1111-4111-8111-111111111112', 'Nắm mở bàn tay', 'nam-mo-ban-tay', 'Cải thiện khả năng chủ động của ngón tay và bàn tay.', 'Chi trên', 'Cơ bản', 'Bàn tay', 6, 12, 3, array['Đặt cẳng tay lên bàn.', 'Nắm bàn tay chậm rãi.', 'Mở từng ngón tay hết mức có thể.'], array['Dừng lại nếu có co thắt hoặc đau tăng nhanh.'], '/images/exercises/hand-open-close.jpg', true),
  ('f1111111-1111-4111-8111-111111111113', 'Duỗi cổ tay', 'duoi-co-tay', 'Kéo giãn nhẹ nhóm cơ gấp cổ tay, phù hợp với người bị cứng cơ.', 'Linh hoạt', 'Cơ bản', 'Bàn tay', 5, 8, 2, array['Đưa cánh tay ra trước.', 'Dùng tay còn lại kéo nhẹ bàn tay về phía sau.', 'Giữ 10 giây và thở đều.'], array['Không giật mạnh cổ tay.', 'Nếu tê lan xuống ngón tay, dừng tập.'], '/images/exercises/wrist-stretch.jpg', true),
  ('f1111111-1111-4111-8111-111111111114', 'Nâng chân khi ngồi', 'nang-chan-khi-ngoi', 'Tăng sức mạnh đùi trước và khả năng kiểm soát chân khi ngồi.', 'Chi dưới', 'Cơ bản', 'Chân', 8, 10, 2, array['Ngồi trên ghế, hai chân chạm sàn.', 'Duỗi một chân về phía trước đến khi gối gần thẳng.', 'Hạ chân chậm và đổi bên.'], array['Giữ lưng thẳng, không ngả người ra sau.'], '/images/exercises/seated-leg-raise.jpg', true),
  ('f1111111-1111-4111-8111-111111111115', 'Tập đứng lên ngồi xuống', 'tap-dung-len-ngoi-xuong', 'Hỗ trợ khả năng độc lập trong sinh hoạt hằng ngày.', 'Sức mạnh', 'Trung cấp', 'Chân', 10, 8, 3, array['Ngồi sát mép ghế chắc chắn.', 'Đặt hai chân rộng bằng vai.', 'Đẩy người đứng lên rồi ngồi xuống chậm rãi.'], array['Cần có tay vịn hoặc người hỗ trợ nếu thăng bằng chưa tốt.'], '/images/exercises/sit-to-stand.jpg', true),
  ('f1111111-1111-4111-8111-111111111116', 'Tập giữ thăng bằng', 'tap-giu-thang-bang', 'Rèn luyện thăng bằng tĩnh để giảm nguy cơ té ngã.', 'Tập thăng bằng', 'Cơ bản', 'Toàn thân', 7, 5, 2, array['Đứng gần mặt bàn hoặc tay vịn.', 'Giữ hai chân rộng bằng hông.', 'Giữ tư thế 20-30 giây và thở đều.'], array['Luôn tập gần điểm bám chắc chắn.', 'Dừng ngay nếu chóng mặt.'], '/images/exercises/balance-training.jpg', true),
  ('f1111111-1111-4111-8111-111111111117', 'Bước ngang có hỗ trợ', 'buoc-ngang-co-ho-tro', 'Cải thiện khả năng di chuyển ngang và kiểm soát hông.', 'Vận động', 'Trung cấp', 'Hông', 10, 10, 2, array['Đứng cạnh tay vịn.', 'Bước một chân sang ngang.', 'Kéo chân còn lại về gần và lặp lại.'], array['Không tập khi sàn trơn.', 'Cần người giám sát nếu từng té ngã gần đây.'], '/images/exercises/supported-side-step.jpg', true),
  ('f1111111-1111-4111-8111-111111111118', 'Kéo giãn vai', 'keo-gian-vai', 'Giảm căng cứng vùng vai và cải thiện tầm vận động.', 'Linh hoạt', 'Cơ bản', 'Vai', 6, 8, 2, array['Đưa tay ngang ngực.', 'Dùng tay còn lại kéo nhẹ cánh tay về phía thân mình.', 'Giữ 10 giây mỗi lần.'], array['Không ép vai nếu có đau nhói.'], '/images/exercises/shoulder-stretch.jpg', true),
  ('f1111111-1111-4111-8111-111111111119', 'Gập duỗi gối', 'gap-duoi-goi', 'Hỗ trợ tầm vận động khớp gối sau chấn thương hoặc phẫu thuật.', 'Phục hồi chấn thương', 'Cơ bản', 'Gối', 8, 10, 2, array['Ngồi hoặc nằm với chân duỗi thoải mái.', 'Gập gối chậm rãi trong mức không đau.', 'Duỗi chân về vị trí ban đầu.'], array['Tuân thủ giới hạn vận động nếu mới phẫu thuật.'], '/images/exercises/knee-flexion-extension.jpg', true),
  ('f1111111-1111-4111-8111-111111111120', 'Tập phối hợp tay mắt', 'tap-phoi-hop-tay-mat', 'Rèn khả năng điều khiển động tác và phối hợp sau đột quỵ.', 'Phối hợp động tác', 'Trung cấp', 'Cánh tay', 10, 12, 3, array['Đặt các vật nhỏ trên bàn.', 'Chạm lần lượt từng vật bằng ngón trỏ.', 'Tăng tốc độ khi kiểm soát tốt hơn.'], array['Bắt đầu chậm, ưu tiên chính xác hơn tốc độ.'], '/images/exercises/hand-eye-coordination.jpg', true)
on conflict (slug) do update set title = excluded.title, description = excluded.description, category = excluded.category, difficulty = excluded.difficulty, body_region = excluded.body_region, instructions = excluded.instructions, precautions = excluded.precautions;

with test_accounts as (
  select *
  from (
    values
      ('10000000-0000-4000-8000-000000000001'::uuid, 'patient@test.com', 'Test Patient', 'patient'),
      ('10000000-0000-4000-8000-000000000002'::uuid, 'admin@test.com', 'Test Admin', 'admin'),
      ('10000000-0000-4000-8000-000000000003'::uuid, 'doctor@test.com', 'Test Doctor', 'doctor')
  ) as accounts(id, email, full_name, role)
),
resolved_accounts as (
  select
    coalesce(existing.id, test_accounts.id) as id,
    test_accounts.email,
    test_accounts.full_name,
    test_accounts.role
  from test_accounts
  left join auth.users as existing on lower(existing.email) = lower(test_accounts.email)
),
updated_auth_users as (
  update auth.users
  set
    encrypted_password = crypt('1111', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change = '',
    email_change_token_current = '',
    reauthentication_token = '',
    raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email']),
    raw_user_meta_data = jsonb_build_object('full_name', resolved_accounts.full_name),
    updated_at = now()
  from resolved_accounts
  where auth.users.id = resolved_accounts.id
  returning auth.users.id
),
inserted_auth_users as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  )
  select
    '00000000-0000-0000-0000-000000000000',
    resolved_accounts.id,
    'authenticated',
    'authenticated',
    resolved_accounts.email,
    crypt('1111', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', resolved_accounts.full_name),
    now(),
    now(),
    false,
    false
  from resolved_accounts
  where not exists (
    select 1
    from updated_auth_users
    where updated_auth_users.id = resolved_accounts.id
  )
  returning id
)
insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  resolved_accounts.id,
  resolved_accounts.id::text,
  resolved_accounts.id,
  jsonb_build_object(
    'sub', resolved_accounts.id::text,
    'email', resolved_accounts.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from resolved_accounts
on conflict (provider_id, provider) do update
set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.users (id, full_name, email, role)
values
  ('10000000-0000-4000-8000-000000000001', 'Test Patient', 'patient@test.com', 'patient'),
  ('10000000-0000-4000-8000-000000000002', 'Test Admin', 'admin@test.com', 'admin'),
  ('10000000-0000-4000-8000-000000000003', 'Test Doctor', 'doctor@test.com', 'doctor')
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role;
