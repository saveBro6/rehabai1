"use client";

import { useEffect, useState } from "react";

import { ExerciseDetail } from "@/components/exercises/ExerciseDetail";
import { useAuth } from "@/hooks/useAuth";
import { getExerciseById, getExercises, getExerciseVideoAccess } from "@/services/exercises.service";
import type { ExerciseVideoAccess, PublicExerciseMetadata } from "@/types";

function ExerciseDetailContent({ id }: { id: string }) {
  const { isAuthenticated, isLoading: authLoading, profile } = useAuth();
  const [exercise, setExercise] = useState<PublicExerciseMetadata | null>(null);
  const [relatedExercises, setRelatedExercises] = useState<PublicExerciseMetadata[]>([]);
  const [videoAccess, setVideoAccess] = useState<ExerciseVideoAccess | null>(null);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [loadingVideoAccess, setLoadingVideoAccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    setLoadingExercise(true);
    setError("");
    void getExerciseById(id)
      .then((row) => {
        if (!active) return;
        setExercise(row);
        if (!row) {
          setRelatedExercises([]);
          return;
        }

        void getExercises({ body_region: row.body_region })
          .then((rows) => {
            if (!active) return;
            const related = rows.filter((item) => item.id !== row.id).slice(0, 4);
            if (related.length) {
              setRelatedExercises(related);
              return;
            }

            void getExercises({ category: row.category }).then((categoryRows) => {
              if (active) setRelatedExercises(categoryRows.filter((item) => item.id !== row.id).slice(0, 4));
            });
          })
          .catch(() => {
            if (active) setRelatedExercises([]);
          });
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải bài tập.");
      })
      .finally(() => {
        if (active) setLoadingExercise(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    if (authLoading || !exercise) return () => {
      active = false;
    };

    if (!isAuthenticated) {
      setVideoAccess(null);
      setLoadingVideoAccess(false);
      return () => {
        active = false;
      };
    }

    setLoadingVideoAccess(true);
    void getExerciseVideoAccess(exercise.id)
      .then((access) => {
        if (active) setVideoAccess(access);
      })
      .catch((accessError) => {
        if (!active) return;
        setVideoAccess({
          exercise_id: exercise.id,
          access_level: "metadata_only",
          video_url: null,
          message: accessError instanceof Error ? accessError.message : "Không thể kiểm tra quyền xem video."
        });
      })
      .finally(() => {
        if (active) setLoadingVideoAccess(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, exercise, isAuthenticated]);

  if (loadingExercise) {
    return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải bài tập...</section>;
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</div>
      </section>
    );
  }

  if (!exercise) {
    return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Không tìm thấy bài tập.</section>;
  }

  return (
    <ExerciseDetail
      exercise={exercise}
      isAuthenticated={isAuthenticated}
      accountType={profile?.account_type || null}
      videoAccess={videoAccess}
      videoAccessLoading={authLoading || loadingVideoAccess}
      relatedExercises={relatedExercises}
    />
  );
}

export default function ExerciseDetailPage({ params }: { params: { id: string } }) {
  return <ExerciseDetailContent id={params.id} />;
}
