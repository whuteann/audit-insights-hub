import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
  updateAccessToken,
  type AppUser,
} from "@/lib/authStorage";

const apiBaseRaw = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
const API_BASE_URL = apiBaseRaw.replace(/\/+$/, "");
const AUTH_PATHS = ["/auth/login", "/auth/refresh"];

let isInstalled = false;
let refreshPromise: Promise<string | null> | null = null;

function isApiRequest(url: string): boolean {
  return url.startsWith(API_BASE_URL);
}

function isAuthEndpoint(url: string): boolean {
  return AUTH_PATHS.some((path) => url.startsWith(`${API_BASE_URL}${path}`));
}

async function tryRefreshAccessToken(originalFetch: typeof window.fetch): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  const response = await originalFetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload.access_token !== "string") {
    clearAuthSession();
    return null;
  }

  if (typeof payload.refresh_token === "string" && payload.user) {
    setAuthSession(payload.access_token, payload.refresh_token, payload.user as AppUser);
  } else {
    updateAccessToken(payload.access_token);
  }

  return payload.access_token;
}

export function installApiAuthFetch(): void {
  if (isInstalled) return;
  isInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const originalRequest = new Request(input, init);
    const requestUrl = originalRequest.url;

    if (!isApiRequest(requestUrl)) {
      return originalFetch(input, init);
    }

    const requestWithToken = (token: string | null): Request => {
      const cloned = originalRequest.clone();
      const headers = new Headers(cloned.headers);

      if (token && !isAuthEndpoint(requestUrl)) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return new Request(cloned, { headers });
    };

    let response = await originalFetch(requestWithToken(getAccessToken()));

    if (response.status !== 401 || isAuthEndpoint(requestUrl)) {
      return response;
    }

    if (!refreshPromise) {
      refreshPromise = tryRefreshAccessToken(originalFetch).finally(() => {
        refreshPromise = null;
      });
    }
    const refreshedToken = await refreshPromise;
    if (!refreshedToken) {
      return response;
    }

    response = await originalFetch(requestWithToken(refreshedToken));
    return response;
  };
}
