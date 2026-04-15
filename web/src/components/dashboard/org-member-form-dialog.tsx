"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type OrgMemberInput } from "@/lib/queries/org-chart";
import type { Department, OrgMember, OrgRole } from "@/types/org-chart";

type OrgTypeCode = "OWN" | "JV" | "SUB";

interface OrgMemberFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  departments: Department[];
  roles: OrgRole[];
  members: OrgMember[];
  initialMember?: OrgMember | null;
  /** Preset for create mode when opened from a specific team box. */
  presetDepartmentId?: number | null;
  /** Preset for create mode when opened from top-level add. */
  presetRoleCode?: string | null;
  /** 저장 시 부모가 스테이징 또는 API 호출을 처리. memberId<0 이면 스테이징된 생성. */
  onSubmit: (payload: OrgMemberInput, memberId: number | null) => void;
}

const ORG_TYPES: { code: OrgTypeCode; label: string }[] = [
  { code: "OWN", label: "자체" },
  { code: "JV", label: "공동도급" },
  { code: "SUB", label: "외주" },
];

const TOP_LEVEL_ROLE_CODES = new Set(["SITE_MANAGER", "SITE_REP"]);

/**
 * parent_id / department_id를 role 규칙에 따라 자동 계산.
 * - 현장소장: parent=null, dept=null
 * - 현장대리인: parent=현장소장, dept=null
 * - 팀장: parent=현장소장, dept=선택
 * - 팀원/품질관리자/안전관리자: parent=팀 내 팀장(있으면) 없으면 현장소장, dept=선택
 */
function computeHierarchy(
  roleCode: string,
  departmentId: number | null,
  members: OrgMember[],
  roles: OrgRole[]
): { parent_id: number | null; department_id: number | null } {
  const siteManager = members.find(
    (m) => roles.find((r) => r.id === m.role_id)?.code === "SITE_MANAGER"
  );

  // 현장소장·현장대리인 모두 최상위(parent=null)로 배치 — 차트에서 나란히 렌더.
  if (roleCode === "SITE_MANAGER") return { parent_id: null, department_id: null };
  if (roleCode === "SITE_REP") return { parent_id: null, department_id: null };
  if (roleCode === "DEPT_HEAD") {
    return { parent_id: siteManager?.id ?? null, department_id: departmentId };
  }
  // 팀원/품질/안전 등
  const teamHead = members.find(
    (m) =>
      m.department_id === departmentId &&
      roles.find((r) => r.id === m.role_id)?.code === "DEPT_HEAD"
  );
  return {
    parent_id: teamHead?.id ?? siteManager?.id ?? null,
    department_id: departmentId,
  };
}

export function OrgMemberFormDialog({
  open,
  onOpenChange,
  departments,
  roles,
  members,
  initialMember,
  presetDepartmentId,
  presetRoleCode,
  onSubmit,
}: OrgMemberFormDialogProps) {
  const isEdit = initialMember != null;

  const defaultRoleId = useMemo(() => {
    if (initialMember) return initialMember.role_id;
    if (presetRoleCode) return roles.find((r) => r.code === presetRoleCode)?.id ?? 0;
    // 팀 박스에서 추가 시 기본값: 팀원(MEMBER). 팀에 팀장이 없으면 팀장.
    const hasHead = members.some(
      (m) =>
        m.department_id === presetDepartmentId &&
        roles.find((r) => r.id === m.role_id)?.code === "DEPT_HEAD"
    );
    const targetCode = hasHead ? "MEMBER" : "DEPT_HEAD";
    return roles.find((r) => r.code === targetCode)?.id ?? roles[0]?.id ?? 0;
  }, [initialMember, presetRoleCode, presetDepartmentId, roles, members]);

  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState<number>(0);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [orgType, setOrgType] = useState<OrgTypeCode>("OWN");
  const [companyName, setCompanyName] = useState("");
  const [rank, setRank] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset on open.
  useEffect(() => {
    if (!open) return;
    if (initialMember) {
      setName(initialMember.name);
      setRoleId(initialMember.role_id);
      setDepartmentId(initialMember.department_id);
      setOrgType((initialMember.org_type as OrgTypeCode) ?? "OWN");
      setCompanyName(initialMember.company_name ?? "");
      setRank(initialMember.rank ?? "");
      setPhone(initialMember.phone ?? "");
      setEmail(initialMember.email ?? "");
    } else {
      setName("");
      setRoleId(defaultRoleId);
      setDepartmentId(presetDepartmentId ?? null);
      setOrgType("OWN");
      setCompanyName("남광토건");
      setRank("");
      setPhone("");
      setEmail("");
    }
    setError(null);
  }, [open, initialMember, defaultRoleId, presetDepartmentId]);

  const selectedRoleCode = roles.find((r) => r.id === roleId)?.code ?? "";
  const isTopLevelRole = TOP_LEVEL_ROLE_CODES.has(selectedRoleCode);

  const handleSave = () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("이름을 입력해주세요");
      return;
    }
    if (!roleId) {
      setError("직책을 선택해주세요");
      return;
    }
    if (!isTopLevelRole && departmentId == null) {
      setError("소속 팀을 선택해주세요");
      return;
    }

    const hierarchy = computeHierarchy(
      selectedRoleCode,
      isTopLevelRole ? null : departmentId,
      // 편집 시 자기 자신은 parent 후보에서 제외.
      members.filter((m) => m.id !== initialMember?.id),
      roles
    );

    const payload: OrgMemberInput = {
      name: trimmedName,
      role_id: roleId,
      department_id: hierarchy.department_id,
      parent_id: hierarchy.parent_id,
      org_type: orgType,
      company_name: companyName.trim() || null,
      rank: rank.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
    };

    onSubmit(payload, initialMember?.id ?? null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-5 gap-4">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-[16px] font-semibold leading-none">
            {isEdit ? "인원 수정" : "인원 추가"}
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            기본 정보만 입력합니다. 상세 프로필(사진·이력서)은 조직도 카드에서 별도 편집하세요.
          </p>
        </DialogHeader>

        <div
          className={cn(
            "grid grid-cols-2 gap-3",
            "[&_label]:text-[12px] [&_label]:font-medium",
            "[&_input]:!h-9 [&_input]:!text-[13px] [&_input]:!py-2 [&_input]:!rounded-md",
            "[&_[data-slot=select-trigger]]:!h-9 [&_[data-slot=select-trigger]]:!text-[13px] [&_[data-slot=select-trigger]]:!py-2 [&_[data-slot=select-trigger]]:!rounded-md"
          )}
        >
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="om-name">이름 *</Label>
            <Input id="om-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>직책 *</Label>
            <Select
              value={roleId ? String(roleId) : ""}
              onValueChange={(v) => {
                const next = Number(v);
                setRoleId(next);
                const nextCode = roles.find((r) => r.id === next)?.code ?? "";
                if (TOP_LEVEL_ROLE_CODES.has(nextCode)) setDepartmentId(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>소속 팀 {!isTopLevelRole && "*"}</Label>
            <Select
              value={departmentId != null ? String(departmentId) : ""}
              onValueChange={(v) => setDepartmentId(Number(v))}
              disabled={isTopLevelRole}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isTopLevelRole ? "해당 없음" : "선택"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>소속사 구분 *</Label>
            <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgTypeCode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="om-company">회사명</Label>
            <Input
              id="om-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="om-rank">직급</Label>
            <Input
              id="om-rank"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="부장 / 차장 / ..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="om-phone">전화번호</Label>
            <Input
              id="om-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="om-email">이메일</Label>
            <Input
              id="om-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-red-600 -mt-1">{error}</p>
        )}

        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-3 rounded-md text-[13px] font-normal text-slate-600 hover:bg-slate-100"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-9 px-4 rounded-md bg-blue-900 text-white text-[13px] font-semibold hover:bg-blue-800"
          >
            적용
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
