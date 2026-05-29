export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function clsx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function getImageUrl(path: string | null | undefined, fallback = "/images/placeholders/rehab-equipment.jpg"): string {
  if (!path) return fallback;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  return `${baseUrl}/storage/v1/object/public/${path}`;
}
