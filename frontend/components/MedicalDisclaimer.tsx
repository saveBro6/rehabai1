import { AlertTriangle } from "lucide-react";

export function MedicalDisclaimer({ detail = false }: { detail?: boolean }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
        <div>
          <p>
            Thong tin va bai tap tren RehabAI chi mang tinh ho tro tham khao, khong thay the tu van, chan doan hoac dieu tri tu bac si/chuyen gia y te. Hay tham khao y kien chuyen gia truoc khi bat dau lo trinh tap luyen, dac biet neu ban dang phuc hoi sau dot quy, chan thuong nang hoac phau thuat.
          </p>
          {detail ? <p className="mt-2 font-semibold">Dung tap ngay neu ban cam thay dau du doi, chong mat, kho tho, te yeu bat thuong hoac mat thang bang nghiem trong.</p> : null}
        </div>
      </div>
    </div>
  );
}
