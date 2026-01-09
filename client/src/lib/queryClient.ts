import { QueryClient, type QueryFunction } from "@tanstack/react-query";

// Get the base API URL from environment variables
// Prefer relative URLs in development/same-origin to avoid CORS & SSL issues
const getBaseApiUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

  // No explicit API URL -> use relative paths in dev
  if (!apiUrl) return "";

  // Normalize (remove trailing slash)
  const normalized = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

  // If same-origin as current page, prefer relative
  try {
    const current = window.location;
    // On Vercel domains, prefer same-origin so rewrites proxy /api -> server
    if (/\.vercel\.app$/.test(current.hostname)) {
      return "";
    }
    const parsed = new URL(normalized);
    if (parsed.host === current.host) {
      return "";
    }

    // Handle local dev misconfig: https://localhost or https://127.0.0.1 without TLS
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isHttps = parsed.protocol === "https:";
    if (isLocal && isHttps) {
      // Downgrade to http to prevent net::ERR_SSL_PROTOCOL_ERROR in local dev
      parsed.protocol = "http:";
      const downgraded = parsed.toString().replace(/\/$/, "");
      console.warn(
        "[ApiRequest] Downgrading VITE_API_URL to http for local dev:",
        downgraded,
      );
      return downgraded;
    }

    return normalized;
  } catch {
    // If URL parsing fails in non-browser context, fall back to normalized
    return normalized;
  }
};

// Helper function to construct full API URLs
const getApiUrl = (path: string): string => {
  const baseUrl = getBaseApiUrl();
  // Ensure path starts with / for proper concatenation
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone the response so we can read it without consuming the original
    const clonedRes = res.clone();
    const text = (await clonedRes.text()) || res.statusText;

    // ENHANCED DEBUGGING for authentication issues
    console.error("[ApiRequest] ❌ HTTP Error:", {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      text,
      headers: Object.fromEntries(res.headers.entries()),
      cookiesInResponse: res.headers.get("set-cookie"),
      timestamp: new Date().toISOString(),
    });

    throw new Error(`${res.status}: ${text}`);
  }
}

// Overloaded function to support both old and new calling patterns
export async function apiRequest<T = any>(
  urlOrMethod: string,
  optionsOrUrl?: any,
  dataOrUndefined?: any,
): Promise<T> {
  let method: string;
  let url: string;
  let data: any;

  // Check if called with new signature: apiRequest(method, url, data)
  if (typeof optionsOrUrl === "string" && dataOrUndefined !== undefined) {
    method = urlOrMethod;
    url = getApiUrl(optionsOrUrl);
    data = dataOrUndefined;
  }
  // Check if called with new signature: apiRequest(method, url)
  else if (typeof optionsOrUrl === "string" && dataOrUndefined === undefined) {
    method = urlOrMethod;
    url = getApiUrl(optionsOrUrl);
    data = undefined;
  }
  // Old signature: apiRequest(url, options)
  else {
    url = getApiUrl(urlOrMethod);
    const options = optionsOrUrl || {};
    method = options.method || "GET";
    // Handle both raw data objects and pre-stringified JSON bodies
    if (options.body) {
      if (typeof options.body === "string") {
        data = options.body; // Already stringified
      } else {
        data = options.body; // Raw object, will be stringified later
      }
    }

    // Build request options with custom headers support
    const requestOptions: RequestInit = {
      method,
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}), // Merge custom headers (like Authorization)
      },
      credentials: "include", // This sends session cookies for authentication
    };

    // Handle body based on whether it's already stringified or not
    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      requestOptions.body =
        typeof data === "string" ? data : JSON.stringify(data);
    }

    const response = await fetch(url, requestOptions);
    await throwIfResNotOk(response);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    // Fallback: non-JSON response (often HTML when a proxy serves index.html)
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Unexpected non-JSON response from API: ${response.status} ${response.statusText} at ${response.url}. First 120 chars: ${text.slice(
          0,
          120,
        )}`,
      );
    }
  }

  // For new signature calls, build standard request options
  const requestOptions: RequestInit = {
    method,
    mode: "cors", // Explicit CORS mode
    cache: "no-cache", // Prevent caching issues with authentication
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include", // This sends session cookies for authentication
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    requestOptions.body = JSON.stringify(data);
  }

  // CRITICAL: Log frontend request details for debugging (new signature)
  console.log("[ApiRequest] 🚀 Frontend request details (new sig):", {
    url,
    method,
    hasCredentials: requestOptions.credentials === "include",
    headers: requestOptions.headers,
    cookiesAvailable: document.cookie ? "YES" : "NO",
    cookieSnippet: document.cookie.substring(0, 100),
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(url, requestOptions);

  // Log response details for debugging (new signature)
  console.log("[ApiRequest] 📥 Response details (new sig):", {
    url,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    cookiesSet: response.headers.get("set-cookie"),
    timestamp: new Date().toISOString(),
  });

  await throwIfResNotOk(response);
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  // Handle unexpected HTML/text response gracefully (likely an auth redirect or SPA shell)
  const text = await response.text();
  // If this looks like HTML, provide a helpful message
  if (/<!doctype|<html/i.test(text)) {
    throw new Error(
      `Unexpected HTML response for ${url}. This usually indicates an auth redirect or proxy served index.html. Status: ${response.status}`,
    );
  }
  // Try to parse if it's actually JSON with wrong content-type
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Unexpected non-JSON response for ${url}. First 120 chars: ${text.slice(
        0,
        120,
      )}`,
    );
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = getApiUrl(queryKey.join("/") as string);

    // CRITICAL: Log query function request details
    console.log("[QueryFn] 🔍 Query request details:", {
      url,
      queryKey,
      cookiesAvailable: document.cookie ? "YES" : "HttpOnly-Hidden",
      cookieSnippet:
        document.cookie.substring(0, 100) || "HttpOnly cookies invisible to JS",
      timestamp: new Date().toISOString(),
      location: window.location.href,
      origin: window.location.origin,
    });

    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-cache", // Prevent caching issues with authentication
      credentials: "include", // Session cookies only, no OAuth token
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Log query function response details
    console.log("[QueryFn] 📥 Query response details:", {
      url,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      cookiesSet: res.headers.get("set-cookie"),
      timestamp: new Date().toISOString(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("[QueryFn] ⚠️ 401 detected, returning null");
      return null;
    }

    // If server responded OK but not JSON (commonly HTML), avoid JSON.parse crash
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const bodyText = await res.text();
      console.warn("[QueryFn] ⚠️ Non-JSON response received:", {
        url,
        status: res.status,
        contentType,
        looksLikeHtml: /<!doctype|<html/i.test(bodyText),
      });
      // Treat HTML response as unauthenticated shell when configured
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw new Error(
        `Unexpected non-JSON response for ${url}. First 120 chars: ${bodyText.slice(
          0,
          120,
        )}`,
      );
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1 * 60 * 1000, // 1 minute for faster initial loads
      gcTime: 5 * 60 * 1000, // Garbage collect after 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on authentication errors or client errors
        if (error instanceof Error && error.message.includes("401"))
          return false;
        if (error instanceof Error && error.message.includes("4")) return false; // Any 4xx error
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry network errors, not business logic errors
        if (error instanceof Error && error.message.includes("Network"))
          return failureCount < 2;
        return false;
      },
      onError: (error) => {
        // Only log unexpected errors, not auth/validation errors
        if (
          error instanceof Error &&
          !error.message.includes("401") &&
          !error.message.includes("400") &&
          !error.message.includes("422")
        ) {
          console.error("Unexpected mutation error:", error.message);
        }
      },
    },
  },
});
