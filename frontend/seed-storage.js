const fs = require("node:fs/promises");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(__dirname);

const BUCKET_NAME = "images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SEED_ASSETS_DIR = path.join(__dirname, "../supabase/seed_assets");

const CONTENT_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"]
]);

async function collectImageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectImageFiles(fullPath));
      continue;
    }

    if (entry.isFile() && CONTENT_TYPES.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function toStorageKey(filePath) {
  const relativePath = path.relative(SEED_ASSETS_DIR, filePath).split(path.sep).join("/");
  return relativePath;
}

async function uploadImage(supabase, filePath) {
  const stat = await fs.stat(filePath);
  const relativePath = path.relative(__dirname, filePath);

  if (stat.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`${relativePath} is larger than 5MB.`);
  }

  const fileBuffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const storageKey = toStorageKey(filePath);
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(storageKey, fileBuffer, {
    contentType: CONTENT_TYPES.get(ext),
    upsert: true
  });

  if (error) {
    throw new Error(`${relativePath}: ${error.message}`);
  }

  return storageKey;
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

  const imageFiles = await collectImageFiles(SEED_ASSETS_DIR);
  if (imageFiles.length === 0) {
    console.log("No seed images found.");
    return;
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
    process.exitCode = 1;
    return;
  }

  console.log(`Uploaded ${uploaded} seed image(s) to bucket "${BUCKET_NAME}".`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
