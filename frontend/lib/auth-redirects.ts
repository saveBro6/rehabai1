function getConfiguredSiteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
}

export function getAuthRedirectUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getConfiguredSiteOrigin() || (typeof window !== "undefined" ? window.location.origin : "");

  return `${origin}${normalizedPath}`;
}
