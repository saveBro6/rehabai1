import Link from "next/link";
import Image from "next/image";
import { Clock, Dumbbell, Heart, Lock, PlayCircle, Repeat2 } from "lucide-react";

import { clsx, getImageUrl } from "@/lib/utils";
import { getExerciseDifficultyLabel } from "@/services/exercises.service";
import type { PublicExerciseMetadata } from "@/types";

const difficultyBadgeClass: Record<string, string> = {
  "Cơ bản": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Trung cấp": "border-amber-200 bg-amber-50 text-amber-700",
  "Nâng cao": "border-rose-200 bg-rose-50 text-rose-700"
};

export function ExerciseCard({
  exercise,
  isAuthenticated,
  isLocked = false,
  lockLabel
}: {
  exercise: PublicExerciseMetadata;
  isAuthenticated?: boolean;
  isLocked?: boolean;
  lockLabel?: string;
}) {
  const guideHref = `/patient/exercises/${exercise.slug || exercise.id}`;
  const difficulty = getExerciseDifficultyLabel(exercise.difficulty);
  const duration = exercise.duration_minutes || 0;
  const sets = exercise.sets || 1;
  const reps = exercise.repetitions || 0;

  return (
    <Link
      href={guideHref}
      className="group block h-full rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-emerald-100/80 bg-white shadow-sm shadow-emerald-950/5 transition duration-200 group-hover:-translate-y-1 group-hover:border-emerald-200 group-hover:shadow-xl group-hover:shadow-emerald-950/10">
        <div className="relative aspect-video overflow-hidden bg-emerald-50">
          <Image
            src={getImageUrl(exercise.image_url)}
            alt={exercise.title}
            width={800}
            height={450}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
            <span
              className={clsx(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black shadow-sm backdrop-blur",
                difficultyBadgeClass[difficulty] || "border-slate-200 bg-white/90 text-slate-700"
              )}
            >
              {difficulty}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-white/80 text-slate-500 shadow-sm backdrop-blur transition group-hover:text-rose-500">
              <Heart className="h-4 w-4" />
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent p-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
              <PlayCircle className="h-3.5 w-3.5" />
              {duration ? `${duration}:00` : "Video"}
            </span>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-black text-amber-950 shadow-sm">
                <Lock className="h-3.5 w-3.5" />
                {lockLabel || (isAuthenticated ? "Cần nâng gói" : "Đăng nhập")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{exercise.body_region}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{exercise.category}</span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-lg font-black leading-snug text-slate-950">{exercise.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{exercise.description}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              {duration || "?"} phút
            </span>
            <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-1.5">
              <Dumbbell className="h-3.5 w-3.5 text-emerald-600" />
              {sets} hiệp
            </span>
            <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-1.5">
              <Repeat2 className="h-3.5 w-3.5 text-emerald-600" />
              {reps || "Theo sức"}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
