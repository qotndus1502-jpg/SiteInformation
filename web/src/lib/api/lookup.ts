import { API_BASE } from "./client";

/* ── Lookup response types — shared with site-form-dialog ── */

export interface Corporation { id: number; name: string; code: string }
export interface Region { code: string; name: string; region_group: string | null }
export interface FacilityType { code: string; name: string; division: string | null }
export interface ClientOrg { id: number; name: string; org_type: string | null }
export interface PartnerCompany { id: number; name: string; is_group_member: boolean }

/** All lookup endpoints are public reads — no auth needed. */
export async function fetchCorporations(): Promise<Corporation[]> {
  const res = await fetch(`${API_BASE}/api/lookup/corporations`);
  return res.json();
}

export async function fetchRegions(): Promise<Region[]> {
  const res = await fetch(`${API_BASE}/api/lookup/regions`);
  return res.json();
}

export async function fetchFacilityTypes(): Promise<FacilityType[]> {
  const res = await fetch(`${API_BASE}/api/lookup/facility-types`);
  return res.json();
}

export async function fetchClients(): Promise<ClientOrg[]> {
  const res = await fetch(`${API_BASE}/api/lookup/clients`);
  return res.json();
}

export async function fetchOrderTypes(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/lookup/order-types`);
  return res.json();
}

export async function fetchPartners(): Promise<PartnerCompany[]> {
  const res = await fetch(`${API_BASE}/api/lookup/partners`);
  return res.json();
}

/** Convenience: fetch every lookup in parallel for forms that need them all
 *  (used by site-form-dialog). Returns a tuple in a stable order. */
export async function fetchAllLookups(): Promise<
  [Corporation[], Region[], FacilityType[], ClientOrg[], string[], PartnerCompany[]]
> {
  return Promise.all([
    fetchCorporations(),
    fetchRegions(),
    fetchFacilityTypes(),
    fetchClients(),
    fetchOrderTypes(),
    fetchPartners(),
  ]);
}
