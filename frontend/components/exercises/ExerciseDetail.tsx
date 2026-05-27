"use client";

import Image from "next/image";
import { BookmarkPlus, CheckCircle2, Clock, Repeat } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { hasPlanAccess } from "@/lib/subscription-access";
import { useToast } from "@/hooks/useToast";
import { createExerciseLog } from "@/services/progress.service";
import type { Exercise } from "@/types";

export function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const { pushToast } = useToast();
  const { user } = useAuth();
  const { planName } = useSubscriptionAccess();
  const canLogProgress = hasPlanAccess(planName, "Premium");

  async function markComplete() {
    if (!canLogProgress) {
      pushToast("Tính năng bị khóa", "Hãy mua gói Premium để ghi nhận tiến trình bài tập.");
      return;
    }

    if (!user) return;

    await createExerciseLog({
      user_id: user.id,
      exercise_id: exercise.id,
      recovery_plan_id: null,
      pain_level: 2,
      fatigue_level: 3,
      mobility_score: 70,
      notes: `Hoàn thành bài tập ${exercise.title}`
    });
    pushToast("Đã ghi nhận hoàn thành", "Bài tập đã được thêm vào tiến trình.");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <Image
          src={exercise.image_url || "/images/placeholders/rehab-equipment.jpg"}
          alt={exercise.title}
          width={1000}
          height={560}
          className="h-80 w-full rounded-lg object-cover"
        />
        <div className="mt-6"><MedicalDisclaimer detail /></div>
        <h1 className="mt-6 text-3xl font-bold text-slate-950">{exercise.title}</h1>
        <p className="mt-3 text-slate-600">{exercise.description}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card><Clock className="h-5 w-5 text-emerald-600" /><p className="mt-3 font-bold">{exercise.duration_minutes || 0} phút</p><p className="text-sm text-slate-600">Thời lượng</p></Card>
          <Card><Repeat className="h-5 w-5 text-emerald-600" /><p className="mt-3 font-bold">{exercise.repetitions || 0} lần</p><p className="text-sm text-slate-600">Mỗi hiệp</p></Card>
          <Card><CheckCircle2 className="h-5 w-5 text-emerald-600" /><p className="mt-3 font-bold">{exercise.sets || 0} hiệp</p><p className="text-sm text-slate-600">Gợi ý</p></Card>
        </div>
        <Card className="mt-6">
          <h2 className="text-xl font-bold">Hướng dẫn thực hiện</h2>
          <ol className="mt-4 grid gap-3 text-sm text-slate-700">
            {exercise.instructions.map((item, index) => <li key={item} className="flex gap-3"><span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{index + 1}</span>{item}</li>)}
          </ol>
        </Card>
        <Card className="mt-6">
          <h2 className="text-xl font-bold">Lưu ý an toàn</h2>
          <ul className="mt-4 grid gap-2 text-sm text-slate-700">
            {(exercise.precautions || []).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </Card>
      </div>
      <Card className="h-fit">
        <p className="text-sm font-semibold text-emerald-700">{exercise.category}</p>
        <h2 className="mt-2 text-xl font-bold">Lưu vào lộ trình</h2>
        <p className="mt-3 text-sm text-slate-600">Bạn có thể đánh dấu bài tập hoàn thành hoặc thêm vào lộ trình cá nhân khi tạo kế hoạch.</p>
        <Button className="mt-5 w-full" onClick={markComplete}><CheckCircle2 className="mr-2 h-4 w-4" /> Đã hoàn thành</Button>
        <Button variant="secondary" className="mt-3 w-full" onClick={() => pushToast("Đã lưu bài tập", "Tính năng lưu yêu thích đang được mô phỏng")}><BookmarkPlus className="mr-2 h-4 w-4" /> Lưu bài tập</Button>
      </Card>
    </div>
  );
}
