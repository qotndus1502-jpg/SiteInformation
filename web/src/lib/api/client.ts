import { createClient } from "@/lib/supabase/client";
import { API_BASE } from "@/lib/env";

/** Browser-only fetch wrapper that attaches the user's Supabase JWT.
 *  Uses the shared browser Supabase client to read the session, so it
 *  must only run in client code (mutation handlers, client-side filter
 *  refetches). Server Components must NOT call this — they should call
 *  `authFetchServer` from `auth-server.ts`, which reads the JWT from
 *  the request cookies via the SSR Supabase client.
 *
 *  We deliberately do NOT do `if (typeof window === "undefined")`
 *  branching here: even guarded dynamic imports of the server module
 *  get statically traced into the client bundle by Next.js's bundler,
 *  which then fails with "next/headers can only be used in App Router
 *  Server Components." Splitting the two paths into separate files
 *  keeps the client bundle clean. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

/** Pure fetch wrapper that takes an already-acquired bearer token (or
 *  none). Both `authFetch` (client) and `authFetchServer` (server) use
 *  this internally; data-layer helpers (fetchSites, etc.) call this
 *  directly when a server caller passes the token in. */
export async function fetchWithAuth(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...rest, headers });
}

/** Read mutation responses uniformly: success = `.json()`, failure = throw with
 *  the backend's `detail` field (or a generic message). Used by every api/*.ts
 *  module so error UX is consistent across the app. */
export async function handleMutation<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "요청 실패";
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export { API_BASE };
