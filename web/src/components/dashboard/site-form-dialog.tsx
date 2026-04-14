"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import type { SiteDashboard, SiteStatus } from "@/types/database";
import { STATUS_CONFIG } from "@/types/database";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

interface Corporation { id: number; name: string; code: string }
interface Region { code: string; name: string; region_group: string | null }
interface FacilityType { code: string; name: string; division: string | null }
interface ClientOrg { id: number; name: string; org_type: string | null }
interface PartnerCompany { id: number; name: string; is_group_member: boolean }

interface JvPartnerRow { name: string; share_pct: string }

interface FormState {
  name: string;
  corporation_id: string;
  division: string;
  category: string;
  region_code: string;
  facility_type_code: string;
  order_type: string;
  client_name: string;
  contract_amount: string;
  our_share_ratio: string;
  start_date: string;
  end_date: string;
  office_address: string;
  site_address: string;
  status: string;
  jv_partners: JvPartnerRow[];
}

const EMPTY: FormState = {
  name: "", corporation_id: "", division: "", category: "",
  region_code: "", facility_type_code: "", order_type: "", client_name: "",
  contract_amount: "", our_share_ratio: "", start_date: "", end_date: "",
  office_address: "", site_address: "", status: "", jv_partners: [],
};

/* Parse jv_summary text "법인A 50.00%, 회사B 30.00%" → [{name, ratio}]. */
function parseJvSummary(text: string | null | undefined): { name: string; pct: number }[] {
  if (!text) return [];
  return text.split(",").map((seg) => {
    const m = seg.trim().match(/^(.+?)\s+([\d.]+)%$/);
    return m ? { name: m[1].trim(), pct: Number(m[2]) } : null;
  }).filter((x): x is { name: string; pct: number } => !!x);
}

function siteToForm(site: SiteDashboard, corps: Corporation[], regions: Region[], facs: FacilityType[]): FormState {
  const corp = corps.find((c) => c.name === site.corporation_name);
  const region = regions.find((r) => r.name === site.region_name);
  const fac = facs.find((f) => f.name === site.facility_type_name);
  const parsedJv = parseJvSummary((site as { jv_summary?: string | null }).jv_summary);
  const corpName = site.corporation_name ?? "";
  const ourEntry = parsedJv.find((p) => p.name === corpName);
  const ourPct = ourEntry?.pct ?? (parsedJv.length === 0 ? 100 : 0);
  const others = parsedJv.filter((p) => p.name !== corpName);
  return {
    name: site.site_name ?? "",
    corporation_id: corp ? String(corp.id) : "",
    division: site.division ?? "",
    category: site.category ?? "",
    region_code: region?.code ?? "",
    facility_type_code: fac?.code ?? "",
    order_type: site.order_type ?? "",
    client_name: site.client_name ?? "",
    contract_amount: site.contract_amount != null ? String(site.contract_amount) : "",
    our_share_ratio: ourPct ? String(ourPct) : "",
    start_date: site.start_date ?? "",
    end_date: site.end_date ?? "",
    office_address: site.office_address ?? "",
    site_address: "",
    status: site.status ?? "",
    jv_partners: others.map((o) => ({ name: o.name, share_pct: String(o.pct) })),
  };
}

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: SiteDashboard | null; // null/undefined면 추가 모드
  onSaved?: () => void;
}

export function SiteFormDialog({ open, onOpenChange, site, onSaved }: SiteFormDialogProps) {
  const [corps, setCorps] = useState<Corporation[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [facs, setFacs] = useState<FacilityType[]>([]);
  const [clients, setClients] = useState<ClientOrg[]>([]);
  const [orderTypes, setOrderTypes] = useState<string[]>([]);
  const [partners, setPartners] = useState<PartnerCompany[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<
    | { ok: true; lat: number; lon: number }
    | { ok: false; reason?: string }
    | null
  >(null);

  const handleGeocodePreview = async () => {
    const address = (form.site_address || form.office_address).trim();
    if (!address) {
      setGeocodeResult({ ok: false, reason: "주소를 먼저 입력해 주세요" });
      return;
    }
    setGeocoding(true);
    try {
      const res = await fetch(`${API_BASE}/api/geocode/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const j = await res.json().catch(() => ({}));
      if (j?.ok && j.latitude != null && j.longitude != null) {
        setGeocodeResult({ ok: true, lat: j.latitude, lon: j.longitude });
        const matched = j.matched_address || address;
        setForm((prev) => ({
          ...prev,
          site_address: matched,
          // region_code가 비어 있을 때만 지오코딩 결과로 자동 채움 (사용자 선택 보존)
          region_code: prev.region_code || j.region_code || "",
        }));
      } else {
        setGeocodeResult({ ok: false, reason: j?.reason });
      }
    } catch (e) {
      setGeocodeResult({ ok: false, reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setGeocoding(false);
    }
  };

  const isEdit = !!site;

  /* Lookup 데이터 로드 (열릴 때 1회) */
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch(`${API_BASE}/api/lookup/corporations`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/regions`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/facility-types`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/clients`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/order-types`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/partners`).then((r) => r.json()),
    ]).then(([c, r, f, cl, ot, pt]) => {
      setCorps(c); setRegions(r); setFacs(f); setClients(cl); setOrderTypes(ot); setPartners(pt);
    }).catch(() => {});
  }, [open]);

  /* site가 있으면 form 초기화 + project_site raw에서 site_address 로드 */
  useEffect(() => {
    if (!open) return;
    if (site && corps.length && regions.length && facs.length) {
      setForm(siteToForm(site, corps, regions, facs));
      fetch(`${API_BASE}/api/sites/${site.id}/raw`)
        .then((r) => r.ok ? r.json() : null)
        .then((raw) => {
          if (raw?.site_address) {
            setForm((prev) => ({ ...prev, site_address: raw.site_address }));
          }
        })
        .catch(() => {});
    } else if (!site) {
      setForm(EMPTY);
    }
    setError(null);
    setGeocodeResult(null);
  }, [open, site, corps, regions, facs, clients]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateJvPartner = (idx: number, field: keyof JvPartnerRow, value: string) =>
    setForm((prev) => {
      const next = prev.jv_partners.slice();
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, jv_partners: next };
    });
  const addJvPartner = () =>
    setForm((prev) => ({ ...prev, jv_partners: [...prev.jv_partners, { name: "", share_pct: "" }] }));
  const removeJvPartner = (idx: number) =>
    setForm((prev) => ({ ...prev, jv_partners: prev.jv_partners.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      corporation_id: form.corporation_id ? Number(form.corporation_id) : null,
      division: form.division || null,
      category: form.category || null,
      region_code: form.region_code || null,
      facility_type_code: form.facility_type_code || null,
      order_type: form.order_type || null,
      client_name: form.client_name || null,
      contract_amount: form.contract_amount ? Number(form.contract_amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      office_address: form.office_address || null,
      site_address: form.site_address || null,
      status: form.status || null,
      our_share_ratio: form.our_share_ratio ? Number(form.our_share_ratio) : null,
      jv_partners: form.jv_partners
        .filter((p) => p.name.trim() && p.share_pct)
        .map((p) => ({ name: p.name.trim(), share_pct: Number(p.share_pct) })),
    };

    const url = isEdit ? `${API_BASE}/api/sites/${site!.id}` : `${API_BASE}/api/sites`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `저장 실패 (${res.status})`);
      }
      const json = await res.json().catch(() => ({}));
      const savedSite = json?.site as { latitude?: number | null; longitude?: number | null; site_address?: string | null } | undefined;
      const hasAddress = !!(form.office_address.trim() || form.site_address.trim());
      const matched = savedSite?.latitude != null && savedSite?.longitude != null;
      // 응답의 site_address(매칭에 성공한 주소)를 폼에 반영 — box 2 자동 채움
      if (savedSite?.site_address) {
        setForm((prev) => ({ ...prev, site_address: savedSite.site_address! }));
      }
      onSaved?.();
      if (hasAddress && !matched) {
        // 매칭 실패 시에만 다이얼로그를 유지해 box 2 직접 입력을 유도
        setGeocodeResult({ ok: false });
      } else {
        onOpenChange(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "현장 편집" : "현장 추가"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "현장 정보를 수정합니다." : "새로운 현장을 등록합니다."} 주소를 입력하면 좌표는 자동으로 설정됩니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 pt-2">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>현장명 *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>주소 (표시용)</Label>
            <Input value={form.office_address} onChange={(e) => { set("office_address", e.target.value); setGeocodeResult(null); }} placeholder="예: 서울 서대문구 충정로 29" />
            <p className="text-[11px] text-muted-foreground">현장 상세 카드에 보이는 주소입니다.</p>
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>지도 매칭 주소</Label>
            <div className="flex gap-2">
              <Input
                value={form.site_address}
                onChange={(e) => { set("site_address", e.target.value); setGeocodeResult(null); }}
                placeholder={geocodeResult?.ok === false ? "지도 매칭을 위한 주소를 입력해주세요" : "좌표 매칭하기를 눌러주세요"}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeocodePreview}
                disabled={geocoding}
                className="h-9 shrink-0"
              >
                {geocoding ? "매칭 중..." : "좌표 매칭하기"}
              </Button>
            </div>
            {geocodeResult?.ok === true && (
              <p className="text-[12px] text-emerald-600">
                ✓ 좌표 매칭 완료 (위도 {geocodeResult.lat.toFixed(5)}, 경도 {geocodeResult.lon.toFixed(5)})
              </p>
            )}
            {geocodeResult?.ok === false && (
              <p className="text-[12px] text-red-600">
                ✗ 좌표 매칭 실패{geocodeResult.reason ? ` — ${geocodeResult.reason}` : " — 도로명/지번 주소 형식을 확인해 주세요"}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>법인 *</Label>
            <Select value={form.corporation_id} onValueChange={(v) => set("corporation_id", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {corps.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>부문 *</Label>
            <Select value={form.division} onValueChange={(v) => set("division", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="토목">토목</SelectItem>
                <SelectItem value="건축">건축</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>착공일</Label>
            <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>준공예정일</Label>
            <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>공종 *</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="주간">주간</SelectItem>
                <SelectItem value="비주간">비주간</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>상태</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as SiteStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{STATUS_CONFIG[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>시설유형</Label>
            <Select value={form.facility_type_code} onValueChange={(v) => set("facility_type_code", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {facs.map((f) => <SelectItem key={f.code} value={f.code}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>발주유형</Label>
            <Select value={form.order_type} onValueChange={(v) => set("order_type", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {orderTypes.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>지역</Label>
            <Select value={form.region_code} onValueChange={(v) => set("region_code", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>발주처</Label>
            <Input
              list="client-org-list"
              value={form.client_name}
              onChange={(e) => set("client_name", e.target.value)}
              placeholder="직접 입력 (기존 항목 선택 가능)"
            />
            <datalist id="client-org-list">
              {clients.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>공사금액 (억)</Label>
            <Input type="number" step="0.01" value={form.contract_amount} onChange={(e) => set("contract_amount", e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>자사도급비율 (%)</Label>
            <Input type="number" step="0.01" min="0" max="100" value={form.our_share_ratio} onChange={(e) => set("our_share_ratio", e.target.value)} placeholder="예: 50" />
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>공동도급</Label>
            {form.jv_partners.length > 0 && (
              <div className="flex gap-2 items-center text-[13px] text-muted-foreground px-0.5">
                <span className="flex-1">업체명</span>
                <span className="w-24">도급비율 (%)</span>
                <span className="w-9" />
              </div>
            )}
            {form.jv_partners.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  list="partner-company-list"
                  value={p.name}
                  onChange={(e) => updateJvPartner(idx, "name", e.target.value)}
                  placeholder="업체명"
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={p.share_pct}
                  onChange={(e) => updateJvPartner(idx, "share_pct", e.target.value)}
                  placeholder="예: 50"
                  className="w-24"
                />
                <button
                  type="button"
                  onClick={() => removeJvPartner(idx)}
                  aria-label="삭제"
                  className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addJvPartner}
              className="h-9 w-full justify-center gap-1 text-[13px] font-normal text-muted-foreground hover:text-foreground border-dashed"
            >
              <Plus className="h-3.5 w-3.5" />
              공동도급 추가
            </Button>
            <datalist id="partner-company-list">
              {partners.map((p) => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>

          {error && (
            <p className="col-span-2 text-[12px] text-destructive">{error}</p>
          )}

          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "저장 중..." : isEdit ? "저장" : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
