alter table public.exercises
drop constraint if exists exercises_difficulty_check;

update public.exercises as exercise
set
  category = data.category,
  difficulty = data.difficulty,
  body_region = data.body_region
from (
  values
    ('nang-tay-thu-dong', 'Phục hồi sau đột quỵ', 'Cơ bản', 'Cánh tay'),
    ('nam-mo-ban-tay', 'Chi trên', 'Cơ bản', 'Bàn tay'),
    ('duoi-co-tay', 'Linh hoạt', 'Cơ bản', 'Bàn tay'),
    ('nang-chan-khi-ngoi', 'Chi dưới', 'Cơ bản', 'Chân'),
    ('tap-dung-len-ngoi-xuong', 'Sức mạnh', 'Trung cấp', 'Chân'),
    ('tap-giu-thang-bang', 'Tập thăng bằng', 'Cơ bản', 'Toàn thân'),
    ('buoc-ngang-co-ho-tro', 'Vận động', 'Trung cấp', 'Hông'),
    ('keo-gian-vai', 'Linh hoạt', 'Cơ bản', 'Vai'),
    ('gap-duoi-goi', 'Phục hồi chấn thương', 'Cơ bản', 'Gối'),
    ('tap-phoi-hop-tay-mat', 'Phối hợp động tác', 'Trung cấp', 'Cánh tay')
) as data(slug, category, difficulty, body_region)
where exercise.slug = data.slug;

alter table public.exercises
add constraint exercises_difficulty_check
check (difficulty in ('Cơ bản', 'Trung cấp', 'Nâng cao'));

update public.subscriptions as subscription
set
  description = data.description,
  features = data.features::jsonb
from (
  values
    ('Free', 'Gói mặc định cho tài khoản đã đăng nhập nhưng chưa mua gói dịch vụ.', '["Truy cập Dashboard", "Xem danh sách bác sĩ", "Đặt lịch hẹn", "Mua sản phẩm", "Xem bảng giá"]'),
    ('Basic', 'Hỗ trợ cơ bản để bắt đầu hành trình phục hồi có định hướng.', '["Truy cập thư viện bài tập cơ bản", "Chatbot AI hỗ trợ thông tin dịch vụ", "Đặt lịch tư vấn online"]'),
    ('Standard', 'Phù hợp khi cần lộ trình tập luyện và theo dõi tiến trình.', '["Tất cả tính năng Basic", "Tạo lộ trình tập luyện cá nhân hóa", "Theo dõi tiến trình phục hồi", "Gợi ý bài tập theo mục tiêu"]'),
    ('Premium', 'Đồng hành sâu hơn với tư vấn ưu tiên và báo cáo tiến trình nâng cao.', '["Tất cả tính năng Standard", "Ưu tiên tư vấn với chuyên gia", "Báo cáo tiến trình nâng cao", "Gợi ý điều chỉnh lộ trình định kỳ"]')
) as data(name, description, features)
where subscription.name = data.name;
