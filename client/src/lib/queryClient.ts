import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// Session token — stored in memory AND cookie (cookie persists across refresh)
let sessionToken: string | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
  // Also store in cookie for persistence across page refreshes
  if (token) {
    document.cookie = `a2a_session=${token}; path=/; max-age=${730 * 24 * 60 * 60}; SameSite=None; Secure`;
  } else {
    document.cookie = "a2a_session=; path=/; max-age=0";
  }
}

export function getSessionToken(): string | null {
  if (sessionToken) return sessionToken;
  // Try to read from cookie
  const match = document.cookie.match(/a2a_session=([^;]+)/);
  if (match) {
    sessionToken = match[1];
    return sessionToken;
  }
  return null;
}

export function clearSession() {
  sessionToken = null;
  document.cookie = "a2a_session=; path=/; max-age=0";
}

export function isAuthenticated(): boolean {
  return !!getSessionToken();
}

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getSessionToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      if (window.location.hash !== "#/auth/login" && window.location.hash !== "#/auth/signup") {
        window.location.hash = "#/auth/login";
      }
      throw new Error("Session expired. Please sign in again.");
    }
    const text = (await res.text()) || res.statusText;
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || `${res.status}: ${text}`);
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = getAuthHeaders(data ? { "Content-Type": "application/json" } : {});
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    credentials: "include",
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
