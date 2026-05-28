import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import fs from 'fs';
import path from 'path';
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// 1. Định vị đường dẫn tuyệt đối tới file system_prompt.md
const filePath = path.join(process.cwd(), 'app/patient/api/prompts/system_prompt.md');

// 2. Đọc nội dung file trực tiếp từ Server (Đảm bảo mã hóa utf-8)
const systemPrompt = fs.readFileSync(filePath, 'utf-8');
// const systemPrompt = `
// Bạn là RehabAI Assistant, hỗ trợ người dùng bằng tiếng Việt.
// Phạm vi trả lời: gói đăng ký, thư viện bài tập, lộ trình phục hồi, theo dõi tiến trình, đặt lịch online, sản phẩm phục hồi và hướng dẫn sử dụng RehabAI.
// Không chẩn đoán bệnh, không kê đơn thuốc, không thay thế tư vấn y khoa chuyên môn.
// Nếu người dùng mô tả dấu hiệu nghiêm trọng như yếu liệt đột ngột, khó thở, đau ngực, rối loạn ý thức, đột quỵ, ngất hoặc méo miệng, hãy khuyên họ gọi cấp cứu hoặc đến cơ sở y tế gần nhất ngay.
// Trả lời ngắn gọn, rõ ràng, thực tế; dùng markdown khi cần danh sách.
// `.trim();

function getOpenRouterModel() {
  const models = process.env.OPENROUTER_MODELS?.split(",").map((model) => model.trim()).filter(Boolean);
  return models?.[0] ?? "openrouter/free";
}

function toPrompt(messages: ChatMessage[]) {
  return messages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "Người dùng" : "Assistant"}: ${message.content}`)
    .join("\n\n");
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response("Missing OPENROUTER_API_KEY", { status: 500 });
  }

  const body = (await request.json()) as { messages?: ChatMessage[]; message?: string };
  const messages = Array.isArray(body.messages) ? body.messages.filter((message) => message.content.trim()) : [];
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? body.message?.trim();

  if (!lastUserMessage) {
    return new Response("Message is required", { status: 400 });
  }

  const openrouter = createOpenRouter({ apiKey });
  const result = streamText({
    model: openrouter(getOpenRouterModel()),
    system: systemPrompt,
    prompt: messages.length > 0 ? toPrompt(messages) : lastUserMessage
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";

      try {
        for await (const chunk of result.textStream) {
          reply += chunk;
          controller.enqueue(encoder.encode(chunk));
        }

        const { error: saveError } = await supabase.from("chatbot_messages").insert({ user_id: user.id, message: lastUserMessage, reply });
        if (saveError) {
          console.error("Failed to save chatbot message", saveError);
        }
        controller.close();
      } catch (error) {
        console.error("OpenRouter chatbot stream failed", error);
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
