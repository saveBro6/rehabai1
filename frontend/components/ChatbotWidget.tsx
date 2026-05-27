"use client";

import { FormEvent, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { getChatbotReply } from "@/services/chatbot.service";
import { clsx } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function MessageContent({ message }: { message: Message }) {
  if (message.role === "user") return <>{message.content}</>;

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ children }) => <code className="rounded bg-slate-200 px-1 py-0.5 text-[0.85em] text-slate-900">{children}</code>,
        pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-white last:mb-0">{children}</pre>
      }}
    >
      {message.content}
    </ReactMarkdown>
  );
}

const prompts = [
  "Tôi nên bắt đầu với bài tập nào?",
  "Làm sao để tạo lộ trình phục hồi?",
  "Tôi có thể theo dõi tiến trình phục hồi như thế nào?",
  "Standard khác Premium ở điểm nào?",
  "Tôi bị đau khi tập thì nên làm gì?"
];

export function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Tôi là RehabAI Assistant. Tôi có thể hỗ trợ thông tin về gói đăng ký, thư viện bài tập, lộ trình phục hồi, theo dõi tiến trình, đặt lịch online và sản phẩm."
    }
  ]);

  async function send(message: string) {
    if (!message.trim()) return;
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    const reply = await getChatbotReply(message, user?.id);
    setMessages((current) => [...current, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  if (!open) {
    return (
      <button
        className="fixed bottom-4 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-soft transition hover:bg-emerald-700"
        onClick={() => setOpen(true)}
        aria-label="Mở chatbot"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
      <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end">
        <div
          className="mb-3 flex h-[560px] w-[min(380px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft transition-all duration-300 ease-out"
        >
          <div className="flex items-center justify-between bg-emerald-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5" /> RehabAI Assistant</div>
            <button onClick={() => setOpen(false)} aria-label="Dong chat"><X className="h-5 w-5" /></button>
          </div>
          <div className="border-b border-slate-100 bg-emerald-50 px-4 py-3 text-xs text-slate-600">
            Thông tin từ Chatbot chỉ mang tính chất hỗ trợ và tham khảo. Không thay thế tư vấn của bác sĩ chuyên khoa. Với dấu hiệu nghiêm trọng, hoặc cơ sở y tế gần nhất!
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={clsx("rounded-lg px-3 py-2 text-sm", message.role === "user" ? "ml-8 bg-emerald-500 text-white" : "mr-8 bg-slate-100 text-slate-700")}>
                <MessageContent message={message} />
              </div>
            ))}
            {loading ? <div className="mr-8 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">Đang trả lời...</div> : null}
          </div>
          <div className="grid gap-2 border-t border-slate-100 p-3">
            <div className="flex gap-2 overflow-x-auto">
              {prompts.map((prompt) => <button key={prompt} className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700" onClick={() => void send(prompt)}>{prompt}</button>)}
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <input className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Nhập câu hỏi..." />
              <Button aria-label="Gui"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>

        <button 
          className="grid h-14 w-14 origin-center scale-0 place-items-center rounded-full bg-emerald-500 text-white opacity-0 shadow-soft transition-all duration-200 ease-out hover:bg-emerald-700"
          tabIndex={-1}
          aria-hidden="true"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>

  );
}
