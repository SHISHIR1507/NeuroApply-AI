const COOKIE = "na_auth";
const STORAGE_KEY = "token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function setSession(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, token);
  document.cookie = `${COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict`;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Strict`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function redirectToLogin(reason?: "expired") {
  const params = new URLSearchParams();
  const path = window.location.pathname;
  if (path !== "/" && path !== "/login" && path !== "/register") {
    params.set("next", path);
  }
  if (reason) params.set("reason", reason);
  window.location.replace(`/login?${params.toString()}`);
}
