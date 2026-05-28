"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";

export default function RegisterPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  
  const [form, setForm] = useState({ 
    full_name: "", 
    email: "", 
    phone: "", 
    password: "", 
    confirm_password: "" 
  });
  
  const [loading, setLoading] = useState(false);
  
  // Trạng thái ẩn/hiện cho từng ô mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    
    // Kiểm tra định dạng cơ bản
    if (!form.full_name || !form.email.includes("@") || form.password.length < 6) {
      pushToast("Thông tin chưa hợp lệ.", "Vui lòng nhập họ tên, email và mật khẩu ít nhất 6 ký tự.");
      return;
    }

    // Kiểm tra mật khẩu nhập lại có trùng khớp không
    if (form.password !== form.confirm_password) {
      pushToast("Mật khẩu không khớp.", "Vui lòng xác nhận lại mật khẩu chính xác.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể đăng ký", getSupabaseConfigError());
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          phone: form.phone
        }
      }
    });

    if (error) {
      setLoading(false);
      pushToast("Đăng ký thất bại", error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      pushToast("Vui lòng xác nhận email", "Tài khoản đã được tạo. Hãy kiểm tra email để hoàn tất đăng ký.");
      return;
    }

    pushToast("Đăng ký thành công!", "Đang chuyển đến dashboard.");
    router.push("/patient/dashboard");
  }

  return (
    <section className="mx-auto grid min-h-[80vh] max-w-lg content-center px-4 py-16">
      <Card className="border border-emerald-100 p-6 shadow-md">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Đăng ký tài khoản</h1>
        <p className="text-sm text-slate-500 mt-1">Điền thông tin của bạn để tạo tài khoản mới.</p>
        
        <form onSubmit={submit} className="mt-6 grid gap-4">
          
          <div className="grid gap-1.5">
            <label htmlFor="full_name" className="text-sm font-medium text-slate-700">Họ và tên</label>
            <input 
              id="full_name" 
              type="text"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" 
              placeholder="Nhập họ và tên của bạn" 
              value={form.full_name} 
              onChange={(event) => setForm({ ...form, full_name: event.target.value })} 
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">Số điện thoại</label>
            <input 
              id="phone" 
              type="tel"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" 
              placeholder="Nhập số điện thoại" 
              value={form.phone} 
              onChange={(event) => setForm({ ...form, phone: event.target.value })} 
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
            <input 
              id="email" 
              type="email"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" 
              placeholder="Nhập email của bạn" 
              value={form.email} 
              onChange={(event) => setForm({ ...form, email: event.target.value })} 
            />
          </div>

          {/* Mật khẩu */}
          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">Mật khẩu</label>
            <div className="relative">
              <input 
                id="password" 
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" 
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)" 
                value={form.password} 
                onChange={(event) => setForm({ ...form, password: event.target.value })} 
              />
              <button
                type="button"
                tabIndex={-1} // Bỏ qua khi người dùng nhấn Tab để điền form nhanh
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Nhập lại mật khẩu */}
          <div className="grid gap-1.5">
            <label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">Nhập lại mật khẩu</label>
            <div className="relative">
              <input 
                id="confirm_password" 
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" 
                placeholder="Xác nhận lại mật khẩu" 
                value={form.confirm_password} 
                onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} 
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 justify-center">
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
