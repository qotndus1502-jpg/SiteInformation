import { authFetch, fetchWithAuth, handleMutation } from "./client";
import type { SiteDashboard } from "@/types/database";

/** Reads accept an optional `token` so server callers (page.tsx) can pass
 *  the JWT they read from cookies via `auth-server.ts`. Browser callers
 *  omit `token` and hit the auto-grabbing `authFetch` path. */

/* ── Site filter / options types ── */

export interface SiteFilter {
  corporation?: string;
  region?: string;
  facilityType?: string;
  orderType?: string;
  division?: string;
  status?: string;
  search?: string;
  amountRanges?: string;   // comma-separated: "100-500,1000-2000"
  progressRanges?: string; // comma-separated: "30-50,70-90"
  managingEntity?: string; // comma-separated entity IDs: "12,15"
}

export interface ManagingEntityOption {
  id: number;
  name: string;
  corporation_id: number;
  corporation_name: string | null;
}

export interface FilterOptions {
  corporations: string[];
  regions: string[];
  facilityTypes: string[];
  orderTypes: string[];
  divisions: string[];
  statuses: string[];
  managingEntities: ManagingEntityOption[];
}

/** Raw project_site row used by the edit form to populate the matched
 *  address / coords (fields the dashboard view does not surface). */
export interface SiteRaw {
  id: number;
  office_address: string | null;
  site_address: string | null;
  latitude: number | null;
  longitude: number | null;
}

/* ── Helpers ── */

function buildQueryString(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return new URLSearchParams(entries as [string, string][]).toString();
}

/* ── Reads ── */

/** Default empty value used when a fetch fails — keeps callers' assumption
 *  that they always get an array, even on 401/500. Prevents "sites.map is
 *  not a function" downstream. */
const EMPTY_SITES: SiteDashboard[] = [];

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  corporations: [],
  regions: [],
  facilityTypes: [],
  orderTypes: [],
  divisions: [],
  statuses: [],
  managingEntities: [],
};

export async function fetchSites(
  filter: Record<string, string | undefined> = {},
  init?: { signal?: AbortSignal; token?: string },
): Promise<SiteDashboard[]> {
  const qs = buildQueryString(filter);
  const path = `/api/sites${qs ? `?${qs}` : ""}`;
  const res = init?.token !== undefined
    ? await fetchWithAuth(path, { signal: init.signal, token: init.token })
    : await authFetch(path, { signal: init?.signal });
  if (!res.ok) {
    if (typeof window !== "undefined") {
      console.warn(`[fetchSites] ${res.status}: ${res.statusText}`);
    }
    return EMPTY_SITES;
  }
  const body = await res.json();
  // Backend always returns an array on success; defend against shape drift
  // (e.g. error envelopes that slip past `res.ok`).
  return Array.isArray(body) ? (body as SiteDashboard[]) : EMPTY_SITES;
}

export async function fetchFilterOptions(init?: { token?: string }): Promise<FilterOptions> {
  const res = init?.token !== undefined
    ? await fetchWithAuth(`/api/filter-options`, { token: init.token })
    : await authFetch(`/api/filter-options`);
  if (!res.ok) {
    if (typeof window !== "undefined") {
      console.warn(`[fetchFilterOptions] ${res.status}: ${res.statusText}`);
    }
    return EMPTY_FILTER_OPTIONS;
  }
  const body = await res.json();
  // Sanity check that the response has the expected shape — backend errors
  // come back as `{detail: "..."}` not the FilterOptions object.
  return body && typeof body === "object" && "corporations" in body
    ? (body as FilterOptions)
    : EMPTY_FILTER_OPTIONS;
}

export async function fetchSiteRaw(siteId: number, init?: { token?: string }): Promise<SiteRaw | null> {
  const res = init?.token !== undefined
    ? await fetchWithAuth(`/api/sites/${siteId}/raw`, { token: init.token })
    : await authFetch(`/api/sites/${siteId}/raw`);
  if (!res.ok) return null;
  return res.json();
}

/* ── Mutations ── */

export interface SaveSiteResponse {
  ok: boolean;
  id: number;
  site: SiteDashboard | null;
}

export async function createSite(payload: Record<string, unknown>): Promise<SaveSiteResponse> {
  const res = await authFetch(`/api/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleMutation<SaveSiteResponse>(res);
}

export async function updateSite(siteId: number, payload: Record<string, unknown>): Promise<SaveSiteResponse> {
  const res = await authFetch(`/api/sites/${siteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleMutation<SaveSiteResponse>(res);
}

export async function deleteSite(siteId: number): Promise<{ ok: boolean; id: number; deleted: number }> {
  const res = await authFetch(`/api/sites/${siteId}`, { method: "DELETE" });
  return handleMutation(res);
}

export async function uploadSiteImage(file: File, siteId: number | string): Promise<{ ok: boolean; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("site_id", String(siteId));
  const res = await authFetch(`/api/upload-site-image`, { method: "POST", body: formData });
  return handleMutation(res);
}
