"use client";

import Image from "next/image";
import Link from "next/link";
import { BookmarkPlus, CheckCircle2, Clock, Lock, PlayCircle, Repeat } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { hasPlanAccess } from "@/lib/subscription-access";
import { getImageUrl } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { getExerciseDifficultyLabel } from "@/services/exercises.service";
import { createExerciseLog } from "@/services/progress.service";
import type { Account, ExerciseVideoAccess, PublicExerciseMetadata } from "@/types";

function getYoutubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function ExerciseVideoPanel({
  isAuthenticated,
  accountType,
  videoAccess,
  videoAccessLoading
}: {
  isAuthenticated: boolean;
  accountType?: Account["account_type"] | null;
  videoAccess: ExerciseVideoAccess | null;
  videoAccessLoading: boolean;
}) {
  if (videoAccessLoading) {
    return (
      <Card className="mt-6 border-emerald-100 bg-emerald-50">
        <p className="text-sm font-semibold text-emerald-700">Đang kiểm tra quyền xem video...</p>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="mt-6 border-amber-100 bg-amber-50">
        <div className="flex gap-3">
          <Lock className="mt-1 h-5 w-5 flex-none text-amber-700" />
          <div>
            <h2 className="text-lg font-bold text-amber-950">Đăng nhập để xem video hướng dẫn.</h2>
            <p className="mt-2 text-sm text-amber-900">
              Khách chỉ xem metadata bài tập công khai. Video hướng dẫn không được tải hoặc gửi URL khi chưa đăng nhập.
            </p>
            <Link href="/login" className="mt-4 inline-flex">
              <Button>Đăng nhập</Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  if (videoAccess?.access_level === "full" && videoAccess.video_url) {
    const embedUrl = getYoutubeEmbedUrl(videoAccess.video_url);

    return (
      <Card className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-950">Video hướng dẫn</h2>
        </div>
        {embedUrl ? (
          <iframe
            className="aspect-video w-full rounded-lg border border-slate-200"
            src={embedUrl}
            title="Video hướng dẫn bài tập"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video className="aspect-video w-full rounded-lg bg-slate-950" controls src={videoAccess.video_url}>
            Trình duyệt của bạn không hỗ trợ phát video.
          </video>
        )}
        <p className="mt-3 text-sm text-slate-600">{videoAccess.message}</p>
      </Card>
    );
  }

  if (videoAccess?.access_level === "full" && !videoAccess.video_url) {
    return (
      <Card className="mt-6 border-slate-200 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-950">Bài tập này chưa có video hướng dẫn.</h2>
        <p className="mt-2 text-sm text-slate-600">Bạn vẫn có thể xem metadata và hướng dẫn văn bản của bài tập.</p>
      </Card>
    );
  }

  if (accountType === "doctor" || videoAccess?.access_level === "metadata_only") {
    return (
      <Card className="mt-6 border-slate-200 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-950">Tài khoản này không có quyền xem video bài tập trong MVP.</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tài khoản không thuộc luồng Patient chỉ xem metadata công khai của Exercise Library. Không có URL video nào được trả về cho tài khoản này.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-amber-100 bg-amber-50">
      <div className="flex gap-3">
        <Lock className="mt-1 h-5 w-5 flex-none text-amber-700" />
        <div>
          <h2 className="text-lg font-bold text-amber-950">{videoAccess?.message || "Đăng ký gói để xem video."}</h2>
          <p className="mt-2 text-sm text-amber-900">
            Quyền xem video được mở theo cấp độ bài tập và gói đăng ký: Basic xem cấp cơ bản, Standard thêm cấp trung bình,
            Premium xem tất cả.
          </p>
          <Link href="/patient/pricing" className="mt-4 inline-flex">
            <Button>Nâng cấp gói</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function ExerciseDetail({
  exercise,
  isAuthenticated,
  accountType,
  videoAccess,
  videoAccessLoading
}: {
  exercise: PublicExerciseMetadata;
  isAuthenticated: boolean;
  accountType?: Account["account_type"] | null;
  videoAccess: ExerciseVideoAccess | null;
  videoAccessLoading: boolean;
}) {
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
          src={getImageUrl(exercise.image_url)}
          alt={exercise.title}
          width={1000}
          height={560}
          className="h-80 w-full rounded-lg object-cover"
        />
        <h1 className="mt-6 text-3xl font-bold text-slate-950">{exercise.title}</h1>
        <p className="mt-3 text-slate-600">{exercise.description}</p>

        <ExerciseVideoPanel
          isAuthenticated={isAuthenticated}
          accountType={accountType}
          videoAccess={videoAccess}
          videoAccessLoading={videoAccessLoading}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <Clock className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 font-bold">{exercise.duration_minutes || 0} phút</p>
            <p className="text-sm text-slate-600">Thời lượng</p>
          </Card>
          <Card>
            <Repeat className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 font-bold">{exercise.repetitions || 0} lần</p>
            <p className="text-sm text-slate-600">Mỗi hiệp</p>
          </Card>
          <Card>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="mt-3 font-bold">{exercise.sets || 0} hiệp</p>
            <p className="text-sm text-slate-600">Gợi ý</p>
          </Card>
        </div>
        <Card className="mt-6">
          <h2 className="text-xl font-bold">Hướng dẫn thực hiện</h2>
          <ol className="mt-4 grid gap-3 text-sm text-slate-700">
            {exercise.instructions.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="mt-6">
          <h2 className="text-xl font-bold">Lưu ý an toàn</h2>
          <ul className="mt-4 grid gap-2 text-sm text-slate-700">
            {(exercise.precautions || []).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="h-fit">
        <p className="text-sm font-semibold text-emerald-700">{exercise.category}</p>
        <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          {getExerciseDifficultyLabel(exercise.difficulty)}
        </p>
        <h2 className="mt-4 text-xl font-bold">Lưu vào lộ trình</h2>
        <p className="mt-3 text-sm text-slate-600">
          Bạn có thể đánh dấu bài tập hoàn thành hoặc thêm vào lộ trình cá nhân khi tạo kế hoạch.
        </p>
        <Button className="mt-5 w-full" onClick={markComplete}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> Đã hoàn thành
        </Button>
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => pushToast("Đã lưu bài tập", "Tính năng lưu yêu thích đang được mô phỏng")}
        >
          <BookmarkPlus className="mr-2 h-4 w-4" /> Lưu bài tập
        </Button>
      </Card>
    </div>
  );
}
