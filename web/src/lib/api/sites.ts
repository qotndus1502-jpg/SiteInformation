import { authFetch, handleMutation, API_BASE } from "./client";
import type { SiteDashboard } from "@/types/database";

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

export async function fetchSites(filter: Record<string, string | undefined> = {}): Promise<SiteDashboard[]> {
  const qs = buildQueryString(filter);
  const url = `${API_BASE}/api/sites${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const res = await fetch(`${API_BASE}/api/filter-options`);
  return res.json();
}

export async function fetchSiteRaw(siteId: number): Promise<SiteRaw | null> {
  const res = await fetch(`${API_BASE}/api/sites/${siteId}/raw`);
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
