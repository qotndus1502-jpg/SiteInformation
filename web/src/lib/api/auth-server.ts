import "server-only";

import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { fetchWithAuth } from "./client";

/** Server-only fetch wrapper that reads the user's Supabase session from
 *  the request cookies (via `@/lib/supabase/server`) and forwards the JWT
 *  to the Python backend. Use this in Server Components / Route Handlers
 *  / Server Actions where the request context is available.
 *
 *  This file is gated by `import "server-only"` — Next.js will fail the
 *  build if anything in the client bundle tries to import it, so the
 *  client/server split is enforced at compile time. */
export async function authFetchServer(path: string, init: RequestInit = {}): Promise<Response> {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return fetchWithAuth(path, { ...init, token: session?.access_token ?? undefined });
}

/** Helper for callers that want just the token (e.g. to forward to a
 *  data-layer function that already does the actual fetch). */
export async function getServerAuthToken(): Promise<string | undefined> {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? undefined;
}
