import type { Doctor, Exercise, ExerciseLog, Product, RecoveryPlan, RecoveryPlanExercise, Subscription, User } from "@/types";

export const MOCK_USER_ID = "11111111-1111-4111-8111-111111111111";

export const bodyRegions = ["Cánh tay", "Bàn tay", "Chân", "Vai", "Hông", "Gối", "Cổ chân", "Cơ lõi", "Toàn thân"];

export const mockUser: User = {
  id: MOCK_USER_ID,
  account_id: MOCK_USER_ID,
  full_name: "Nguyen Van An",
  email: "an@example.com",
  phone: "0901000001",
  role: "patient",
  date_of_birth: "1968-04-12",
  address: "Quan 7, TP.HCM",
  medical_condition: "Phuc hoi sau dot quy"
};

export const mockDoctors: Doctor[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    full_name: "BS. Lê Minh Khoa",
    specialty: "Phục hồi chức năng",
    avatar_url: "/images/doctors/le-minh-khoa.jpg",
    bio: "Chuyên điều trị phục hồi sau đột quỵ và chấn thương vận động.",
    experience_years: 12,
    rating: 4.9,
    consultation_fee: 350000,
    available_online: true
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    full_name: "ThS. Nguyễn Hà My",
    specialty: "Vật lý trị liệu",
    avatar_url: "/images/doctors/nguyen-ha-my.jpg",
    bio: "Thiết kế bài tập cá nhân hóa và phục hồi khả năng tự di chuyển.",
    experience_years: 9,
    rating: 4.8,
    consultation_fee: 280000,
    available_online: true
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    full_name: "BS. Phạm Đức Trí",
    specialty: "Thần kinh",
    avatar_url: "/images/doctors/pham-duc-tri.jpg",
    bio: "Hỗ trợ tư vấn theo dõi biến chứng thần kinh sau đột quỵ.",
    experience_years: 15,
    rating: 4.9,
    consultation_fee: 450000,
    available_online: true
  }
];

export const mockProducts: Product[] = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    name: "Bộ bóng mềm tập nắm tay",
    description: "Dụng cụ tập lực nắm và vận động bàn tay cho người cần phục hồi sau đột quỵ.",
    category: "Dụng cụ tập tay",
    price: 180000,
    image_url: "/images/products/hand-grip.jpg",
    stock_quantity: 40,
    is_recommended: true,
    is_active: true
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    name: "Dây kéo kháng lực",
    description: "Dây kháng lực nhiều mức độ cho bài tập tay, vai và chân.",
    category: "Dây kháng lực",
    price: 220000,
    image_url: "/images/products/resistance-band.jpg",
    stock_quantity: 35,
    is_recommended: true,
    is_active: true
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    name: "Khung tập đi gấp gọn",
    description: "Hỗ trợ người bệnh tập đi an toàn trong quá trình tập luyện có giám sát.",
    category: "Khung tập đi",
    price: 1250000,
    image_url: "/images/products/walker.jpg",
    stock_quantity: 12,
    is_recommended: true,
    is_active: true
  }
];

export const mockSubscriptions: Subscription[] = [
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc0",
    name: "Free",
    price: 0,
    description: "Gói mặc định cho tài khoản đã đăng nhập nhưng chưa mua subscription.",
    features: ["Truy cập Dashboard", "Xem bác sĩ", "Đặt lịch hẹn", "Mua sản phẩm", "Xem bảng giá"]
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    name: "Basic",
    price: 99000,
    description: "Hỗ trợ cơ bản để bắt đầu hành trình phục hồi có định hướng.",
    features: ["Truy cập thư viện bài tập cơ bản", "Chatbot AI hỗ trợ thông tin dịch vụ", "Đặt lịch tư vấn online", "Mua dụng cụ hỗ trợ phục hồi"]
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
    name: "Standard",
    price: 249000,
    description: "Phù hợp khi cần lộ trình tập luyện và theo dõi tiến trình.",
    features: ["Tất cả tính năng Basic", "Tạo lộ trình tập luyện cá nhân hóa", "Theo dõi tiến trình phục hồi", "Gợi ý bài tập theo mục tiêu"]
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
    name: "Premium",
    price: 599000,
    description: "Đồng hành sâu hơn với tư vấn ưu tiên và báo cáo tiến trình nâng cao.",
    features: ["Tất cả tính năng Standard", "Ưu tiên tư vấn với chuyên gia", "Báo cáo tiến trình nâng cao", "Gợi ý điều chỉnh lộ trình định kỳ"]
  }
];

export const mockExercises: Exercise[] = [
  {
    id: "f1111111-1111-4111-8111-111111111111",
    title: "Nâng tay thụ động",
    slug: "nang-tay-thu-dong",
    description: "Bài tập nhẹ giúp duy trì tầm vận động vai và cánh tay sau đột quỵ.",
    category: "Phục hồi sau đột quỵ",
    difficulty: "Cơ bản",
    body_region: "Cánh tay",
    duration_minutes: 8,
    repetitions: 10,
    sets: 2,
    instructions: ["Ngồi thẳng lưng trên ghế chắc chắn.", "Dùng tay lành nâng nhẹ tay yếu lên phía trước.", "Giữ 2 giây rồi hạ chậm về vị trí ban đầu."],
    precautions: ["Không kéo quá tầm vận động gây đau.", "Nên có người nhà hỗ trợ nếu khả năng giữ thăng bằng kém."],
    image_url: "/images/exercises/passive-arm-raise.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111112",
    title: "Nắm mở bàn tay",
    slug: "nam-mo-ban-tay",
    description: "Cải thiện khả năng chủ động của ngón tay và bàn tay.",
    category: "Chi trên",
    difficulty: "Cơ bản",
    body_region: "Bàn tay",
    duration_minutes: 6,
    repetitions: 12,
    sets: 3,
    instructions: ["Đặt cẳng tay lên bàn.", "Nắm bàn tay chậm rãi.", "Mở từng ngón tay hết mức có thể."],
    precautions: ["Dừng lại nếu có co thắt hoặc đau tăng nhanh."],
    image_url: "/images/exercises/hand-open-close.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111113",
    title: "Duỗi cổ tay",
    slug: "duoi-co-tay",
    description: "Kéo giãn nhẹ cơ gập cổ tay, phù hợp với người bị cứng cơ.",
    category: "Linh hoạt",
    difficulty: "Cơ bản",
    body_region: "Bàn tay",
    duration_minutes: 5,
    repetitions: 8,
    sets: 2,
    instructions: ["Đưa cánh tay ra trước.", "Dùng tay còn lại kéo nhẹ bàn tay về phía sau.", "Giữ 10 giây và thở đều."],
    precautions: ["Không giật mạnh cổ tay.", "Nếu tê lan xuống ngón tay, dừng tập."],
    image_url: "/images/exercises/wrist-stretch.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111114",
    title: "Nâng chân khi ngồi",
    slug: "nang-chan-khi-ngoi",
    description: "Tăng sức mạnh đùi trước và khả năng kiểm soát chân khi ngồi.",
    category: "Chi dưới",
    difficulty: "Cơ bản",
    body_region: "Chân",
    duration_minutes: 8,
    repetitions: 10,
    sets: 2,
    instructions: ["Ngồi trên ghế, hai chân chạm sàn.", "Duỗi một chân về phía trước đến khi gối gần thẳng.", "Hạ chân chậm và đổi bên."],
    precautions: ["Giữ lưng thẳng, không ngả người ra sau."],
    image_url: "/images/exercises/seated-leg-raise.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111115",
    title: "Tập đứng lên ngồi xuống",
    slug: "tap-dung-len-ngoi-xuong",
    description: "Hỗ trợ khả năng độc lập trong sinh hoạt hằng ngày.",
    category: "Sức mạnh",
    difficulty: "Trung cấp",
    body_region: "Chân",
    duration_minutes: 10,
    repetitions: 8,
    sets: 3,
    instructions: ["Ngồi sát mép ghế chắc chắn.", "Đặt hai chân rộng bằng vai.", "Đẩy người đứng lên rồi ngồi xuống chậm rãi."],
    precautions: ["Cần có tay vịn hoặc người hỗ trợ nếu thăng bằng chưa tốt."],
    image_url: "/images/exercises/sit-to-stand.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111116",
    title: "Tập giữ thăng bằng",
    slug: "tap-giu-thang-bang",
    description: "Rèn luyện thăng bằng tĩnh để giảm nguy cơ té ngã.",
    category: "Tập thăng bằng",
    difficulty: "Cơ bản",
    body_region: "Toàn thân",
    duration_minutes: 7,
    repetitions: 5,
    sets: 2,
    instructions: ["Đứng gần mặt bàn hoặc tay vịn.", "Giữ hai chân rộng bằng hông.", "Giữ tư thế 20-30 giây và thở đều."],
    precautions: ["Luôn tập gần điểm bám chắc chắn.", "Dừng ngay nếu chóng mặt."],
    image_url: "/images/exercises/balance-training.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111117",
    title: "Bước ngang có hỗ trợ",
    slug: "buoc-ngang-co-ho-tro",
    description: "Cải thiện khả năng di chuyển ngang và kiểm soát hông.",
    category: "Vận động",
    difficulty: "Trung cấp",
    body_region: "Hông",
    duration_minutes: 10,
    repetitions: 10,
    sets: 2,
    instructions: ["Đứng cạnh tay vịn.", "Bước một chân sang ngang.", "Kéo chân còn lại về gần và lặp lại."],
    precautions: ["Không tập khi sàn trơn.", "Cần người giám sát nếu từng té ngã gần đây."],
    image_url: "/images/exercises/supported-side-step.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111118",
    title: "Kéo giãn vai",
    slug: "keo-gian-vai",
    description: "Giảm căng cứng vùng vai và cải thiện tầm vận động.",
    category: "Linh hoạt",
    difficulty: "Cơ bản",
    body_region: "Vai",
    duration_minutes: 6,
    repetitions: 8,
    sets: 2,
    instructions: ["Đưa tay ngang ngực.", "Dùng tay còn lại kéo nhẹ cánh tay về phía thân mình.", "Giữ 10 giây mỗi lần."],
    precautions: ["Không ép vai nếu có đau nhói."],
    image_url: "/images/exercises/shoulder-stretch.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111119",
    title: "Gập duỗi gối",
    slug: "gap-duoi-goi",
    description: "Hỗ trợ tầm vận động khớp gối sau chấn thương hoặc phẫu thuật.",
    category: "Phục hồi chấn thương",
    difficulty: "Cơ bản",
    body_region: "Gối",
    duration_minutes: 8,
    repetitions: 10,
    sets: 2,
    instructions: ["Ngồi hoặc nằm với chân duỗi thoải mái.", "Gập gối chậm rãi trong mức không đau.", "Duỗi chân về vị trí ban đầu."],
    precautions: ["Tuân thủ giới hạn vận động nếu mới phẫu thuật."],
    image_url: "/images/exercises/knee-flexion-extension.jpg",
    is_active: true
  },
  {
    id: "f1111111-1111-4111-8111-111111111120",
    title: "Tập phối hợp tay mắt",
    slug: "tap-phoi-hop-tay-mat",
    description: "Rèn khả năng điều khiển động tác và phối hợp sau đột quỵ.",
    category: "Phối hợp động tác",
    difficulty: "Trung cấp",
    body_region: "Cánh tay",
    duration_minutes: 10,
    repetitions: 12,
    sets: 3,
    instructions: ["Đặt các vật nhỏ trên bàn.", "Chạm lần lượt từng vật bằng ngón trỏ.", "Tăng tốc độ khi kiểm soát tốt hơn."],
    precautions: ["Bắt đầu chậm, ưu tiên chính xác hơn tốc độ."],
    image_url: "/images/exercises/hand-eye-coordination.jpg",
    is_active: true
  }
];

export const mockRecoveryPlans: RecoveryPlan[] = [
  {
    id: "91111111-1111-4111-8111-111111111111",
    user_id: MOCK_USER_ID,
    condition_type: "stroke",
    recovery_goal: "improve_mobility",
    affected_body_region: "arm",
    current_mobility_level: "moderate",
    preferred_difficulty: "beginner",
    sessions_per_week: 3,
    notes: "Tap trung kiem soat tay phai va thang bang co ban.",
    status: "active",
    created_at: new Date().toISOString()
  }
];

export const mockRecoveryPlanExercises: RecoveryPlanExercise[] = mockExercises.slice(0, 5).map((exercise, index) => ({
  id: `92222222-2222-4222-8222-22222222222${index}`,
  recovery_plan_id: mockRecoveryPlans[0].id,
  exercise_id: exercise.id,
  day_number: index < 3 ? 1 : 3,
  week_number: 1,
  order_index: index + 1,
  recommended_sets: exercise.sets,
  recommended_repetitions: exercise.repetitions,
  recommended_duration_minutes: exercise.duration_minutes,
  exercise,
  created_at: new Date().toISOString()
}));

export const mockExerciseLogs: ExerciseLog[] = [
  {
    id: "93333333-3333-4333-8333-333333333331",
    user_id: MOCK_USER_ID,
    recovery_plan_id: mockRecoveryPlans[0].id,
    exercise_id: mockExercises[0].id,
    completed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    pain_level: 2,
    fatigue_level: 4,
    mobility_score: 68,
    notes: "Hoan thanh nhe, khong dau tang.",
    exercise: mockExercises[0]
  },
  {
    id: "93333333-3333-4333-8333-333333333332",
    user_id: MOCK_USER_ID,
    recovery_plan_id: mockRecoveryPlans[0].id,
    exercise_id: mockExercises[1].id,
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    pain_level: 3,
    fatigue_level: 4,
    mobility_score: 70,
    notes: "Ban tay mo tot hon.",
    exercise: mockExercises[1]
  },
  {
    id: "93333333-3333-4333-8333-333333333333",
    user_id: MOCK_USER_ID,
    recovery_plan_id: mockRecoveryPlans[0].id,
    exercise_id: mockExercises[5].id,
    completed_at: new Date().toISOString(),
    pain_level: 2,
    fatigue_level: 3,
    mobility_score: 72,
    notes: "Giu thang bang on dinh hon.",
    exercise: mockExercises[5]
  }
];
