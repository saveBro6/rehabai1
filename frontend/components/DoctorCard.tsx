import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getProtectedHref } from "@/lib/auth-navigation";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import type { Doctor } from "@/types";

export function DoctorCard({ doctor, isAuthenticated = false }: { doctor: Doctor; isAuthenticated?: boolean }) {
  const detailHref = getProtectedHref(isAuthenticated, `/doctors/${doctor.id}`);
  const appointmentHref = getProtectedHref(isAuthenticated, "/appointments");

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <Image
        src={getImageUrl(doctor.avatar_url)}
        alt={doctor.full_name}
        width={800}
        height={520}
        className="h-48 w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-semibold text-emerald-700">{doctor.specialty}</p>
        <h3 className="mt-1 text-lg font-bold text-slate-950">{doctor.full_name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{doctor.bio}</p>
        
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>{doctor.experience_years} năm kinh nghiệm</span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {doctor.rating}
          </span>
        </div>
        
        <p className="mt-3 font-semibold text-slate-900">{formatCurrency(doctor.consultation_fee)}</p>
        
        <div className="mt-auto pt-4">
          <Link href={detailHref} className="block w-full">
            <Button className="w-full">Xem hồ sơ chi tiết</Button>
          </Link>
        </div>
      </div>
    </Card>

  );
}
