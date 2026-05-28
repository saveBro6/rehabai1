export function getAuthRedirectPath(_targetPath: string) {
  return "/login";
}

export function getProtectedHref(isAuthenticated: boolean, targetPath: string) {
  return isAuthenticated ? targetPath : getAuthRedirectPath(targetPath);
}

export function redirectToLogin(router: { push: (href: string) => void }, targetPath: string) {
  router.push(getAuthRedirectPath(targetPath));
}

export function isSafeRedirectPath(path: string | null) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}
