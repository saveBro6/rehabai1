export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function clsx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function getImageUrl(path: string | null | undefined, fallback = "/images/placeholders/rehab-equipment.jpg"): string {
  const localPath = getLocalImagePath(path);
  if (localPath) return localPath;
  if (!path) return fallback;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  return `${baseUrl}/storage/v1/object/public/images/${path}`;
}

function getLocalImagePath(path: string | null | undefined) {
  if (!path) return null;

  const knownLocalFolders: Array<[string, string]> = [
    ["products/", "/images/_products/"],
    ["/products/", "/images/_products/"],
    ["/images/products/", "/images/_products/"],
    ["doctors/", "/images/_doctors/"],
    ["/doctors/", "/images/_doctors/"],
    ["/images/doctors/", "/images/_doctors/"],
    ["exercises/", "/images/_exercises/"],
    ["/exercises/", "/images/_exercises/"],
    ["/images/exercises/", "/images/_exercises/"]
  ];

  for (const [prefix, publicFolder] of knownLocalFolders) {
    if (path.startsWith(prefix)) {
      return `${publicFolder}${path.slice(prefix.length)}`;
    }
  }

  return null;
}
