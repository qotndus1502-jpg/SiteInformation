import { createClient } from "@/lib/supabase/client";
import { API_BASE } from "@/lib/env";

/** Client-side fetch wrapper that attaches the Supabase JWT. Use for all
 *  mutations and any read endpoints the backend protects. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_BASE}${path}`, { ...init, headers });
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
