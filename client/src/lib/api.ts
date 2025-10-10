import { supabase } from "./supabaseClient";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function getCsrfToken(): Promise<string | undefined> {
  try {
    const res = await fetch("/api/csrf-token", { credentials: "include" });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.csrfToken;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T = any>(
  method: HttpMethod,
  url: string,
  body?: any,
  extraHeaders?: Record<string, string>
): Promise<T> {
  // Get Supabase session access token for Authorization header
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  // For state-changing requests, attach CSRF header
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (method !== "GET") {
    const csrf = await getCsrfToken();
    if (csrf) headers["x-csrf-token"] = csrf;
  }

  const resp = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    credentials: "include",
  });

  if (resp.status === 401) {
    // Unauthenticated -> redirect to login
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthenticated");
  }
  if (resp.status === 403) {
    // Forbidden -> surface friendly error
    const msg = "You do not have permission to perform this action";
    throw new Error(msg);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (!resp.ok) {
    let errMsg = `Request failed: ${resp.status}`;
    try {
      if (contentType.includes("application/json")) {
        const err = await resp.json();
        errMsg = err?.message || errMsg;
      } else {
        errMsg = await resp.text();
      }
    } catch {}
    throw new Error(errMsg);
  }

  if (contentType.includes("application/json")) {
    return (await resp.json()) as T;
  }
  return (await resp.text()) as unknown as T;
}
