import { type NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { analyzeMedicalRecordImage } from "@/app/patient/ai_analysis/services/ai.service";
import { saveAnalysisRecord, saveUploadedImageRecord } from "@/app/patient/ai_analysis/services/db.service";
import { matchProducts, matchRehabExercises } from "@/app/patient/ai_analysis/services/matching.service";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Yêu cầu đăng nhập tài khoản bệnh nhân." }, { status: 401 });
    }

    // Kiểm tra loại tài khoản của user
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("account_type, account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json({ error: "Không tìm thấy thông tin tài khoản." }, { status: 403 });
    }

    if (account.account_type !== "patient") {
      return NextResponse.json({ error: "Tính năng này chỉ dành cho tài khoản bệnh nhân." }, { status: 403 });
    }

    if (account.account_status !== "active") {
      return NextResponse.json({ error: "Tài khoản của bạn hiện đang bị khóa." }, { status: 403 });
    }

    console.log("=== API AI-Analysis: BẮT ĐẦU ===");
    const body = await request.json().catch(() => ({}));
    const { image_path, file_name, file_size, mime_type } = body;
    console.log("image_path:", image_path, "file_name:", file_name);

    if (!image_path || typeof image_path !== "string") {
      console.error("API AI-Analysis: Thiếu image_path");
      return NextResponse.json({ error: "Thiếu đường dẫn tệp hình ảnh y tế hợp lệ." }, { status: 400 });
    }

    // 1. Tải ảnh trực tiếp từ Supabase Storage sử dụng Admin client để bỏ qua RLS và chuyển đổi sang Base64
    console.log("API AI-Analysis Step 1: Khởi tạo admin client để tải ảnh...");
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    console.log("API AI-Analysis Step 1: Tải ảnh từ storage...");
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from("medical-records")
      .download(image_path);

    if (downloadError || !fileData) {
      console.error("API AI-Analysis Step 1 Error:", downloadError);
      throw new Error(`Không thể tải ảnh từ Storage: ${downloadError?.message || "Lỗi không xác định"}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");
    const base64DataUrl = `data:${mime_type || "image/png"};base64,${base64String}`;
    console.log("Base64 string length:", base64String.length);

    // 2. Gọi OpenRouter API phân tích hình ảnh đa phương thức (Multimodal Analysis) truyền bằng Base64
    console.log("API AI-Analysis Step 2: Bắt đầu gọi analyzeMedicalRecordImage...");
    const aiResult = await analyzeMedicalRecordImage(base64DataUrl);
    console.log("API AI-Analysis Step 2: Phân tích AI hoàn thành.");

    // 3. Khớp các bài tập và sản phẩm hỗ trợ y tế tương ứng
    console.log("API AI-Analysis Step 3: Khớp bài tập và sản phẩm...");
    const matchedExercises = await matchRehabExercises(
      aiResult.rehabilitation.exercise_tags,
      aiResult.rehabilitation.body_parts,
      aiResult.rehabilitation.difficulty
    );
    console.log("Số lượng bài tập khớp:", matchedExercises.length);

    const matchedProducts = await matchProducts(
      aiResult.shopping.recommended_categories,
      aiResult.shopping.product_tags
    );
    console.log("Số lượng sản phẩm khớp:", matchedProducts.length);

    // 4. Lưu thông tin hình ảnh đã tải lên vào cơ sở dữ liệu
    console.log("API AI-Analysis Step 4: Lưu uploaded_images...");
    const imageId = await saveUploadedImageRecord(
      user.id,
      image_path,
      file_name || "medical_record.png",
      file_size || 0,
      mime_type || "image/png"
    );
    console.log("ID ảnh đã lưu:", imageId);

    // 5. Lưu thông tin bản ghi phân tích cấu trúc vào cơ sở dữ liệu
    console.log("API AI-Analysis Step 5: Lưu analysis_records...");
    const recordId = await saveAnalysisRecord(user.id, imageId, aiResult);
    console.log("ID bản ghi phân tích:", recordId);
    console.log("=== API AI-Analysis: HOÀN THÀNH ===");

    return NextResponse.json({
      success: true,
      record_id: recordId,
      data: aiResult,
      matched_exercises: matchedExercises,
      matched_products: matchedProducts
    });

  } catch (error: any) {
    console.error("Lỗi nghiêm trọng trong API Route Handler phân tích bệnh án:", error);
    
    let errorMessage = "Đã xảy ra lỗi không xác định khi phân tích bệnh án.";
    let status = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes("API Key") || error.message.includes("OpenRouter")) {
        status = 502; // Bad Gateway
      } else if (error.message.includes("cấu trúc JSON") || error instanceof SyntaxError) {
        status = 422; // Unprocessable Entity
      }
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
