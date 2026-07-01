"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Heart,
  Info,
  Layers3,
  Lock,
  Play,
  Repeat,
  Route,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { hasPlanAccess } from "@/lib/subscription-access";
import { clsx, getImageUrl } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { getExerciseDifficultyLabel, getSavedExerciseStatus, toggleSavedExercise } from "@/services/exercises.service";
import { createExerciseLog } from "@/services/progress.service";
import type { Account, ExerciseVideoAccess, PublicExerciseMetadata } from "@/types";

type DetailTab = "instructions" | "impact" | "benefits" | "safety";

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

function formatDuration(exercise: PublicExerciseMetadata) {
  if (!exercise.duration_minutes) return "Theo hướng dẫn";
  return `${exercise.duration_minutes} phút`;
}

function getUnlockCopy(difficulty: string) {
  const label = getExerciseDifficultyLabel(difficulty);
  if (label === "Cơ bản") return "Gói Basic trở lên mở khóa video bài tập cơ bản.";
  if (label === "Trung cấp") return "Gói Standard hoặc Premium mở khóa video bài tập trung cấp.";
  if (label === "Nâng cao") return "Gói Premium mở khóa video bài tập nâng cao.";
  return "Nâng cấp gói phù hợp để xem video hướng dẫn đầy đủ.";
}

function MetadataBadge({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm">
      <Icon className="h-4 w-4 text-emerald-600" />
      {label}
    </span>
  );
}

function ExerciseMedia({
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
  const imageUrl = getImageUrl(exercise.image_url);
  const hasFullVideo = videoAccess?.access_level === "full" && Boolean(videoAccess.video_url);
  const embedUrl = hasFullVideo && videoAccess?.video_url ? getYoutubeEmbedUrl(videoAccess.video_url) : null;

  if (videoAccessLoading) {
    return (
      <div className="grid aspect-video place-items-center rounded-[24px] border border-emerald-100 bg-emerald-50 text-sm font-bold text-emerald-700">
        Đang kiểm tra quyền xem video...
      </div>
    );
  }

  if (hasFullVideo && videoAccess?.video_url) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950 shadow-xl shadow-slate-950/10">
        {embedUrl ? (
          <iframe
            className="aspect-video w-full"
            src={embedUrl}
            title="Video hướng dẫn bài tập"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video className="aspect-video w-full bg-slate-950" controls src={videoAccess.video_url}>
            Trình duyệt của bạn không hỗ trợ phát video.
          </video>
        )}
      </div>
    );
  }

  const lockedTitle = !isAuthenticated
    ? "Đăng nhập để xem video hướng dẫn."
    : accountType !== "patient"
      ? "Tài khoản này chỉ xem metadata bài tập."
      : videoAccess?.message || "Video hướng dẫn đang bị khóa theo gói hiện tại.";

  return (
    <div className="relative aspect-video overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-xl shadow-slate-950/10">
      <Image src={imageUrl} alt={exercise.title} width={1100} height={620} className="h-full w-full object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
      <div className="absolute left-4 top-4 rounded-xl bg-slate-950/70 px-3 py-2 text-xs font-black text-white backdrop-blur">
        Xem trước
      </div>
      <div className="absolute inset-x-4 bottom-4 flex items-end justify-center text-center sm:inset-x-8 sm:bottom-8">
        <div className="w-full max-w-xl rounded-3xl border border-white/40 bg-white/95 p-4 shadow-2xl backdrop-blur sm:p-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-950 sm:text-xl">{lockedTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {!isAuthenticated ? "Khách chỉ xem thông tin bài tập công khai; RehabAI không gửi URL video khi chưa đăng nhập." : getUnlockCopy(exercise.difficulty)}
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href={isAuthenticated ? "/patient/pricing" : "/login"}>
              <Button className="w-full rounded-xl sm:w-auto">{isAuthenticated ? "Nâng cấp gói" : "Đăng nhập"}</Button>
            </Link>
            {isAuthenticated ? (
              <Link href="/patient/pricing" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
                Xem các gói
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function RelatedExerciseCard({ exercise }: { exercise: PublicExerciseMetadata }) {
  return (
    <Link href={`/patient/exercises/${exercise.slug || exercise.id}`} className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      <article className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-emerald-50">
          <Image
            src={getImageUrl(exercise.image_url)}
            alt={exercise.title}
            width={320}
            height={240}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        </div>
        <div className="p-3">
          <p className="line-clamp-1 text-sm font-black text-slate-950">{exercise.title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {exercise.duration_minutes || "?"} phút · {getExerciseDifficultyLabel(exercise.difficulty)}
          </p>
        </div>
      </article>
    </Link>
  );
}

export function ExerciseDetail({
  exercise,
  isAuthenticated,
  accountType,
  videoAccess,
  videoAccessLoading,
  relatedExercises = []
}: {
  exercise: PublicExerciseMetadata;
  isAuthenticated: boolean;
  accountType?: Account["account_type"] | null;
  videoAccess: ExerciseVideoAccess | null;
  videoAccessLoading: boolean;
  relatedExercises?: PublicExerciseMetadata[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { user } = useAuth();
  const { planName } = useSubscriptionAccess();
  const [activeTab, setActiveTab] = useState<DetailTab>("instructions");
  const [isSaved, setIsSaved] = useState(false);
  const [isSavedLoading, setIsSavedLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canLogProgress = hasPlanAccess(planName, "Premium");
  const canSaveExercise = isAuthenticated && accountType === "patient";
  const difficulty = getExerciseDifficultyLabel(exercise.difficulty);
  const safePrecautions = exercise.precautions?.length ? exercise.precautions : ["Tập chậm, không giật mạnh.", "Dừng lại nếu xuất hiện đau bất thường.", "Giữ tư thế ổn định và thở đều."];

  useEffect(() => {
    let active = true;

    setIsSaved(false);
    if (!canSaveExercise) return () => {
      active = false;
    };

    setIsSavedLoading(true);
    void getSavedExerciseStatus(exercise.id)
      .then((saved) => {
        if (active) setIsSaved(saved);
      })
      .catch(() => {
        if (active) pushToast("Không thể tải trạng thái lưu", "Vui lòng thử lại sau.");
      })
      .finally(() => {
        if (active) setIsSavedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canSaveExercise, exercise.id, pushToast]);

  async function toggleSave() {
    if (!isAuthenticated) {
      pushToast("Vui lòng đăng nhập", "Đăng nhập bằng tài khoản Patient để lưu bài tập.");
      router.push("/login");
      return;
    }

    if (accountType !== "patient") {
      pushToast("Chỉ Patient có thể lưu bài tập", "Tính năng này chỉ dành cho tài khoản Patient.");
      return;
    }

    setIsSaving(true);
    try {
      const nextSaved = await toggleSavedExercise(exercise.id);
      setIsSaved(nextSaved);
      pushToast(nextSaved ? "Đã lưu bài tập" : "Đã bỏ lưu bài tập");
    } catch (error) {
      pushToast(
        "Không thể cập nhật bài tập đã lưu",
        error instanceof Error ? error.message : "Vui lòng thử lại sau."
      );
    } finally {
      setIsSaving(false);
    }
  }

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

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: "instructions", label: "Hướng dẫn" },
    { id: "impact", label: "Cơ tác động" },
    { id: "benefits", label: "Lợi ích" },
    { id: "safety", label: "Lưu ý an toàn" }
  ];

  return (
    <div className="bg-slate-50/60">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-6">
        <main className="min-w-0">
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <Link href="/patient/exercises" className="hover:text-emerald-700">
              Bài tập
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>{exercise.body_region || exercise.category}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-800">{exercise.title}</span>
          </nav>

          <div className="mt-7">
            <div>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-700">
                {exercise.body_region || exercise.category}
              </span>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{exercise.title}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{exercise.description}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <MetadataBadge icon={ShieldCheck} label={difficulty} />
            <MetadataBadge icon={Clock} label={formatDuration(exercise)} />
            <MetadataBadge icon={Dumbbell} label={exercise.category || "Bài tập phục hồi"} />
            <MetadataBadge icon={Target} label={exercise.body_region || "Toàn thân"} />
          </div>

          <div className="mt-7">
            <ExerciseMedia
              exercise={exercise}
              isAuthenticated={isAuthenticated}
              accountType={accountType}
              videoAccess={videoAccess}
              videoAccessLoading={videoAccessLoading}
            />
          </div>

          <div className="mt-7 overflow-x-auto border-b border-slate-200">
            <div className="flex min-w-max gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={clsx(
                    "border-b-2 px-1 pb-3 text-sm font-black transition",
                    activeTab === tab.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-900"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <Card className="mt-0 rounded-b-[24px] rounded-t-none border-t-0 border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
            {activeTab === "instructions" ? (
              <div>
                <h2 className="text-xl font-black text-slate-950">Các bước thực hiện</h2>
                {exercise.instructions.length > 0 ? (
                  <ol className="mt-5 grid gap-4 text-sm leading-7 text-slate-700">
                    {exercise.instructions.map((item, index) => (
                      <li key={`${index}-${item}`} className="flex gap-3">
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                          {index + 1}
                        </span>
                        <span className="pt-1">{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    Chưa có hướng dẫn chi tiết cho bài tập này.
                  </p>
                )}
                <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-emerald-900">
                    <Sparkles className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                    Mẹo tập đúng: giữ vai thả lỏng, tập chậm và không cố vượt quá biên độ thoải mái.
                  </p>
                </div>
              </div>
            ) : null}

            {activeTab === "impact" ? (
              <div>
                <h2 className="text-xl font-black text-slate-950">Cơ tác động</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Bài tập tập trung vào vùng <strong>{exercise.body_region || "cơ thể liên quan"}</strong> và nhóm chuyển động thuộc danh mục{" "}
                  <strong>{exercise.category || "phục hồi chức năng"}</strong>.
                </p>
              </div>
            ) : null}

            {activeTab === "benefits" ? (
              <div>
                <h2 className="text-xl font-black text-slate-950">Lợi ích</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {exercise.description || "Bài tập hỗ trợ duy trì thói quen vận động an toàn và cải thiện khả năng kiểm soát động tác."}
                </p>
              </div>
            ) : null}

            {activeTab === "safety" ? (
              <div>
                <h2 className="text-xl font-black text-slate-950">Lưu ý an toàn</h2>
                <ul className="mt-5 grid gap-3 text-sm leading-7 text-slate-700">
                  {safePrecautions.map((item) => (
                    <li key={item} className="flex gap-3">
                      <AlertTriangle className="mt-1 h-4 w-4 flex-none text-amber-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="mt-6 rounded-[24px] border-amber-100 bg-amber-50/70 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Ghi nhớ khi tập
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-amber-900">
              Tập chậm, giữ nhịp thở đều và dừng lại nếu có dấu hiệu đau bất thường. Xem tab “Lưu ý an toàn” để đọc đầy đủ khuyến nghị.
            </p>
          </Card>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
            <h2 className="text-lg font-black text-slate-950">Hành động</h2>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                className="flex min-h-12 items-center justify-between rounded-xl bg-emerald-600 px-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                onClick={markComplete}
              >
                <span className="inline-flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4" />
                  Đánh dấu đã hoàn thành
                </span>
              </button>
              <button
                type="button"
                className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={toggleSave}
                disabled={isSavedLoading || isSaving}
                aria-pressed={isSaved}
              >
                <span className="inline-flex items-center gap-3">
                  <Heart className={clsx("h-4 w-4", isSaved ? "fill-current text-rose-500" : "text-slate-500")} />
                  {isSaved ? "Đã lưu" : "Lưu bài tập"}
                </span>
                <Bookmark className={clsx("h-4 w-4", isSaved ? "fill-current text-emerald-600" : "text-slate-400")} />
              </button>
              <Link
                href="/patient/recovery-plan"
                className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                <span className="inline-flex items-center gap-3">
                  <Route className="h-4 w-4 text-emerald-600" />
                  Mở lộ trình
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </Card>

          {!(videoAccess?.access_level === "full" && videoAccess.video_url) ? (
            <Card className="rounded-[24px] border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-lg shadow-emerald-950/5">
              <div className="flex gap-4">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  <Lock className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Video hướng dẫn đầy đủ</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{getUnlockCopy(exercise.difficulty)}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Mở video hướng dẫn đầy đủ khi gói phù hợp
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Không hiển thị trình phát khi chưa có quyền xem
                </span>
              </div>
              <Link href="/patient/pricing" className="mt-5 block">
                <Button className="w-full rounded-xl">Nâng cấp gói ngay</Button>
              </Link>
              <Link href="/patient/pricing" className="mt-3 block text-center text-sm font-bold text-emerald-700">
                Xem các gói
              </Link>
            </Card>
          ) : null}

          <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
            <h2 className="text-lg font-black text-slate-950">Chi tiết bài tập</h2>
            <div className="mt-5 grid gap-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                  <Clock className="h-4 w-4" />
                  Thời lượng
                </span>
                <span className="font-black text-slate-900">{formatDuration(exercise)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                  <Repeat className="h-4 w-4" />
                  Mỗi hiệp
                </span>
                <span className="font-black text-slate-900">{exercise.repetitions ? `${exercise.repetitions} lần` : "Theo sức"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                  <Layers3 className="h-4 w-4" />
                  Số hiệp
                </span>
                <span className="font-black text-slate-900">{exercise.sets || "Theo hướng dẫn"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-500">
                  <Info className="h-4 w-4" />
                  Tần suất
                </span>
                <span className="font-black text-slate-900">Theo hướng dẫn</span>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center">
              <p className="text-sm font-black text-emerald-700">{exercise.body_region || exercise.category}</p>
            </div>
          </Card>

          {relatedExercises.length ? (
            <Card className="rounded-[24px] border-emerald-100/80 p-5 shadow-lg shadow-emerald-950/5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-slate-950">Bài tập liên quan</h2>
                <Link href="/patient/exercises" className="text-sm font-bold text-emerald-700">
                  Xem tất cả
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {relatedExercises.map((item) => (
                  <RelatedExerciseCard key={item.id} exercise={item} />
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
