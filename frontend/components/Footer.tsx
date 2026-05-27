import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <p className="text-lg font-bold">RehabAI</p>
          <p className="mt-3 text-sm text-slate-300">Nền tảng hỗ trợ phục hồi có định hướng, kết nối người bệnh với bài tập, lộ trình, theo dõi tiến trình và chuyên gia phù hợp.</p>
        </div>
        <div>
          <p className="font-semibold">Liên hệ</p>
          <p className="mt-3 text-sm text-slate-300">support@rehabai.vn</p>
          <p className="text-sm text-slate-300">1900 1234</p>
        </div>
        <div>
          <p className="font-semibold">Chính sách</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <Link href="#">Bảo mật dữ liệu</Link>
            <Link href="#">Điều khoản sử dụng</Link>
            <Link href="#">Thông tin y tế hỗ trợ</Link>
          </div>
        </div>
        <div>
          <p className="font-semibold">Social</p>
          <p className="mt-3 text-sm text-slate-300">Facebook · LinkedIn · YouTube</p>
        </div>
      </div>
    </footer>
  );
}
