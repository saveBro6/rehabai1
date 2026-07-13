"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, ShieldCheck, Tag, Play } from "lucide-react";
import { getImageUrl } from "@/lib/utils";
import { getExerciseDifficultyLabel } from "@/services/exercises.service";
import type { MatchedExercise } from "../../types";

interface ExerciseCardProps {
  exercise: MatchedExercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const imageUrl = getImageUrl(exercise.image_url);
  const difficultyLabel = getExerciseDifficultyLabel(exercise.difficulty);

  return (
    <article className="overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-emerald-50">
        <Image
          src={imageUrl}
          alt={exercise.title}
          width={400}
          height={250}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-black text-white backdrop-blur">
          <Clock className="h-3 w-3" />
          {exercise.duration_minutes ? `${exercise.duration_minutes} phút` : "Theo hướng dẫn"}
        </span>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <Tag className="h-3 w-3" />
            {exercise.body_region}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
            <ShieldCheck className="h-3 w-3" />
            {difficultyLabel}
          </span>
        </div>

        <h3 className="line-clamp-1 text-lg font-black text-slate-900 group-hover:text-emerald-700">
          {exercise.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {exercise.description}
        </p>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <Link
            href={`/patient/exercises/${exercise.slug || exercise.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            <Play className="h-4 w-4 fill-current" />
            Xem bài tập chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}
