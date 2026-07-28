export function getCsrfToken() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )panpan_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function adminFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (init.method && init.method !== "GET") {
    headers.set("x-csrf-token", getCsrfToken());
  }
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(input, { ...init, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data;
}
