import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Exercise, ExerciseVideoAccess, PublicExerciseMetadata } from "@/types";
import type { Insert, Update } from "@/types/supabase";

export const exerciseDifficulties = ["Cơ bản", "Trung cấp", "Nâng cao"] as const;
const persistedExerciseDifficulties = exerciseDifficulties;
const EXERCISE_VIDEO_BUCKET = "exercise-videos";
const EXERCISE_THUMBNAIL_BUCKET = "images";
const EXERCISE_THUMBNAIL_FOLDER = "exercises/thumbnails";
const MAX_EXERCISE_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_EXERCISE_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024;
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);
const THUMBNAIL_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
const publicExerciseSelect =
  "id,title,slug,description,category,difficulty,body_region,duration_minutes,repetitions,sets,instructions,precautions,image_url,is_active,created_at";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PersistedExerciseDifficulty = (typeof persistedExerciseDifficulties)[number];

function isExerciseDifficulty(value: string): value is (typeof exerciseDifficulties)[number] {
  return (exerciseDifficulties as readonly string[]).includes(value);
}

export function getExerciseDifficultyLabel(value?: string | null) {
  if (!value) return "Chưa phân loại";
  if (["beginner", "basic", "easy", "Cơ bản"].includes(value)) return "Cơ bản";
  if (["intermediate", "medium", "Trung cấp", "Trung bình"].includes(value)) return "Trung cấp";
  if (["advanced", "Nâng cao"].includes(value)) return "Nâng cao";
  return value;
}

export function toPersistedExerciseDifficulty(value: string): PersistedExerciseDifficulty {
  const label = getExerciseDifficultyLabel(value);
  if (label === "Trung cấp") return "Trung cấp";
  if (label === "Nâng cao") return "Nâng cao";
  return "Cơ bản";
}

export function slugifyExerciseTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export type ExerciseFilters = {
  category?: string;
  difficulty?: string;
  body_region?: string;
  search?: string;
};

export type ExerciseFilterOptions = {
  categories: string[];
  difficulties: string[];
  bodyRegions: string[];
};

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b, "vi")
  );
}

function isExternalVideoReference(value: string) {
  return /^https?:\/\//i.test(value.trim()) || value.trim().startsWith("/");
}

function normalizeExerciseVideoPath(value: string) {
  return value.trim().replace(/^exercise-videos\/+/, "");
}

function getExerciseVideoStoragePath(exerciseId: string) {
  return `exercises/${exerciseId}/full.mp4`;
}

function getExerciseThumbnailStoragePath(slugOrTitle: string, file: File) {
  const fallbackName = `exercise-${Date.now()}`;
  const safeBaseName = (slugifyExerciseTitle(slugOrTitle) || fallbackName).slice(0, 70);
  const extension = THUMBNAIL_EXTENSION_BY_TYPE[file.type];
  return `${EXERCISE_THUMBNAIL_FOLDER}/${safeBaseName}-${Date.now()}.${extension}`;
}

function validateExerciseVideoFile(file: File) {
  if (!VIDEO_MIME_TYPES.has(file.type)) {
    throw new Error("Tệp video phải là MP4 hoặc WEBM.");
  }

  if (file.size > MAX_EXERCISE_VIDEO_SIZE_BYTES) {
    throw new Error("Video bài tập không được vượt quá 500MB.");
  }
}

export function validateExerciseThumbnailFile(file: File) {
  if (!THUMBNAIL_EXTENSION_BY_TYPE[file.type]) {
    throw new Error("Ảnh thumbnail phải là JPEG, PNG hoặc WEBP.");
  }

  if (file.size > MAX_EXERCISE_THUMBNAIL_SIZE_BYTES) {
    throw new Error("Ảnh thumbnail không được vượt quá 5MB.");
  }
}

async function resolveExerciseVideoReference(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isExternalVideoReference(trimmed)) return trimmed;

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(EXERCISE_VIDEO_BUCKET)
    .createSignedUrl(normalizeExerciseVideoPath(trimmed), 60 * 60);
  assertNoSupabaseError(error);
  return data?.signedUrl || null;
}

async function setExerciseVideoMetadata(
  exerciseId: string,
  payload: {
    videoPath: string | null;
    videoMimeType: string | null;
    videoSizeBytes: number | null;
  }
) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("admin_set_exercise_video_metadata", {
    target_exercise_id: exerciseId,
    p_video_path: payload.videoPath,
    p_preview_video_path: null,
    p_video_mime_type: payload.videoMimeType,
    p_video_size_bytes: payload.videoSizeBytes
  });
  assertNoSupabaseError(error);
}

export async function getExercises(filters?: ExerciseFilters): Promise<PublicExerciseMetadata[]> {
  const supabase = getSupabase();
  let query = supabase.from("exercise_public_metadata").select(publicExerciseSelect).order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.difficulty && isExerciseDifficulty(filters.difficulty)) {
    query = query.eq("difficulty", toPersistedExerciseDifficulty(filters.difficulty));
  }
  if (filters?.body_region) query = query.eq("body_region", filters.body_region);

  const { data, error } = await query;
  assertNoSupabaseError(error);

  const search = filters?.search?.trim().toLowerCase();
  const rows = (data || []) as PublicExerciseMetadata[];
  if (!search) return rows;

  return rows.filter((exercise) => {
    const haystack = `${exercise.title} ${exercise.description} ${exercise.category}`.toLowerCase();
    return haystack.includes(search);
  });
}

export async function getAdminExercises(): Promise<Exercise[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_admin_exercises");
  assertNoSupabaseError(error);
  return (data || []) as Exercise[];
}

export async function getExerciseFilterOptions(): Promise<ExerciseFilterOptions> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercise_public_metadata")
    .select("category,difficulty,body_region");
  assertNoSupabaseError(error);

  const rows = data || [];

  return {
    categories: uniqueSorted(rows.map((row) => row.category)),
    difficulties: [...exerciseDifficulties],
    bodyRegions: uniqueSorted(rows.map((row) => row.body_region))
  };
}

export async function getExerciseById(idOrSlug: string): Promise<PublicExerciseMetadata | null> {
  const supabase = getSupabase();
  const query = supabase.from("exercise_public_metadata").select(publicExerciseSelect);
  const { data, error } = uuidPattern.test(idOrSlug)
    ? await query.eq("id", idOrSlug).maybeSingle()
    : await query.eq("slug", idOrSlug).maybeSingle();
  assertNoSupabaseError(error);
  return data as PublicExerciseMetadata | null;
}

export async function getExerciseVideoAccess(exerciseId: string): Promise<ExerciseVideoAccess | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_exercise_video_access", { target_exercise_id: exerciseId });
  assertNoSupabaseError(error);
  const access = ((data || [])[0] || null) as ExerciseVideoAccess | null;
  if (!access?.video_url) return access;

  return {
    ...access,
    video_url: await resolveExerciseVideoReference(access.video_url)
  };
}

export async function getAdminExerciseVideoPreviewUrl(exercise: Exercise) {
  return resolveExerciseVideoReference(exercise.video_path || exercise.video_url);
}

export async function uploadExerciseVideo(exercise: Exercise, file: File) {
  validateExerciseVideoFile(file);

  const storagePath = getExerciseVideoStoragePath(exercise.id);
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(EXERCISE_VIDEO_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: true
  });
  assertNoSupabaseError(error);

  await setExerciseVideoMetadata(exercise.id, {
    videoPath: storagePath,
    videoMimeType: file.type,
    videoSizeBytes: file.size
  });

  return storagePath;
}

export async function uploadExerciseThumbnail(file: File, slugOrTitle: string) {
  validateExerciseThumbnailFile(file);

  const path = getExerciseThumbnailStoragePath(slugOrTitle, file);
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(EXERCISE_THUMBNAIL_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  assertNoSupabaseError(error);
  return path;
}

export async function removeExerciseVideo(exercise: Exercise) {
  const videoReference = exercise.video_path || exercise.video_url;
  const normalizedPath = videoReference && !isExternalVideoReference(videoReference) ? normalizeExerciseVideoPath(videoReference) : null;
  const supabase = getSupabase();

  if (normalizedPath) {
    const { error } = await supabase.storage.from(EXERCISE_VIDEO_BUCKET).remove([normalizedPath]);
    assertNoSupabaseError(error);
  }

  await setExerciseVideoMetadata(exercise.id, {
    videoPath: null,
    videoMimeType: null,
    videoSizeBytes: null
  });
}

export async function createExercise(payload: Insert<"exercises">) {
  const supabase = getSupabase();
  const { error } = await supabase.from("exercises").insert(payload);
  assertNoSupabaseError(error);
}

export async function updateExercise(id: string, payload: Update<"exercises">) {
  const supabase = getSupabase();
  const { error } = await supabase.from("exercises").update(payload).eq("id", id);
  assertNoSupabaseError(error);
}

export async function setExerciseActive(id: string, isActive: boolean) {
  return updateExercise(id, { is_active: isActive });
}

export function emptyAdminExercisePayload(): Insert<"exercises"> {
  return {
    title: "",
    slug: "",
    description: "",
    category: "",
    difficulty: persistedExerciseDifficulties[0],
    body_region: "",
    duration_minutes: 0,
    repetitions: 0,
    sets: 0,
    instructions: [],
    precautions: [],
    image_url: null,
    video_url: null,
    is_active: true
  };
}
