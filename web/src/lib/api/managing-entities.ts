import { authFetch, handleMutation, API_BASE } from "./client";

export interface ManagingEntity {
  id: number;
  name: string;
  sort_order: number;
  corporation_id: number;
  corporation_name: string | null;
  site_count: number;
}

export interface AssignableSite {
  id: number;
  name: string;
  managing_entity_id: number | null;
}

export async function fetchManagingEntities(): Promise<ManagingEntity[]> {
  const res = await fetch(`${API_BASE}/api/managing-entities`);
  return res.json();
}

export async function createManagingEntity(payload: {
  name: string;
  corporation_id: number;
  sort_order?: number;
}): Promise<{ ok: boolean; entity: ManagingEntity }> {
  const res = await authFetch(`/api/managing-entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleMutation(res);
}

export async function updateManagingEntity(
  id: number,
  payload: { name?: string; sort_order?: number },
): Promise<{ ok: boolean; entity: ManagingEntity }> {
  const res = await authFetch(`/api/managing-entities/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleMutation(res);
}

export async function deleteManagingEntity(id: number): Promise<{ ok: boolean }> {
  const res = await authFetch(`/api/managing-entities/${id}`, { method: "DELETE" });
  return handleMutation(res);
}

export async function fetchAssignableSites(entityId: number): Promise<AssignableSite[]> {
  const res = await authFetch(`/api/managing-entities/${entityId}/assignable-sites`);
  if (!res.ok) throw new Error(`사이트 조회 실패 (${res.status})`);
  return res.json();
}

export async function assignSites(
  entityId: number,
  siteIds: number[],
): Promise<{ ok: boolean; entity_id: number; assigned: number; unset: number }> {
  const res = await authFetch(`/api/managing-entities/${entityId}/sites`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ site_ids: siteIds }),
  });
  return handleMutation(res);
}
