"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SiteDashboard, SiteStatus } from "@/types/database";
import { STATUS_CONFIG } from "@/types/database";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

interface Corporation { id: number; name: string; code: string }
interface Region { code: string; name: string; region_group: string | null }
interface FacilityType { code: string; name: string; division: string | null }
interface ClientOrg { id: number; name: string; org_type: string | null }

interface FormState {
  name: string;
  corporation_id: string;
  division: string;
  category: string;
  region_code: string;
  facility_type_code: string;
  order_type: string;
  client_org_id: string;
  contract_amount: string;
  start_date: string;
  end_date: string;
  office_address: string;
  status: string;
}

const EMPTY: FormState = {
  name: "", corporation_id: "", division: "", category: "",
  region_code: "", facility_type_code: "", order_type: "", client_org_id: "",
  contract_amount: "", start_date: "", end_date: "",
  office_address: "", status: "",
};

function siteToForm(site: SiteDashboard, corps: Corporation[], regions: Region[], facs: FacilityType[], clients: ClientOrg[]): FormState {
  const corp = corps.find((c) => c.name === site.corporation_name);
  const region = regions.find((r) => r.name === site.region_name);
  const fac = facs.find((f) => f.name === site.facility_type_name);
  const client = clients.find((c) => c.name === site.client_name);
  return {
    name: site.site_name ?? "",
    corporation_id: corp ? String(corp.id) : "",
    division: site.division ?? "",
    category: site.category ?? "",
    region_code: region?.code ?? "",
    facility_type_code: fac?.code ?? "",
    order_type: site.order_type ?? "",
    client_org_id: client ? String(client.id) : "",
    contract_amount: site.contract_amount != null ? String(site.contract_amount) : "",
    start_date: site.start_date ?? "",
    end_date: site.end_date ?? "",
    office_address: site.office_address ?? "",
    status: site.status ?? "",
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
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!site;

  /* Lookup 데이터 로드 (열릴 때 1회) */
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch(`${API_BASE}/api/lookup/corporations`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/regions`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/facility-types`).then((r) => r.json()),
      fetch(`${API_BASE}/api/lookup/clients`).then((r) => r.json()),
    ]).then(([c, r, f, cl]) => {
      setCorps(c); setRegions(r); setFacs(f); setClients(cl);
    }).catch(() => {});
  }, [open]);

  /* site가 있으면 form 초기화 */
  useEffect(() => {
    if (!open) return;
    if (site && corps.length && regions.length && facs.length && clients.length) {
      setForm(siteToForm(site, corps, regions, facs, clients));
    } else if (!site) {
      setForm(EMPTY);
    }
    setError(null);
  }, [open, site, corps, regions, facs, clients]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

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
      client_org_id: form.client_org_id ? Number(form.client_org_id) : null,
      contract_amount: form.contract_amount ? Number(form.contract_amount) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      office_address: form.office_address || null,
      status: form.status || null,
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
      onSaved?.();
      onOpenChange(false);
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

          <div className="flex flex-col gap-1.5">
            <Label>법인 *</Label>
            <Select value={form.corporation_id} onValueChange={(v) => set("corporation_id", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {corps.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>부문 *</Label>
            <Select value={form.division} onValueChange={(v) => set("division", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="토목">토목</SelectItem>
                <SelectItem value="건축">건축</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>공종 *</Label>
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>상태</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as SiteStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{STATUS_CONFIG[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>지역</Label>
            <Select value={form.region_code} onValueChange={(v) => set("region_code", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>시설유형</Label>
            <Select value={form.facility_type_code} onValueChange={(v) => set("facility_type_code", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {facs.map((f) => <SelectItem key={f.code} value={f.code}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>발주유형</Label>
            <Input value={form.order_type} onChange={(e) => set("order_type", e.target.value)} placeholder="공공/민간 등" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>발주처</Label>
            <Select value={form.client_org_id} onValueChange={(v) => set("client_org_id", v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>공사금액 (억)</Label>
            <Input type="number" step="0.01" value={form.contract_amount} onChange={(e) => set("contract_amount", e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>착공일</Label>
            <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>준공예정일</Label>
            <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>주소 (현장 또는 사무실)</Label>
            <Input value={form.office_address} onChange={(e) => set("office_address", e.target.value)} placeholder="예: 서울특별시 강남구 테헤란로 152" />
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
