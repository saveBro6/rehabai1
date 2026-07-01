function getConfiguredSiteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/+$/, "");
}

export function getAuthRedirectUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = typeof window !== "undefined" ? window.location.origin : getConfiguredSiteOrigin() || "";

  return `${origin}${normalizedPath}`;
}
