import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

const footerGroups = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Bài tập", href: "/patient/exercises" },
      { label: "Lộ trình phục hồi", href: "/patient/recovery-plan" },
      { label: "Sản phẩm hỗ trợ", href: "/patient/products" },
      { label: "Bảng giá", href: "/patient/pricing" }
    ]
  },
  {
    title: "Công ty",
    links: [
      { label: "Về chúng tôi", href: "/#about" },
      { label: "Tin tức", href: "#" },
      { label: "Tuyển dụng", href: "#" }
    ]
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Trung tâm trợ giúp", href: "#" },
      { label: "Hướng dẫn sử dụng", href: "#" },
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Điều khoản dịch vụ", href: "#" }
    ]
  }
];

export function Footer() {
  return (
    <footer className="border-t border-emerald-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.25fr_repeat(4,1fr)]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-black text-emerald-700">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">R</span>
            RehabAI
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
            Nền tảng phục hồi chức năng thông minh, đồng hành cùng bạn phục hồi khỏe mạnh mỗi ngày.
          </p>
          <div className="mt-5 flex gap-2">
            {["f", "▶", "♪", "in"].map((label) => (
              <span key={label} className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                {label}
              </span>
            ))}
          </div>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <p className="font-black text-slate-900">{group.title}</p>
            <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-500">
              {group.links.map((link) => (
                <Link key={`${group.title}-${link.label}`} href={link.href} className="transition hover:text-emerald-700">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="font-black text-slate-900">Liên hệ</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              1900 1234
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-600" />
              support@rehabai.vn
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              TP. HCM
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-emerald-50 py-4 text-center text-xs font-semibold text-slate-400">
        © 2026 RehabAI. All rights reserved.
      </div>
    </footer>
  );
}
