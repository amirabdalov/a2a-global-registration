import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// Session token management — stored in memory (not localStorage, which is blocked in iframes)
let sessionToken: string | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export function clearSession() {
  sessionToken = null;
}

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      // Redirect to login
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
    const res = await fetch(`${API_BASE}${queryKey.join("/")}`, { headers });

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
