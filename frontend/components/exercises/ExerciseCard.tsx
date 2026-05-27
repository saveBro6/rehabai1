import Link from "next/link";
import Image from "next/image";
import { Clock, Dumbbell } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getProtectedHref } from "@/lib/auth-navigation";
import { getImageUrl } from "@/lib/utils";
import type { Exercise } from "@/types";

export function ExerciseCard({ exercise, isAuthenticated = false }: { exercise: Exercise; isAuthenticated?: boolean }) {
  const guideHref = getProtectedHref(isAuthenticated, `/exercises/${exercise.id}`);

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <Image
        src={getImageUrl(exercise.image_url)}
        alt={exercise.title}
        width={800}
        height={520}
        className="h-44 w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{exercise.category}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{exercise.difficulty}</span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-slate-950">{exercise.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{exercise.description}</p>
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{exercise.duration_minutes || 0} phut</span>
          <span className="inline-flex items-center gap-1"><Dumbbell className="h-4 w-4" />{exercise.sets || 1} hiep</span>
        </div>
        <Link href={guideHref} className="mt-auto pt-5">
          <Button variant="secondary" className="w-full">Xem hướng dẫn</Button>
        </Link>
      </div>
    </Card>
  );
}
