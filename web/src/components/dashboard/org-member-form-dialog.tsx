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

type OrgTypeCode = "OWN" | "JV";
type EmpType = "일반직" | "전문직" | "현채직" | "공동사";

const EMPLOYEE_TYPES: { value: EmpType; label: string; dot: string }[] = [
  { value: "일반직", label: "일반직", dot: "bg-slate-400" },
  { value: "전문직", label: "전문직", dot: "bg-emerald-400" },
  { value: "현채직", label: "현장계약", dot: "bg-sky-400" },
  { value: "공동사", label: "공동사", dot: "bg-amber-400" },
];

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
  /** 사원 유형이 공동사가 아닌 경우 자동 입력할 기본 소속 회사명 (현장 소속 회사). */
  defaultCompanyName?: string;
  /** 저장 시 부모가 스테이징 또는 API 호출을 처리. memberId<0 이면 스테이징된 생성. */
  onSubmit: (payload: OrgMemberInput, memberId: number | null) => void;
}

const TOP_LEVEL_ROLE_CODES = new Set(["SITE_MANAGER", "SITE_REP"]);

const RANK_OPTIONS = ["사원", "주임", "대리", "과장", "차장", "부장"] as const;

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
  defaultCompanyName,
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
  const [empType, setEmpType] = useState<EmpType>("일반직");
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
      // 기존 데이터에서 EmpType 도출
      let et: EmpType = "일반직";
      if (initialMember.org_type === "JV") et = "공동사";
      else if (initialMember.employee_type === "전문직") et = "전문직";
      else if (initialMember.employee_type === "현채직") et = "현채직";
      setEmpType(et);
      // 공동사는 기존 저장된 회사명 유지, 그 외는 현장 소속 회사로 자동 채움
      setCompanyName(et === "공동사" ? (initialMember.company_name ?? "") : (defaultCompanyName ?? ""));
      setRank(initialMember.rank ?? "");
      setPhone(initialMember.phone ?? "");
      setEmail(initialMember.email ?? "");
    } else {
      setName("");
      setRoleId(defaultRoleId);
      setDepartmentId(presetDepartmentId ?? null);
      setEmpType("일반직");
      setCompanyName(defaultCompanyName ?? "");
      setRank("");
      setPhone("");
      setEmail("");
    }
    setError(null);
  }, [open, initialMember, defaultRoleId, presetDepartmentId, defaultCompanyName]);

  // 사원 유형 변경 시: 공동사가 아니면 회사명을 현장 소속 회사로 자동 채움.
  // 공동사일 때는 기존 값을 비워 사용자가 직접 입력하게 함 (마지막 자동값이 남아있으면 제거).
  useEffect(() => {
    if (!open) return;
    if (empType === "공동사") {
      if (defaultCompanyName && companyName === defaultCompanyName) {
        setCompanyName("");
      }
    } else {
      if (defaultCompanyName && companyName !== defaultCompanyName) {
        setCompanyName(defaultCompanyName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empType, open]);

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
    if (empType === "공동사" && !companyName.trim()) {
      setError("공동사인 경우 회사명을 입력해주세요");
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
      org_type: empType === "공동사" ? "JV" : "OWN",
      employee_type: empType,
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

          {/* 2행: 사원 유형 (full width) */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>사원 유형 *</Label>
            <div className="grid grid-cols-4 gap-1 rounded-md bg-slate-100 p-1">
              {EMPLOYEE_TYPES.map((t) => {
                const active = empType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEmpType(t.value)}
                    className={cn(
                      "h-8 flex items-center justify-center gap-1.5 rounded-md text-[12px] font-medium transition-colors",
                      active
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", t.dot)} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3행: 회사명 | 소속 팀 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="om-company">
              회사명 {empType === "공동사" && "*"}
            </Label>
            <Input
              id="om-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              readOnly={empType !== "공동사"}
              placeholder={empType === "공동사" ? "공동사명 입력" : undefined}
              className={empType !== "공동사" ? "bg-slate-50! text-slate-500!" : undefined}
            />
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

          {/* 3행: 직책 | 직급 */}
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
            <Label>직급</Label>
            <Select value={rank || ""} onValueChange={(v) => setRank(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {RANK_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5행: 전화번호 (full width) */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="om-phone">전화번호</Label>
            <Input
              id="om-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          {/* 6행: 이메일 (full width) */}
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
