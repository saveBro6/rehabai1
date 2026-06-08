export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function clsx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function getImageUrl(path: string | null | undefined, fallback = "/images/placeholders/rehab-equipment.jpg"): string {
  if (!path) return fallback;
  const trimmedPath = path.trim();
  if (trimmedPath.startsWith("http")) return trimmedPath;
  if (trimmedPath.startsWith("/storage/v1/object/public/")) {
    return `${getSupabaseStorageOrigin()}${trimmedPath}`;
  }
  if (trimmedPath.startsWith("storage/v1/object/public/")) {
    return `${getSupabaseStorageOrigin()}/${trimmedPath}`;
  }
  if (trimmedPath.startsWith("/")) return trimmedPath;

  const relativePath = trimmedPath.replace(/^images\/+/, "");
  const baseUrl = getSupabaseStorageOrigin();
  return `${baseUrl}/storage/v1/object/public/images/${relativePath}`;
}

function getSupabaseStorageOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return configuredUrl.replace(/\/+$/, "");
  }
}
