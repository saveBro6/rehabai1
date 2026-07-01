import type { AIAnalysisResult } from "../types";
import { validateAIAnalysisResult } from "../utils/validation";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getModelList(): string[] {
  const envModels = process.env.OPENROUTER_MULTIMODALS;
  if (envModels) {
    return envModels
      .split(",")
      .map((m) => m.trim().replace(/^['"\[]+|['"\]]+$/g, ""))
      .filter(Boolean);
  }
  // Danh sách các mô hình đa phương thức dự phòng mặc định
  return [
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "google/gemini-flash-1.5-8b"
  ];
}

export async function analyzeMedicalRecordImage(imageUrlOrBase64: string): Promise<AIAnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Cấu hình API Key cho OpenRouter đang bị thiếu.");
  }

  const prompt = `Hãy đóng vai trò là một bác sĩ và chuyên gia phân tích tài liệu y khoa. Hãy phân tích hình ảnh hồ sơ bệnh án y khoa được cung cấp dưới dạng ảnh và trích xuất thông tin thành cấu trúc JSON hợp lệ.
Yêu cầu bắt buộc:
1. Phản hồi của bạn chỉ được chứa một đối tượng JSON duy nhất khớp chính xác với JSON Schema được cung cấp bên dưới.
2. Tuyệt đối không trả về bất kỳ văn bản giải thích nào trước hoặc sau JSON, không bọc JSON trong khối mã markdown (như \`\`\`json ... \`\`\`). Chỉ trả về nội dung JSON thô.
3. Sử dụng tiếng Việt có dấu cho các mô tả, giải thích và lời khuyên y tế.
4. Không tự ý bịa đặt thông tin. Nếu không tìm thấy thông tin cụ thể (ví dụ: tuổi của bệnh nhân, mã bệnh nhân...), hãy để giá trị là null cho các trường kiểu chuỗi/số, hoặc mảng rỗng [] cho các trường danh sách.
5. Trích xuất chính xác các thẻ ngữ nghĩa trong phần rehabilitation (focus_areas, body_parts, injury_types, goals, exercise_tags) và shopping (recommended_categories, product_tags) để giúp hệ thống khớp với cơ sở dữ liệu có sẵn.

JSON Schema bắt buộc:
{
  "patient": {
    "name": "Tên bệnh nhân (hoặc null)",
    "age": Tuổi bệnh nhân dạng số (hoặc null),
    "gender": "Giới tính (hoặc null)",
    "patient_id": "Mã bệnh nhân (hoặc null)"
  },
  "medical_record": {
    "hospital": "Tên bệnh viện/phòng khám (hoặc null)",
    "department": "Khoa/phòng khám (hoặc null)",
    "visit_date": "Ngày khám dạng YYYY-MM-DD (hoặc null)",
    "document_type": "Loại tài liệu (ví dụ: Giấy xuất viện, Đơn thuốc, Phiếu kết quả...) (hoặc null)",
    "chief_complaint": "Lý do khám bệnh chính (hoặc null)",
    "diagnosis": ["Danh sách các chẩn đoán bệnh chính"],
    "medical_history": ["Tiền sử bệnh lý"],
    "medications": ["Danh sách thuốc đang sử dụng"],
    "doctor_notes": "Ghi chú thêm của bác sĩ (hoặc null)"
  },
  "analysis": {
    "summary": "Tóm tắt ngắn gọn tình trạng bệnh án cho bệnh nhân",
    "severity": "Đánh giá mức độ nghiêm trọng (ví dụ: Nhẹ, Trung bình, Nghiêm trọng, Nguy kịch)",
    "key_findings": ["Các phát hiện quan trọng trong hồ sơ"],
    "medical_terms": [
      {
        "term": "Thuật ngữ chuyên môn y khoa phức tạp xuất hiện trong hồ sơ",
        "explanation": "Giải thích thuật ngữ này bằng ngôn ngữ dễ hiểu đối với bệnh nhân"
      }
    ],
    "recommendations": ["Khuyến nghị y khoa an toàn dành cho bệnh nhân"],
    "follow_up": ["Các bước theo dõi hoặc hướng dẫn tái khám"]
  },
  "rehabilitation": {
    "focus_areas": ["Các vùng cần tập trung phục hồi (ví dụ: Vận động, Thăng bằng, Sức bền...)"],
    "body_parts": ["Các bộ phận cơ thể cần phục hồi (ví dụ: Cánh tay, Vai, Cổ tay, Bàn tay, Chân, Gối, Hông...)"],
    "injury_types": ["Loại chấn thương/di chứng liên quan (ví dụ: Yếu nửa người, Đột quỵ, Cứng khớp...)"],
    "difficulty": "Độ khó bài tập đề xuất (chỉ nhận một trong các giá trị: beginner, intermediate, advanced)",
    "goals": ["Mục tiêu phục hồi ngắn hạn"],
    "exercise_tags": ["Các thẻ từ khóa bài tập liên quan để tìm kiếm khớp (ví dụ: passive-arm-raise, hand-open-close, wrist-stretch...)"]
  },
  "shopping": {
    "recommended_categories": ["Các danh mục sản phẩm khuyên dùng (ví dụ: Dụng cụ tập tay, Khung tập đi, Bóng tập phục hồi, Thiết bị theo dõi sức khỏe...)"],
    "product_tags": ["Các từ khóa nhãn sản phẩm liên quan (ví dụ: hand-grip, resistance-band, walker, blood-pressure-monitor...)"],
    "notes": "Ghi chú mua sắm dụng cụ y tế hỗ trợ (hoặc null)"
  }
}`;

  const models = getModelList();
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Đang phân tích ảnh bệnh án sử dụng mô hình AI: ${model}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://rehabai.app",
          "X-Title": "RehabAI Medical Record Analyzer"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrlOrBase64
                  }
                }
              ]
            }
          ],
          response_format: {
            type: "json_object"
          },
          temperature: 0.1
        }),
        signal: controller.signal,
        cache: "no-store"
      });
      clearTimeout(timeoutId);

      console.log(`[AI Service] HTTP Status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Service] Error response:`, errorText);
        throw new Error(`OpenRouter API error (HTTP ${response.status}) với mô hình ${model}: ${errorText}`);
      }

      const responseJson = await response.json();
      console.log(`[AI Service] Response JSON:`, JSON.stringify(responseJson).substring(0, 300));
      const textContent = responseJson.choices?.[0]?.message?.content;

      if (!textContent) {
        console.error(`[AI Service] Trống choices hoặc content từ mô hình ${model}`);
        throw new Error(`Không nhận được nội dung phản hồi từ mô hình ${model}.`);
      }

      // Làm sạch markdown nếu mô hình vô tình bọc trong ```json
      let cleanText = textContent.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsedData = JSON.parse(cleanText);
      const validatedData = validateAIAnalysisResult(parsedData);
      return validatedData;

    } catch (error) {
      lastError = error;
      console.warn(`Lần phân tích bệnh án với mô hình ${model} thất bại:`, error);
      // Tiếp tục vòng lặp để tự động fallback sang mô hình tiếp theo
    }
  }

  throw lastError || new Error("Quá trình phân tích bằng AI thất bại sau nhiều lần thử.");
}
