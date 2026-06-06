const fs = require("node:fs/promises");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(__dirname);

const IMAGE_BUCKET_NAME = "images";
const EXERCISE_VIDEO_BUCKET_NAME = "exercise-videos";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SEED_IMAGE_ASSETS_DIR = path.join(__dirname, "../supabase/seed_assets");
const SEED_VIDEO_ASSETS_DIR = path.join(__dirname, "seed-assets/videos/exercises");

const IMAGE_CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

const VIDEO_CONTENT_TYPES = new Map([
  [".mp4", "video/mp4"],
  [".webm", "video/webm"]
]);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectVideoFiles(dir) {
  if (!(await exists(dir))) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectVideoFiles(fullPath));
      continue;
    }

    if (entry.isFile() && VIDEO_CONTENT_TYPES.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectImageFiles(dir) {
  if (!(await exists(dir))) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectImageFiles(fullPath));
      continue;
    }

    if (entry.isFile() && IMAGE_CONTENT_TYPES.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function imageStorageKey(filePath) {
  return path.relative(SEED_IMAGE_ASSETS_DIR, filePath).split(path.sep).join("/");
}

async function uploadImage(supabase, filePath) {
  const stat = await fs.stat(filePath);
  const relativePath = path.relative(__dirname, filePath);

  if (stat.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`${relativePath} is larger than 5MB.`);
  }

  const fileBuffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const storageKey = imageStorageKey(filePath);
  const { error } = await supabase.storage.from(IMAGE_BUCKET_NAME).upload(storageKey, fileBuffer, {
    contentType: IMAGE_CONTENT_TYPES.get(ext),
    upsert: true
  });

  if (error) {
    throw new Error(`${relativePath}: ${error.message}`);
  }

  return storageKey;
}

async function ensureBucket(supabase, bucketName, options) {
  const { data, error } = await supabase.storage.getBucket(bucketName);
  if (!error && data) {
    console.log(`Bucket "${bucketName}" already exists.`);
    return "existed";
  }

  const { error: createError } = await supabase.storage.createBucket(bucketName, options);
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Could not create bucket "${bucketName}": ${createError.message}`);
  }

  console.log(`Bucket "${bucketName}" created.`);
  return "created";
}

function videoCandidates(exercise) {
  return [".mp4", ".webm"].flatMap((ext) => [
    path.join(SEED_VIDEO_ASSETS_DIR, exercise.id, `full${ext}`),
    path.join(SEED_VIDEO_ASSETS_DIR, exercise.id, `video${ext}`),
    path.join(SEED_VIDEO_ASSETS_DIR, exercise.slug, `full${ext}`),
    path.join(SEED_VIDEO_ASSETS_DIR, exercise.slug, `video${ext}`),
    path.join(SEED_VIDEO_ASSETS_DIR, `${exercise.id}-full${ext}`),
    path.join(SEED_VIDEO_ASSETS_DIR, `${exercise.id}-video${ext}`),
    path.join(SEED_VIDEO_ASSETS_DIR, `${exercise.slug}-full${ext}`),
    path.join(SEED_VIDEO_ASSETS_DIR, `${exercise.slug}-video${ext}`)
  ]);
}

async function findSeedVideoFile(exercise) {
  for (const candidate of videoCandidates(exercise)) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function uploadExerciseVideo(supabase, exercise, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = VIDEO_CONTENT_TYPES.get(ext);
  if (!contentType) {
    throw new Error(`${path.relative(__dirname, filePath)} is not an MP4 or WEBM seed video.`);
  }

  const fileBuffer = await fs.readFile(filePath);
  const storageKey = `exercises/${exercise.id}/full.mp4`;
  const { error } = await supabase.storage.from(EXERCISE_VIDEO_BUCKET_NAME).upload(storageKey, fileBuffer, {
    contentType,
    upsert: true
  });

  if (error) {
    throw new Error(`${path.relative(__dirname, filePath)}: ${error.message}`);
  }

  return {
    storageKey,
    contentType,
    sizeBytes: (await fs.stat(filePath)).size
  };
}

async function seedImages(supabase) {
  const imageFiles = await collectImageFiles(SEED_IMAGE_ASSETS_DIR);
  if (imageFiles.length === 0) {
    console.log("No seed images found.");
    return { uploaded: 0, failures: [] };
  }

  const failures = [];
  let uploaded = 0;

  for (const filePath of imageFiles) {
    try {
      const storageKey = await uploadImage(supabase, filePath);
      uploaded += 1;
      console.log(`Uploaded ${storageKey}`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (failures.length > 0) {
    console.error(`Failed to upload ${failures.length} of ${imageFiles.length} seed image(s):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }

  console.log(`Uploaded ${uploaded} seed image(s) to bucket "${IMAGE_BUCKET_NAME}".`);
  return { uploaded, failures };
}

async function getSeedExercises(supabase) {
  const { data, error } = await supabase
    .from("exercises")
    .select("id,slug")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not read exercises for video seeding: ${error.message}`);
  }

  return data || [];
}

async function seedExerciseVideos(supabase) {
  const bucketState = await ensureBucket(supabase, EXERCISE_VIDEO_BUCKET_NAME, {
    public: false,
    fileSizeLimit: 500 * 1024 * 1024,
    allowedMimeTypes: Array.from(VIDEO_CONTENT_TYPES.values())
  });

  if (!(await exists(SEED_VIDEO_ASSETS_DIR))) {
    console.log("No seed exercise videos found, skipping video upload.");
    return { bucketState, uploaded: 0, updatedRows: 0, skipped: 0, failures: [] };
  }

  const localVideoFiles = await collectVideoFiles(SEED_VIDEO_ASSETS_DIR);
  console.log(`Found ${localVideoFiles.length} local seed exercise video file(s) in ${SEED_VIDEO_ASSETS_DIR}.`);

  const seedExercises = await getSeedExercises(supabase);
  if (seedExercises.length === 0) {
    console.log("No exercise rows found, skipping video upload.");
    return { bucketState, uploaded: 0, updatedRows: 0, skipped: 0, failures: [] };
  }

  const failures = [];
  let uploaded = 0;
  let updatedRows = 0;
  let skipped = 0;

  for (const exercise of seedExercises) {
    const videoFile = await findSeedVideoFile(exercise);

    if (!videoFile) {
      skipped += 1;
      console.log(`Skipped ${exercise.slug || exercise.id}: no matching local seed video file.`);
      continue;
    }

    try {
      const videoUpload = await uploadExerciseVideo(supabase, exercise, videoFile);
      uploaded += 1;

      const updatePayload = {
        video_path: videoUpload.storageKey,
        video_url: videoUpload.storageKey,
        preview_video_path: null,
        video_mime_type: videoUpload.contentType,
        video_size_bytes: videoUpload.sizeBytes,
        video_uploaded_at: new Date().toISOString()
      };

      console.log(`Uploaded ${videoUpload.storageKey}`);

      const { error } = await supabase.from("exercises").update(updatePayload).eq("id", exercise.id);
      if (error) {
        throw new Error(`Could not update exercise ${exercise.id}: ${error.message}`);
      }
      updatedRows += 1;
    } catch (error) {
      failures.push(error.message);
    }
  }

  if (uploaded === 0 && failures.length === 0) {
    console.log("No seed exercise videos found, skipping video upload.");
  }

  if (failures.length > 0) {
    console.error(`Failed to seed ${failures.length} exercise video item(s):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }

  console.log(`Exercise video bucket "${EXERCISE_VIDEO_BUCKET_NAME}" ${bucketState}.`);
  console.log(`Uploaded ${uploaded} exercise video file(s).`);
  console.log(`Updated ${updatedRows} exercise row(s).`);
  console.log(`Skipped ${skipped} exercise(s) without local seed videos.`);

  return { bucketState, uploaded, updatedRows, skipped, failures };
}

async function main() {
  if (!SUPABASE_SECRET_KEY) {
    throw new Error("Missing SUPABASE_SECRET_KEY environment variable.");
  }

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const imageResult = await seedImages(supabase);
  const videoResult = await seedExerciseVideos(supabase);

  if (imageResult.failures.length > 0 || videoResult.failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
