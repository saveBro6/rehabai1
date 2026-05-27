import { assertNoSupabaseError, getSupabase } from "@/services/common";

const severeKeywords = [
  "yeu liet dot ngot",
  "yếu liệt đột ngột",
  "kho tho",
  "khó thở",
  "dau nguc",
  "đau ngực",
  "roi loan y thuc",
  "rối loạn ý thức",
  "dot quy",
  "đột quỵ",
  "ngat",
  "ngất",
  "meo mieng",
  "méo miệng"
];

export function buildChatbotReply(message: string) {
  const text = message.toLowerCase();
  if (severeKeywords.some((keyword) => text.includes(keyword))) {
    return "Những dấu hiệu bạn mô tả có thể nghiêm trọng. Vui lòng gọi cấp cứu hoặc đến cơ sở y tế gần nhất ngay. RehabAI Assistant không thay thế bác sĩ và không đưa ra chẩn đoán y khoa.";
  }
  if (text.includes("premium") && text.includes("standard")) {
    return "Standard có lộ trình cá nhân hóa và theo dõi tiến trình. Premium thêm ưu tiên tư vấn với chuyên gia, báo cáo tiến trình nâng cao và gợi ý điều chỉnh lộ trình định kỳ.";
  }
  if (text.includes("gói") || text.includes("goi") || text.includes("basic") || text.includes("standard") || text.includes("premium")) {
    return "Basic phù hợp khi cần thư viện bài tập và đặt lịch online. Standard phù hợp khi cần lộ trình cá nhân hóa. Premium phù hợp khi cần theo dõi tiến trình nâng cao và tư vấn ưu tiên.";
  }
  if (text.includes("lộ trình") || text.includes("lo trinh") || text.includes("recovery plan")) {
    return "Bạn có thể tạo lộ trình tại mục Lộ trình tập luyện bằng cách chọn tình trạng, mục tiêu, vùng cơ thể cần tập trung, độ khó và số buổi mỗi tuần.";
  }
  if (text.includes("tiến trình") || text.includes("tien trinh") || text.includes("progress")) {
    return "Mục Theo dõi tiến trình hiển thị số buổi đã tập, bài tập đã hoàn thành, streak, mức đau/mệt và khả năng cử động theo thời gian.";
  }
  if (text.includes("bài tập") || text.includes("bai tap") || text.includes("tập")) {
    return "Bạn có thể bắt đầu bằng các bài tập beginner trong Thư viện bài tập, lọc theo vùng cơ thể và mục tiêu. Nếu bài tập liên quan tình trạng bệnh cụ thể, hãy xác nhận với bác sĩ hoặc chuyên gia trước khi tập.";
  }
  if (text.includes("bác sĩ") || text.includes("bac si") || text.includes("đặt lịch") || text.includes("tu van")) {
    return "RehabAI hỗ trợ xem danh sách bác sĩ, lọc theo chuyên khoa và tạo lịch tư vấn online với bác sĩ hoặc chuyên gia.";
  }
  if (text.includes("sản phẩm") || text.includes("san pham") || text.includes("mua")) {
    return "Marketplace RehabAI có dụng cụ tập tay, tập chân, khung tập đi, bóng tập, dây kháng lực, ghế hỗ trợ và thiết bị theo dõi sức khỏe.";
  }
  return "Tôi là RehabAI Assistant. Tôi hỗ trợ thông tin về gói đăng ký, thư viện bài tập, lộ trình cá nhân hóa, theo dõi tiến trình, đặt lịch online và sản phẩm phục hồi. Tôi không chẩn đoán bệnh, kê đơn thuốc hoặc thay thế tư vấn y khoa chuyên môn.";
}

export async function getChatbotReply(message: string, userId?: string | null) {
  const reply = buildChatbotReply(message);

  if (userId) {
    const supabase = getSupabase();
    const { error } = await supabase.from("chatbot_messages").insert({ user_id: userId, message, reply });
    assertNoSupabaseError(error);
  }

  return reply;
}
