import { authFetch } from "./client";

export type GeocodePreviewResponse =
  | { ok: true; latitude: number; longitude: number; matched_address?: string; region_name?: string; region_code?: string | null }
  | { ok: false; reason?: string };

/** Address → coords preview (no DB write). Powers the '좌표 매칭하기' button
 *  in site-form-dialog. Admin-only on the backend. */
export async function previewGeocode(address: string): Promise<GeocodePreviewResponse> {
  const res = await authFetch(`/api/geocode/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  return res.json().catch(() => ({ ok: false } as const));
}
