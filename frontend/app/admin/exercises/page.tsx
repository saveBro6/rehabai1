"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, ImageIcon, Pencil, RotateCcw, Trash2, UploadCloud, Video } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { getImageUrl } from "@/lib/utils";
import {
  createExercise,
  exerciseDifficulties,
  getAdminExerciseVideoPreviewUrl,
  getAdminExercises,
  getExerciseDifficultyLabel,
  removeExerciseVideo,
  setExerciseActive,
  slugifyExerciseTitle,
  toPersistedExerciseDifficulty,
  updateExercise,
  uploadExerciseThumbnail,
  uploadExerciseVideo
} from "@/services/exercises.service";
import type { Exercise } from "@/types";
import type { Insert, Update } from "@/types/supabase";

type ExerciseFormState = {
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  body_region: string;
  duration_minutes: string;
  repetitions: string;
  sets: string;
  image_url: string;
  instructions: string;
  precautions: string;
  is_active: boolean;
};

const emptyForm: ExerciseFormState = {
  title: "",
  slug: "",
  description: "",
  category: "",
  difficulty: "Cơ bản",
  body_region: "",
  duration_minutes: "0",
  repetitions: "0",
  sets: "0",
  image_url: "",
  instructions: "",
  precautions: "",
  is_active: true
};

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatFileSize(value?: number | null) {
  if (!value) return "Chưa ghi nhận";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

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

function hasVideo(exercise: Exercise) {
  return Boolean(exercise.video_path || exercise.video_url);
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0;
}

function formFromExercise(exercise: Exercise): ExerciseFormState {
  return {
    title: exercise.title || "",
    slug: exercise.slug || "",
    description: exercise.description || "",
    category: exercise.category || "",
    difficulty: getExerciseDifficultyLabel(exercise.difficulty),
    body_region: exercise.body_region || "",
    duration_minutes: String(exercise.duration_minutes || 0),
    repetitions: String(exercise.repetitions || 0),
    sets: String(exercise.sets || 0),
    image_url: exercise.image_url || "",
    instructions: (exercise.instructions || []).join("\n"),
    precautions: (exercise.precautions || []).join("\n"),
    is_active: exercise.is_active !== false
  };
}

function buildExercisePayload(form: ExerciseFormState): Insert<"exercises"> | Update<"exercises"> {
  const title = form.title.trim();
  const slug = (form.slug.trim() || slugifyExerciseTitle(title)).trim();

  return {
    title,
    slug,
    description: form.description.trim(),
    category: form.category.trim(),
    difficulty: toPersistedExerciseDifficulty(form.difficulty),
    body_region: form.body_region.trim(),
    duration_minutes: parseNumber(form.duration_minutes),
    repetitions: parseNumber(form.repetitions),
    sets: parseNumber(form.sets),
    image_url: form.image_url.trim() || null,
    instructions: parseLines(form.instructions),
    precautions: parseLines(form.precautions),
    is_active: form.is_active
  };
}

function isExternalImageReference(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

export default function AdminExercisesPage() {
  const { pushToast } = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState<ExerciseFormState>(emptyForm);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false);

  const activeCount = useMemo(() => exercises.filter((exercise) => exercise.is_active !== false).length, [exercises]);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setExercises(await getAdminExercises());
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Không thể tải danh sách bài tập.";
      setError(message);
      pushToast("Tải bài tập thất bại", message);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [thumbnailFile]);

  function updateForm<Key extends keyof ExerciseFormState>(key: Key, value: ExerciseFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(exercise: Exercise) {
    setEditingExercise(exercise);
    setForm(formFromExercise(exercise));
    setThumbnailFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingExercise(null);
    setForm(emptyForm);
    setThumbnailFile(null);
    setThumbnailDragActive(false);
  }

  function handleThumbnailFile(file: File | null | undefined) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      const message = "Ảnh thumbnail phải là JPEG, PNG hoặc WEBP.";
      setError(message);
      pushToast("Ảnh thumbnail không hợp lệ", message);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = "Ảnh thumbnail không được vượt quá 5MB.";
      setError(message);
      pushToast("Ảnh thumbnail quá lớn", message);
      return;
    }

    setError("");
    setThumbnailFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("form");
    setError("");

    try {
      const payload = buildExercisePayload(form);
      if (!payload.title || !payload.slug || !payload.description || !payload.category || !payload.body_region) {
        throw new Error("Vui lòng nhập đủ tên, mô tả, danh mục, vùng cơ thể và slug.");
      }
      if (!payload.instructions?.length) {
        throw new Error("Vui lòng nhập ít nhất một bước hướng dẫn.");
      }

      if (isExternalImageReference(form.image_url) && !thumbnailFile) {
        throw new Error("Ảnh hiện tại đang dùng URL ngoài. Vui lòng tải thumbnail mới lên để thay thế.");
      }

      if (thumbnailFile) {
        payload.image_url = await uploadExerciseThumbnail(thumbnailFile, String(payload.slug || payload.title || editingExercise?.id || ""));
      }

      if (editingExercise) {
        await updateExercise(editingExercise.id, payload);
        pushToast("Đã cập nhật bài tập", "Thông tin phân loại và nội dung bài tập đã được lưu.");
      } else {
        await createExercise(payload as Insert<"exercises">);
        pushToast("Đã tạo bài tập", "Bài tập mới đã được thêm vào Exercise Library.");
      }

      resetForm();
      await loadExercises();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Không thể lưu bài tập.";
      setError(message);
      pushToast("Lưu bài tập thất bại", message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpload(exercise: Exercise, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const existing = hasVideo(exercise);
    if (existing && !window.confirm("Video hiện tại sẽ được thay thế. Bạn muốn tiếp tục?")) return;

    const key = `${exercise.id}:upload`;
    setBusyKey(key);
    setError("");
    try {
      const storagePath = await uploadExerciseVideo(exercise, file);
      pushToast("Đã lưu video bài tập", `Đường dẫn đã lưu: ${storagePath}`);
      await loadExercises();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Không thể tải video lên.";
      setError(message);
      pushToast("Tải video thất bại", message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemoveVideo(exercise: Exercise) {
    if (!window.confirm("Xóa video chính của bài tập này?")) return;

    const key = `${exercise.id}:remove-video`;
    setBusyKey(key);
    setError("");
    try {
      await removeExerciseVideo(exercise);
      pushToast("Đã xóa video bài tập");
      await loadExercises();
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Không thể xóa video.";
      setError(message);
      pushToast("Xóa video thất bại", message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePreview(exercise: Exercise) {
    const key = `${exercise.id}:preview`;
    setBusyKey(key);
    setError("");
    try {
      const previewUrl = await getAdminExerciseVideoPreviewUrl(exercise);
      if (!previewUrl) {
        pushToast("Chưa có video", "Bài tập này chưa có video để xem trước.");
        return;
      }
      setPreview({ title: exercise.title, url: previewUrl });
    } catch (previewError) {
      const message = previewError instanceof Error ? previewError.message : "Không thể mở video xem trước.";
      setError(message);
      pushToast("Xem trước thất bại", message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggleActive(exercise: Exercise) {
    const nextActive = exercise.is_active === false;
    const key = `${exercise.id}:active`;
    setBusyKey(key);
    setError("");
    try {
      await setExerciseActive(exercise.id, nextActive);
      pushToast(nextActive ? "Đã công khai bài tập" : "Đã ngừng công khai bài tập");
      await loadExercises();
    } catch (activeError) {
      const message = activeError instanceof Error ? activeError.message : "Không thể cập nhật trạng thái bài tập.";
      setError(message);
      pushToast("Cập nhật trạng thái thất bại", message);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Exercise Library</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý bài tập và video</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Quyền xem video phụ thuộc vào cấp độ bài tập và gói đăng ký. Mỗi bài tập có một video chính lưu trong
              bucket <span className="font-semibold">exercise-videos</span>; DB chỉ lưu đường dẫn và metadata.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            {activeCount}/{exercises.length} đang công khai
          </span>
        </div>

        {error ? (
          <Card className="border-rose-200 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </Card>
        ) : null}

        <Card>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-emerald-700">
                  {editingExercise ? "Chỉnh sửa bài tập" : "Tạo bài tập mới"}
                </p>
                <h2 className="text-2xl font-bold text-slate-950">
                  {editingExercise ? editingExercise.title : "Thông tin và phân loại"}
                </h2>
              </div>
              {editingExercise ? (
                <Button onClick={resetForm} type="button" variant="secondary">
                  Hủy sửa
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <TextField label="Tên bài tập" required value={form.title} onChange={(value) => updateForm("title", value)} />
              <TextField
                label="Slug"
                placeholder="Tự tạo từ tên nếu để trống"
                value={form.slug}
                onChange={(value) => updateForm("slug", value)}
              />
              <TextField label="Danh mục / liệu pháp" required value={form.category} onChange={(value) => updateForm("category", value)} />
              <TextField label="Vùng cơ thể" required value={form.body_region} onChange={(value) => updateForm("body_region", value)} />
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Cấp độ
                <select
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={form.difficulty}
                  onChange={(event) => updateForm("difficulty", event.target.value)}
                >
                  {exerciseDifficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ThumbnailDropzone
              currentPath={form.image_url}
              dragActive={thumbnailDragActive}
              previewUrl={thumbnailPreviewUrl}
              selectedFile={thumbnailFile}
              onClear={() => setThumbnailFile(null)}
              onDragActiveChange={setThumbnailDragActive}
              onFileSelect={handleThumbnailFile}
            />

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Mô tả
              <textarea
                className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <TextField label="Thời lượng (phút)" type="number" value={form.duration_minutes} onChange={(value) => updateForm("duration_minutes", value)} />
              <TextField label="Số lần lặp" type="number" value={form.repetitions} onChange={(value) => updateForm("repetitions", value)} />
              <TextField label="Số hiệp" type="number" value={form.sets} onChange={(value) => updateForm("sets", value)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Hướng dẫn thực hiện, mỗi dòng một bước
                <textarea
                  className="min-h-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  required
                  value={form.instructions}
                  onChange={(event) => updateForm("instructions", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Lưu ý an toàn, mỗi dòng một ý
                <textarea
                  className="min-h-32 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={form.precautions}
                  onChange={(event) => updateForm("precautions", event.target.value)}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                checked={form.is_active}
                className="h-4 w-4 accent-emerald-600"
                onChange={(event) => updateForm("is_active", event.target.checked)}
                type="checkbox"
              />
              Công khai bài tập trong thư viện
            </label>

            <div className="flex justify-end gap-2">
              <Button disabled={busyKey === "form"} type="submit">
                {busyKey === "form" ? "Đang lưu..." : editingExercise ? "Lưu thay đổi" : "Tạo bài tập"}
              </Button>
            </div>
          </form>
        </Card>

        {loading ? (
          <Card>
            <p className="text-sm text-slate-500">Đang tải danh sách bài tập...</p>
          </Card>
        ) : null}

        {!loading && !exercises.length ? (
          <Card>
            <p className="text-sm text-slate-500">Chưa có bài tập để quản lý.</p>
          </Card>
        ) : null}

        <div className="grid gap-5">
          {exercises.map((exercise) => (
            <Card key={exercise.id} className="grid gap-5 lg:grid-cols-[160px_1fr]">
              <Image
                alt={exercise.title}
                className="h-36 w-full rounded-lg object-cover lg:w-40"
                height={144}
                src={getImageUrl(exercise.image_url)}
                unoptimized
                width={160}
              />

              <div className="grid gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-950">{exercise.title}</h2>
                      <StatusBadge active={exercise.is_active !== false} />
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          hasVideo(exercise) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {hasVideo(exercise) ? "Đã có video" : "Chưa có video"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                      {exercise.category} · {getExerciseDifficultyLabel(exercise.difficulty)} · {exercise.body_region}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{exercise.description}</p>
                  </div>
                  <div className="text-sm text-slate-500 sm:text-right">
                    <p>Cập nhật video: {formatDateTime(exercise.video_uploaded_at)}</p>
                    <p>Dung lượng: {formatFileSize(exercise.video_size_bytes)}</p>
                  </div>
                </div>

                <VideoSlot
                  busy={Boolean(busyKey?.startsWith(`${exercise.id}:`))}
                  hasCurrentVideo={hasVideo(exercise)}
                  path={exercise.video_path || exercise.video_url || null}
                  onPreview={() => void handlePreview(exercise)}
                  onRemove={() => void handleRemoveVideo(exercise)}
                  onUpload={(event) => void handleUpload(exercise, event)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => startEdit(exercise)} type="button" variant="secondary">
                    <Pencil className="mr-2 h-4 w-4" /> Sửa bài tập
                  </Button>
                  <Button disabled={Boolean(busyKey?.startsWith(`${exercise.id}:active`))} onClick={() => void handleToggleActive(exercise)} type="button" variant="ghost">
                    {exercise.is_active === false ? "Công khai lại" : "Ngừng công khai"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {preview ? <VideoPreviewDialog preview={preview} onClose={() => setPreview(null)} /> : null}
    </RequireAdmin>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  required,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        min={type === "number" ? 0 : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function ThumbnailDropzone({
  currentPath,
  dragActive,
  onClear,
  onDragActiveChange,
  onFileSelect,
  previewUrl,
  selectedFile
}: {
  currentPath: string;
  dragActive: boolean;
  onClear: () => void;
  onDragActiveChange: (active: boolean) => void;
  onFileSelect: (file: File | null | undefined) => void;
  previewUrl: string | null;
  selectedFile: File | null;
}) {
  const currentImageUrl = currentPath && !isExternalImageReference(currentPath) ? getImageUrl(currentPath) : null;
  const displayUrl = previewUrl || currentImageUrl;
  const hasExternalImage = isExternalImageReference(currentPath);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-800">Ảnh thumbnail</p>
          <p className="mt-1 text-sm text-slate-500">
            Tải ảnh JPEG, PNG hoặc WEBP lên bucket images. DB chỉ lưu đường dẫn tương đối.
          </p>
        </div>
        {currentPath && !hasExternalImage ? (
          <span className="break-all rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
            Đường dẫn đã lưu: {currentPath}
          </span>
        ) : null}
      </div>

      {hasExternalImage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Ảnh hiện tại đang dùng URL ngoài. Vui lòng tải ảnh mới lên để thay thế.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {displayUrl ? (
            <Image
              alt="Thumbnail bài tập"
              className="h-40 w-full object-cover"
              height={160}
              src={displayUrl}
              unoptimized
              width={240}
            />
          ) : (
            <div className="grid h-40 place-items-center text-slate-400">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>

        <label
          className={`grid min-h-40 cursor-pointer place-items-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
            dragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            onDragActiveChange(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            onDragActiveChange(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            onDragActiveChange(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            onDragActiveChange(false);
            onFileSelect(event.dataTransfer.files?.[0]);
          }}
        >
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => onFileSelect(event.target.files?.[0])}
            type="file"
          />
          <span>
            <UploadCloud className="mx-auto h-8 w-8 text-emerald-600" />
            <span className="mt-3 block text-sm font-bold text-slate-800">
              Kéo thả ảnh vào đây hoặc chọn từ máy
            </span>
            <span className="mt-1 block text-xs text-slate-500">JPEG, PNG, WEBP, tối đa 5MB</span>
            {selectedFile ? (
              <span className="mt-3 block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Đã chọn: {selectedFile.name}
              </span>
            ) : null}
          </span>
        </label>
      </div>

      {selectedFile ? (
        <div className="flex justify-end">
          <Button onClick={onClear} type="button" variant="ghost">
            Bỏ ảnh đã chọn
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {active ? "Đang công khai" : "Đã ẩn"}
    </span>
  );
}

function VideoSlot({
  busy,
  hasCurrentVideo,
  path,
  onPreview,
  onRemove,
  onUpload
}: {
  busy: boolean;
  hasCurrentVideo: boolean;
  path: string | null;
  onPreview: () => void;
  onRemove: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm">
          <Video className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">Video chính</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${hasCurrentVideo ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"}`}>
              {hasCurrentVideo ? "Đã có video" : "Chưa có video"}
            </span>
          </div>
          <p className="mt-2 break-all text-xs text-slate-500">{path || "Chưa có đường dẫn lưu trữ."}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
          <UploadCloud className="mr-2 h-4 w-4" />
          {hasCurrentVideo ? "Thay video" : "Tải video lên"}
          <input accept="video/mp4,video/webm" className="sr-only" disabled={busy} onChange={onUpload} type="file" />
        </label>
        <Button disabled={!hasCurrentVideo || busy} onClick={onPreview} type="button" variant="secondary">
          <Eye className="mr-2 h-4 w-4" /> Xem trước
        </Button>
        <Button disabled={!hasCurrentVideo || busy} onClick={onRemove} type="button" variant="ghost">
          <Trash2 className="mr-2 h-4 w-4" /> Xóa video
        </Button>
        {busy ? (
          <span className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500">
            <RotateCcw className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VideoPreviewDialog({ preview, onClose }: { preview: { title: string; url: string }; onClose: () => void }) {
  const embedUrl = getYoutubeEmbedUrl(preview.url);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 py-6">
      <Card className="w-full max-w-4xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Xem trước video</p>
            <h2 className="text-xl font-bold text-slate-950">{preview.title}</h2>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>
        {embedUrl ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-lg border border-slate-200"
            src={embedUrl}
            title={preview.title}
          />
        ) : (
          <video className="aspect-video w-full rounded-lg bg-slate-950" controls src={preview.url}>
            Trình duyệt của bạn không hỗ trợ phát video.
          </video>
        )}
      </Card>
    </div>
  );
}
