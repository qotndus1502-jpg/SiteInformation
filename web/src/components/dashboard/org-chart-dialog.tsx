"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users, Plus, X, Check, ChevronUp, ChevronDown, Settings2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { OrgMemberCard } from "./org-member-card";
import { EmployeeProfile } from "./employee-profile";
import { OrgMemberFormDialog } from "./org-member-form-dialog";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateRequiredHeadcount,
  type RequiredHeadcount,
} from "@/lib/api/org";
import type { Department, OrgMember, OrgRole } from "@/types/org-chart";
import type { SiteDashboard } from "@/types/database";
import { useAuth } from "@/lib/auth-context";
import { useMemberStaging } from "./_internal/useMemberStaging";
import { useOrgChartData } from "./_internal/useOrgChartData";
import { useOrgChartMetrics } from "./_internal/useOrgChartMetrics";

interface OrgChartDialogProps {
  site: SiteDashboard;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 인원 변경이 commit된 직후 호출 — 부모가 site list를 refetch해서
   *  현장 인원 수(v_site_dashboard.headcount)를 즉시 반영하게 한다. */
  onSaved?: () => void;
}

export function OrgChartDialog({ site, open, onOpenChange, onSaved }: OrgChartDialogProps) {
  const { isAdmin } = useAuth();
  const {
    members,
    departments,
    setDepartments,
    roles,
    requiredHeadcount,
    setRequiredHeadcount,
    loading,
    load,
    reloadDepartments,
  } = useOrgChartData(site.id, open);

  // 인원 추가/수정 폼 상태
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [memberFormInitial, setMemberFormInitial] = useState<OrgMember | null>(null);
  const [memberFormPresetDept, setMemberFormPresetDept] = useState<number | null>(null);
  const [memberFormPresetRole, setMemberFormPresetRole] = useState<string | null>(null);

  // ── 인원 편집 모드 스테이징 ──
  // 모든 변경은 로컬에 쌓였다가 "저장" 클릭 시 일괄 API 적용. "취소"는 snapshot으로 복구.
  const {
    pendingCreates,
    pendingUpdates,
    pendingDeletes,
    savingBatch,
    hasPendingChanges,
    stageSubmit: handleMemberSubmit,
    stageDelete,
    commitBatch,
    clearPending,
  } = useMemberStaging();

  const openAddMember = (opts: { departmentId?: number | null; roleCode?: string | null }) => {
    setMemberFormInitial(null);
    setMemberFormPresetDept(opts.departmentId ?? null);
    setMemberFormPresetRole(opts.roleCode ?? null);
    setMemberFormOpen(true);
  };
  const openEditMember = (m: OrgMember) => {
    setMemberFormInitial(m);
    setMemberFormPresetDept(null);
    setMemberFormPresetRole(null);
    setMemberFormOpen(true);
  };

  const handleQuickDelete = (m: OrgMember, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`${m.name} 님을 조직도에서 삭제하시겠습니까?`)) return;
    stageDelete(m.id);
  };

  const handleCommitBatch = async () => {
    if (savingBatch) return;
    if (!hasPendingChanges) {
      setMode("view");
      return;
    }
    try {
      await commitBatch(site.id, async () => {
        setMode("view");
        await load();
        onSaved?.();
      });
    } catch (err) {
      alert((err as Error).message || "저장 실패");
    }
  };

  const handleCancelBatch = () => {
    if (hasPendingChanges && !confirm("편집 내용을 취소하시겠습니까?")) return;
    clearPending();
    setMode("view");
  };

  /** 인원 편집 모드에서 카드 위에 × 삭제 버튼을 올려주는 래퍼. */
  const EditableCard = ({ m, primary }: { m: OrgMember; primary?: boolean }) => (
    <div className="relative group">
      <OrgMemberCard
        member={m}
        primary={primary}
        onSelect={() => (mode === "members" ? openEditMember(m) : openProfile(m.id))}
      />
      {mode === "members" && (
        <button
          type="button"
          onClick={(e) => handleQuickDelete(m, e)}
          className="absolute -top-1.5 -right-1.5 z-10 h-6 w-6 flex items-center justify-center rounded-full bg-white border border-slate-300 text-slate-500 shadow-sm opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
          aria-label="삭제"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  // For slide animation: keep profile mounted during exit
  const [showProfile, setShowProfile] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 관리 모드: view / manage(팀 편집 오버레이) / members(인원 편집 - 차트 위에 + / 클릭 편집)
  const [mode, setMode] = useState<"view" | "manage" | "members">("view");
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [deptError, setDeptError] = useState<string | null>(null);

  // 조직도 콘텐츠를 viewport에 맞춰 scale up — 큰 모니터에서도 맥북처럼 꽉 찬 느낌을 주려고.
  // primary 카드 상단 Y (다이얼로그 기준) — 표 정렬용. DOM에서 실측.
  const { contentRef, primaryRowRef, metrics, primaryTop } = useOrgChartMetrics({
    open,
    loading,
    membersCount: members.length,
    departmentsCount: departments.length,
    mode,
    showProfile,
  });

  useEffect(() => {
    if (!open) {
      setSelectedMemberId(null);
      setShowProfile(false);
      setProfileMemberId(null);
      setMode("view");
      setEditingDeptId(null);
      setAddingNew(false);
      setDeptError(null);
      clearPending();
    }
  }, [open]);

  // Open profile with animation
  const openProfile = (id: number) => {
    setProfileMemberId(id);
    setSelectedMemberId(id);
    // Trigger slide-in on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShowProfile(true));
    });
  };

  // Close profile with animation
  const closeProfile = () => {
    setShowProfile(false);
    timeoutRef.current = setTimeout(() => {
      setSelectedMemberId(null);
      setProfileMemberId(null);
    }, 300); // match transition duration
  };

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  /* ─────────────────────────────────────────────────────────────────
   * 조직도 인원 배치 로직
   * ─────────────────────────────────────────────────────────────────
   * 1. 최상위(top level): parent_id가 null — 현장대리인 / 현장소장 등
   * 2. 부서(department)별 그룹핑: m.department_name 기준
   *    - 정렬: department_sort_order 오름차순
   *    - 부서 내 멤버: m.sort_order 오름차순
   * 3. 부서 폭 결정: 멤버 5명 초과 시 2열 그리드(wide), 이하 1열(narrow)
   * 4. 한 행에 최대 MAX_DEPTS_PER_ROW 개 부서만 배치, 초과 시 다음 행으로 줄바꿈
   *    (첫 행만 primary 카드에서 내려오는 가로 rail과 연결)
   */
  const MAX_DEPTS_PER_ROW = 8;
  /* 박스 폭은 카드 + padding에 정확히 맞춰서 좌우 slack 0으로 통일
     narrow = px-2(16) + 카드 140 = 156
     wide   = px-2(16) + 카드 140 + gap-x-2(8) + 카드 140 = 304 */
  const DEPT_WIDTH_NARROW = 156;
  const DEPT_WIDTH_WIDE = 304;
  const DEPT_GAP = 20;

  // ── 스테이징을 반영한 effective 조직원 리스트 ──
  // 서버 members에 pendingUpdates 적용, pendingDeletes 제외, pendingCreates 를 temp member로 추가.
  const displayMembers: OrgMember[] = (() => {
    const roleLookup = (rid: number) => roles.find((r) => r.id === rid);
    const deptLookup = (did: number | null) =>
      did != null ? departments.find((d) => d.id === did) : undefined;

    const updated = members
      .filter((m) => !pendingDeletes.includes(m.id))
      .map((m) => {
        const u = pendingUpdates.find((p) => p.id === m.id);
        if (!u) return m;
        const role = roleLookup(u.patch.role_id);
        const dept = deptLookup(u.patch.department_id);
        return {
          ...m,
          name: u.patch.name,
          role_id: u.patch.role_id,
          role_code: role?.code ?? m.role_code,
          role_name: role?.name ?? m.role_name,
          role_sort_order: role?.sort_order ?? m.role_sort_order,
          department_id: u.patch.department_id,
          department_name: dept?.name ?? null,
          department_sort_order: dept?.sort_order ?? null,
          parent_id: u.patch.parent_id,
          org_type: u.patch.org_type,
          company_name: u.patch.company_name,
          rank: u.patch.rank,
          phone: u.patch.phone,
          email: u.patch.email,
        };
      });

    const created: OrgMember[] = pendingCreates.map(({ tempId, payload }) => {
      const role = roleLookup(payload.role_id);
      const dept = deptLookup(payload.department_id);
      return {
        id: tempId,
        site_id: site.id,
        name: payload.name,
        rank: payload.rank,
        phone: payload.phone,
        email: payload.email,
        org_type: payload.org_type,
        company_name: payload.company_name,
        employee_type: null,
        role_id: payload.role_id,
        role_code: role?.code ?? "",
        role_name: role?.name ?? "",
        role_sort_order: role?.sort_order ?? 0,
        department_id: payload.department_id,
        department_name: dept?.name ?? null,
        department_sort_order: dept?.sort_order ?? null,
        specialty: null,
        parent_id: payload.parent_id,
        sort_order: payload.sort_order ?? 9999,
        is_active: true,
        assigned_from: null,
        assigned_to: null,
        note: null,
      };
    });
    return [...updated, ...created];
  })();

  // PM은 더이상 조직도에 표시하지 않는다 (project_site.pm_name으로 이관).
  // soft-delete 안 된 잔존 데이터 대비 방어적으로 클라이언트에서도 필터링.
  const topLevel = displayMembers.filter(
    (m) => m.parent_id == null && m.role_code !== "PM"
  );

  // 부서별 그룹핑 — departments 상태를 source of truth로 사용.
  type DeptEntry = { id: number | null; name: string; sort_order: number; members: OrgMember[] };
  const deptEntries: DeptEntry[] = departments
    .map((d) => ({
      id: d.id,
      name: d.name,
      sort_order: d.sort_order,
      members: displayMembers
        .filter((m) => m.parent_id != null && m.department_id === d.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  // FK 미일치 조직원(기타 버킷) — 정상 상태에서는 비어있음
  const orphans = displayMembers.filter(
    (m) => m.parent_id != null && !departments.some((d) => d.id === m.department_id)
  );
  if (orphans.length > 0) {
    deptEntries.push({ id: null, name: "기타", sort_order: 9999, members: orphans });
  }

  // 빈 팀도 항상 노출 (FK 미일치 orphan 버킷만 멤버가 있을 때 표시).
  const displayedDepts: DeptEntry[] = deptEntries.filter(
    (d) => d.id != null || d.members.length > 0
  );

  // 8개씩 행으로 나누기
  const deptRows: DeptEntry[][] = [];
  for (let i = 0; i < displayedDepts.length; i += MAX_DEPTS_PER_ROW) {
    deptRows.push(displayedDepts.slice(i, i + MAX_DEPTS_PER_ROW));
  }

  const rowWidth = (row: DeptEntry[]) =>
    row.reduce((w, d) => w + (d.members.length > 5 ? DEPT_WIDTH_WIDE : DEPT_WIDTH_NARROW) + DEPT_GAP, 0) - DEPT_GAP;

  // ── 팀 관리 mutations ──
  const handleCreateDept = async () => {
    const name = newDeptName.trim();
    if (!name) return;
    setDeptError(null);
    try {
      await createDepartment(site.id, name);
      setNewDeptName("");
      setAddingNew(false);
      await reloadDepartments();
    } catch (e) {
      setDeptError((e as Error).message);
    }
  };

  const handleRenameDept = async (deptId: number) => {
    const name = editingName.trim();
    if (!name) {
      setEditingDeptId(null);
      return;
    }
    setDeptError(null);
    try {
      await updateDepartment(deptId, { name });
      setEditingDeptId(null);
      await reloadDepartments();
    } catch (e) {
      setDeptError((e as Error).message);
    }
  };

  const handleDeleteDept = async (deptId: number) => {
    setDeptError(null);
    try {
      await deleteDepartment(deptId);
      await reloadDepartments();
    } catch (e) {
      setDeptError((e as Error).message);
    }
  };

  const handleUpdateRequiredHeadcount = async (patch: Partial<RequiredHeadcount>) => {
    const next = { ...requiredHeadcount, ...patch };
    setRequiredHeadcount(next);
    try {
      await updateRequiredHeadcount(site.id, next);
    } catch (e) {
      setDeptError((e as Error).message);
    }
  };

  const handleMoveDept = async (deptId: number, direction: -1 | 1) => {
    // 1) 현재 렌더 순서와 일치하는 정렬된 배열 준비 (sort_order 중복 대응)
    const sorted = [...departments].sort(
      (a, b) => a.sort_order - b.sort_order || a.id - b.id
    );
    const idx = sorted.findIndex((d) => d.id === deptId);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    // 2) 배열 내에서 위치 교체
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    // 3) sort_order를 순차적으로 재할당 (10, 20, 30, ...) — 중복 제거
    const renumbered = reordered.map((d, i) => ({ ...d, sort_order: (i + 1) * 10 }));
    // 4) 변경된 것만 PUT
    const changes = renumbered.filter((d) => {
      const original = departments.find((x) => x.id === d.id);
      return !original || original.sort_order !== d.sort_order;
    });
    // 5) Optimistic UI 업데이트
    setDepartments(renumbered);
    setDeptError(null);
    try {
      await Promise.all(changes.map((d) => updateDepartment(d.id, { sort_order: d.sort_order })));
    } catch (e) {
      setDeptError((e as Error).message);
      await reloadDepartments();
    }
  };

  const isProfileVisible = selectedMemberId != null;

  /* 프린트 — 숨겨진 iframe에 차트만 복제해 A4 가로 1장에 맞게 프린트.
     다이얼로그 내부 absolute 레이아웃/zoom 충돌을 피하고 확실히 1장에 들어감.
     (displayMembers 선언 이후에 위치해야 TDZ 에러 없음) */
  const handlePrint = useCallback(() => {
    const wrapper = contentRef.current;
    if (!wrapper) return;

    // 화면과 동일하게 구리갈매(REF) 기준 고정 scale — 모든 현장이 같은 크기로 인쇄됨
    const REF_W = 1380;
    const REF_H = 570;
    // A4 가로 5mm 여백 인쇄 가능 영역 ≈ 287mm × 200mm = 1085 × 756 px (96dpi)
    const PRINT_W = 1085;
    const PRINT_H = 756;
    const HEADER_H = 40;
    // 표는 absolute overlay라 가로 flow에 영향 없음. 차트 REF 기준으로 scale 계산.
    const scale = Math.min(PRINT_W / REF_W, (PRINT_H - HEADER_H) / REF_H, 1) * 0.98;

    const styleHtml = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");

    const chartHtml = wrapper.outerHTML;
    const statusTable = document.querySelector("[data-org-chart-status-table]");
    const tableHtml = statusTable ? (statusTable as HTMLElement).innerHTML : "";
    const siteName = site.site_name;
    const memberCount = displayMembers.length;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1400px;height:900px;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>조직도 - ${siteName}</title>
${styleHtml}
<style>
  @page { size: A4 landscape; margin: 5mm; }
  html, body { margin: 0; padding: 0; background: white; overflow: hidden; }
  body { padding: 6mm; font-family: inherit; page-break-after: avoid; }
  .chart-header { margin-bottom: 4mm; }
  /* 화면과 동일한 레이아웃: 차트 중앙, 표는 절대 위치로 좌측 상단에. 전체를 zoom으로 축소. */
  .print-root { position: relative; zoom: ${scale}; display: flex; flex-direction: column; align-items: center; }
  .status-table-overlay { position: absolute; top: 16px; left: 0; z-index: 10; zoom: 0.75; transform-origin: top left; }
  .chart-scale { flex-shrink: 0; }
  .chart-header { font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
  .chart-header .subtitle { font-size: 11px; font-weight: 400; color: #94a3b8; margin-left: 6px; }
  /* 차트 자체의 zoom은 제거 — 상위 .content-row에서 통합 축소 */
  .chart-scale { width: max-content; height: max-content; page-break-inside: avoid; break-inside: avoid; }
  .chart-scale > [data-org-chart-scale-wrapper] {
    position: static !important;
    transform: none !important;
    left: auto !important;
    top: auto !important;
    width: max-content !important;
    height: max-content !important;
  }
  /* 배경 그래픽 인쇄 — 색/그라디언트/shadow가 그대로 출력되도록 */
  .chart-scale, .chart-scale * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>
</head>
<body>
<div class="chart-header">${siteName}<span class="subtitle">조직도 · ${memberCount}명</span></div>
<div class="print-root">
  ${tableHtml ? `<div class="status-table-overlay">${tableHtml}</div>` : ""}
  <div class="chart-scale">${chartHtml}</div>
</div>
</body>
</html>`);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1000);
      }
    };

    if (iframe.contentWindow?.document.readyState === "complete") {
      setTimeout(doPrint, 300);
    } else {
      iframe.onload = () => setTimeout(doPrint, 300);
    }
  }, [site.site_name, displayMembers.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        data-org-chart-print
        style={{
          width: metrics.w ? `${metrics.w}px` : "max-content",
          height: metrics.h ? `${metrics.h}px` : "auto",
          maxWidth: "98vw",
          maxHeight: "96vh",
        }}
        className="overflow-hidden p-0! bg-white"
      >
        {/* DialogTitle은 접근성을 위해 숨겨진 상태로만 유지 */}
        <DialogHeader className="sr-only">
          <DialogTitle>{site.site_name} 조직도</DialogTitle>
        </DialogHeader>

        {/* 헤더 — 다이얼로그 좌측 상단 고정 (스케일 무관). 차트와 분리되어 조직도 크기에 영향받지 않는다. */}
        <div data-org-chart-header className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between gap-6 px-8 pt-6 pb-2 pointer-events-none">
          <div className="flex items-baseline gap-2.5 pointer-events-auto">
            <h2 className="text-[20px] font-semibold text-slate-900 tracking-tight">
              {site.site_name}
            </h2>
            <span className="text-[14px] text-slate-400 whitespace-nowrap">
              조직도{displayMembers.length > 0 ? ` · ${displayMembers.length}명` : ""}
              {mode === "manage"
                ? " · 팀 편집 중"
                : mode === "members"
                ? hasPendingChanges
                  ? " · 인원 편집 중 (미저장)"
                  : " · 인원 편집 중"
                : ""}
            </span>
          </div>
          <div data-print-hide className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handlePrint}
              aria-label="프린트"
              title="프린트"
              className="h-8 w-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Printer className="h-4 w-4" />
            </button>
            {isAdmin && mode === "view" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("members")}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-md border border-slate-300 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  인원 편집
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manage")}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-md border border-slate-300 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  팀 관리
                </button>
              </>
            )}
            {isAdmin && mode === "members" && (
              <>
                <button
                  type="button"
                  onClick={handleCancelBatch}
                  disabled={savingBatch}
                  className="h-8 px-3 rounded-md border border-slate-300 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCommitBatch}
                  disabled={savingBatch}
                  className="h-8 px-3 rounded-md bg-blue-900 text-white text-[13px] font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  {savingBatch ? "저장 중..." : "저장"}
                </button>
              </>
            )}
            {isAdmin && mode === "manage" && (
              <button
                type="button"
                onClick={() => {
                  setMode("view");
                  setEditingDeptId(null);
                  setAddingNew(false);
                  setDeptError(null);
                }}
                className="h-8 px-3 rounded-md bg-blue-900 text-white text-[13px] font-semibold hover:bg-blue-800"
              >
                완료
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="닫기"
              className="h-8 w-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scale wrapper — 차트만 포함. 가로 중앙, 세로 상단 고정 (모든 현장이 같은 상단 위치에서 시작). */}
        <div
          ref={contentRef}
          data-org-chart-scale-wrapper
          style={{
            width: "max-content",
            height: "max-content",
            position: "absolute",
            left: "50%",
            top: "80px",
            transform: `translate(-50%, 0) scale(${metrics.scale})`,
            transformOrigin: "top center",
          }}
        >
          <div className="flex flex-col">
          {/* Org Chart — slides left when profile opens */}
          <div
            className={cn(
              "transition-transform duration-300 ease-in-out",
              showProfile ? "-translate-x-full" : "translate-x-0"
            )}
          >
            <div className="relative">
            {loading ? (
              <div className="flex flex-col items-center min-h-100 min-w-150 px-3 pt-4 pb-3 gap-4">
                {/* 최상위 카드 2개 */}
                <div className="flex items-start gap-5 justify-center">
                  <Skeleton className="w-70 h-34 rounded-lg" />
                  <Skeleton className="w-70 h-34 rounded-lg" />
                </div>
                <Skeleton className="w-px h-4 rounded-none" />
                {/* 부서 행 2줄 */}
                {Array.from({ length: 2 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="flex items-start gap-3 justify-center">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="w-32 h-6 rounded-md" />
                        <Skeleton className="w-32 h-28 rounded-lg" />
                        <Skeleton className="w-32 h-28 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : members.length === 0 && displayedDepts.length === 0 && mode !== "members" ? (
              <div className="flex flex-col items-center justify-center min-h-100 min-w-150 text-muted-foreground">
                <Users className="h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm">등록된 조직원이 없습니다</p>
              </div>
            ) : (
              <div className="flex flex-col items-center px-3 pt-4 pb-3 min-h-150">
                {/* === 최상위: 현장대리인 + 현장소장 — 각 카드가 독립 === */}
                {(topLevel.length > 0 || mode === "members") && (
                  <div ref={primaryRowRef}>
                    <div className="flex items-start gap-5 justify-center">
                      {topLevel.map((m) => (
                        <EditableCard key={m.id} m={m} primary />
                      ))}
                      {mode === "members" &&
                        !topLevel.some(
                          (m) => roles.find((r) => r.id === m.role_id)?.code === "SITE_REP"
                        ) && (
                          <button
                            type="button"
                            onClick={() => openAddMember({ roleCode: "SITE_REP" })}
                            className="w-[280px] h-34 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-[14px] font-semibold text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition"
                          >
                            + 현장대리인 추가
                          </button>
                        )}
                      {mode === "members" &&
                        !topLevel.some(
                          (m) => roles.find((r) => r.id === m.role_id)?.code === "SITE_MANAGER"
                        ) && (
                          <button
                            type="button"
                            onClick={() => openAddMember({ roleCode: "SITE_MANAGER" })}
                            className="w-[280px] h-34 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-[14px] font-semibold text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition"
                          >
                            + 현장소장 추가
                          </button>
                        )}
                    </div>
                  </div>
                )}

                {(topLevel.length > 0 || mode === "members") && displayedDepts.length > 0 && (
                  <>
                    <div className="h-3" />
                    <div className="w-px h-4 bg-slate-300" />
                  </>
                )}

                {/* === 부서 행들 — 최대 8개씩, 초과 시 아래 행으로 === */}
                {deptRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex flex-col items-center">
                    {rowIdx === 0 && (
                      <div className="h-px bg-slate-300" style={{ width: `${rowWidth(row)}px` }} />
                    )}
                    {rowIdx > 0 && <div className="h-5" />}
                    <div className="flex items-start" style={{ gap: `${DEPT_GAP}px` }}>
                      {row.map((dept) => {
                        const wide = dept.members.length > 5;
                        const isEmpty = dept.members.length === 0 && mode !== "members";
                        return (
                          <div
                            key={dept.id ?? `orphan-${dept.name}`}
                            className="flex flex-col items-center"
                            style={{ width: wide ? DEPT_WIDTH_WIDE : DEPT_WIDTH_NARROW }}
                          >
                            {rowIdx === 0 && <div className="w-px h-3 bg-slate-300" />}
                            {/* 부서 카드 — 헤더와 본체를 하나의 카드로 통합 */}
                            <div
                              className={cn(
                                "w-full rounded-md",
                                isEmpty
                                  ? "border border-dashed border-slate-300 bg-slate-50/50"
                                  : "shadow-sm ring-1 ring-slate-200 bg-slate-50"
                              )}
                            >
                              <div className="rounded-t-md px-2.5 py-1.5 bg-slate-700 text-white text-[12px] font-medium tracking-wide whitespace-nowrap text-center truncate">
                                {dept.name}
                              </div>
                              <div className="px-2 py-2">
                                {isEmpty ? (
                                  <div className="flex flex-col items-center justify-center gap-1.5 py-4 text-slate-400">
                                    <Users className="h-5 w-5 opacity-60" />
                                    <span className="text-[11px] font-medium">인원 없음</span>
                                  </div>
                                ) : wide ? (
                                  <div className="flex gap-x-2 justify-start">
                                    <div className="flex flex-col items-start gap-2.5">
                                      {dept.members.filter((_, i) => i % 2 === 0).map((m) => (
                                        <EditableCard key={m.id} m={m} />
                                      ))}
                                    </div>
                                    <div className="flex flex-col items-start gap-2.5">
                                      {dept.members.filter((_, i) => i % 2 === 1).map((m) => (
                                        <EditableCard key={m.id} m={m} />
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-start gap-2.5">
                                    {dept.members.map((m) => (
                                      <EditableCard key={m.id} m={m} />
                                    ))}
                                  </div>
                                )}
                                {mode === "members" && dept.id != null && (
                                  <button
                                    type="button"
                                    onClick={() => openAddMember({ departmentId: dept.id })}
                                    className="mt-2 w-full h-8 rounded-md border border-dashed border-slate-300 bg-white text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                                  >
                                    + 인원 추가
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
          </div>
        </div>

        {/* 인원 현황표 — 사원 유형별 소요/현재/향후 인원. 프로필 표시 중에는 숨김.
            조직원 0명인 현장도 소요인원 데이터는 있으므로 항상 노출. */}
        {!showProfile && !loading && (() => {
          const counts = {
            일반직: displayMembers.filter((m) => !m.employee_type && !m.company_name).length,
            전문직: displayMembers.filter((m) => m.employee_type === "전문직").length,
            현장계약: displayMembers.filter((m) => m.employee_type === "현채직").length,
            공동사: displayMembers.filter((m) => !!m.company_name && m.employee_type !== "전문직" && m.employee_type !== "현채직").length,
          };
          const rows: Array<{ label: string; dot: string; current: number; required: number }> = [
            { label: "일반직", dot: "bg-slate-400", current: counts.일반직, required: requiredHeadcount.general },
            { label: "전문직", dot: "bg-emerald-400", current: counts.전문직, required: requiredHeadcount.specialist },
            { label: "현장계약", dot: "bg-sky-400", current: counts.현장계약, required: requiredHeadcount.contract },
            { label: "공동사", dot: "bg-amber-400", current: counts.공동사, required: requiredHeadcount.jv },
          ];
          const totalCurrent = rows.reduce((s, r) => s + r.current, 0);
          const totalRequired = rows.reduce((s, r) => s + r.required, 0);
          const totalFuture = Math.max(0, totalRequired - totalCurrent);
          const cell = "px-3 py-1.5 text-center font-mono border-r border-slate-200";
          const emptyStr = (n: number) => (n > 0 ? n : "-");
          return (
            <div
              data-org-chart-status-table
              className="absolute left-8 z-10"
              style={{
                top: `${primaryTop}px`,
                transform: `scale(${metrics.scale * 0.8})`,
                transformOrigin: "top left",
              }}
            >
              <div className="rounded-md overflow-hidden ring-1 ring-slate-200 shadow-sm bg-white">
                <table className="text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700">
                      <th className="px-3 py-2 font-medium tracking-wide border-r border-slate-200 text-center whitespace-nowrap">구 분</th>
                      <th className="px-3 py-2 font-medium tracking-wide border-r border-slate-200 whitespace-nowrap">소요인원</th>
                      <th className="px-3 py-2 font-medium tracking-wide border-r border-slate-200 whitespace-nowrap">현재인원</th>
                      <th className="px-3 py-2 font-medium tracking-wide whitespace-nowrap">향후투입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const future = Math.max(0, r.required - r.current);
                      return (
                        <tr key={r.label} className="border-t border-slate-200">
                          <td className="px-3 py-1.5 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", r.dot)} />
                              <span className="text-slate-700">{r.label}</span>
                            </div>
                          </td>
                          <td className={cn(cell, "text-slate-700")}>{emptyStr(r.required)}</td>
                          <td className={cn(cell, "font-semibold text-slate-900")}>{emptyStr(r.current)}</td>
                          <td className={cn(cell, "text-slate-700 border-r-0")}>{emptyStr(future)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-slate-300 bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-semibold text-slate-700 text-center">합 계</td>
                      <td className={cn(cell, "font-semibold text-slate-900")}>{emptyStr(totalRequired)}</td>
                      <td className={cn(cell, "font-bold text-slate-900")}>{emptyStr(totalCurrent)}</td>
                      <td className={cn(cell, "font-semibold text-slate-900 border-r-0")}>{emptyStr(totalFuture)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Profile — slides in from right. 차트와 동일한 스케일로 확대. */}
        {profileMemberId != null && (
          <div
            className={cn(
              "absolute inset-0 z-25 overflow-hidden transition-transform duration-300 ease-in-out",
              showProfile ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div
              className="bg-white"
              style={{
                width: `${metrics.w / metrics.scale}px`,
                height: `${metrics.h / metrics.scale}px`,
                transform: `scale(${metrics.scale})`,
                transformOrigin: "top left",
              }}
            >
              <EmployeeProfile
                memberId={profileMemberId}
                siteName={`${site.corporation_name ?? ""} · ${site.site_name}`}
                onBack={closeProfile}
                onClose={() => onOpenChange(false)}
                fallbackMember={members.find((m) => m.id === profileMemberId) ?? null}
                allMembers={members}
              />
            </div>
          </div>
        )}

        {/* ── 팀 관리 오버레이 — scale wrapper 바깥, 조직도 위에 등장 ── */}
        {mode === "manage" && (
          <div
            className="absolute inset-0 z-30 flex items-start justify-center bg-slate-900/25 backdrop-blur-[2px]"
            style={{ paddingTop: `${64 * metrics.scale}px` }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setMode("view");
                setEditingDeptId(null);
                setAddingNew(false);
                setDeptError(null);
              }
            }}
          >
            <div
              className="w-95 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
              style={{ transform: `scale(${metrics.scale})`, transformOrigin: "top center" }}
            >
              <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
                <h3 className="text-[14px] font-semibold text-slate-900">팀 관리</h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("view");
                      setEditingDeptId(null);
                      setAddingNew(false);
                      setDeptError(null);
                    }}
                    className="h-7 px-3 rounded-md text-[12px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("view");
                      setEditingDeptId(null);
                      setAddingNew(false);
                      setDeptError(null);
                    }}
                    className="h-7 px-3 rounded-md bg-blue-900 text-white text-[12px] font-semibold hover:bg-blue-800"
                  >
                    저장
                  </button>
                </div>
              </div>
              <div className="p-4">
                {/* 사원 유형별 소요 인원 입력 — 팀 테이블 위 */}
                <div className="mb-3 p-2.5 rounded-md border border-slate-200 bg-slate-50/50">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">사원 유형별 소요 인원</div>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { key: "general", label: "일반직", dot: "bg-slate-400" },
                      { key: "specialist", label: "전문직", dot: "bg-emerald-400" },
                      { key: "contract", label: "현장계약", dot: "bg-sky-400" },
                      { key: "jv", label: "공동사", dot: "bg-amber-400" },
                    ] as const).map((t) => (
                      <div key={t.key} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", t.dot)} />
                          <span className="text-[11px] text-slate-600">{t.label}</span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          defaultValue={requiredHeadcount[t.key] ?? 0}
                          key={`req-${t.key}-${requiredHeadcount[t.key] ?? 0}`}
                          onBlur={(e) => {
                            const v = Math.max(0, parseInt(e.target.value) || 0);
                            if (v !== (requiredHeadcount[t.key] ?? 0)) {
                              handleUpdateRequiredHeadcount({ [t.key]: v });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="h-7 w-full px-2 text-[12px] text-center font-mono tabular-nums border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2.5 h-7 border border-b-0 border-slate-200 rounded-t-md bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <span className="w-4 tabular-nums">No.</span>
                  <span className="flex-1">팀명</span>
                  <span className="w-7 text-right">인원</span>
                  <span className="w-13 text-center">위치변경</span>
                  <span className="w-6 text-center">삭제</span>
                </div>
                <ul className="flex flex-col border border-slate-200 rounded-b-md bg-white overflow-hidden">
                  {deptEntries.map((dept, idx) => {
                    const isEditing = dept.id != null && editingDeptId === dept.id;
                    const canDelete = dept.members.length === 0 && dept.id != null;
                    const canMoveUp = idx > 0 && dept.id != null && deptEntries[idx - 1].id != null;
                    const canMoveDown =
                      idx < deptEntries.length - 1 && dept.id != null && deptEntries[idx + 1].id != null;
                    return (
                      <li
                        key={dept.id ?? `orphan-${dept.name}`}
                        className="flex items-center gap-2 px-2.5 h-9 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors"
                      >
                        <span className="w-4 text-[11px] font-mono text-slate-400 tabular-nums">{idx + 1}</span>
                        {isEditing ? (
                          <>
                            <input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameDept(dept.id!);
                                if (e.key === "Escape") setEditingDeptId(null);
                              }}
                              className="flex-1 h-7 px-2 rounded-md border border-blue-500 text-[13px] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameDept(dept.id!)}
                              className="h-7 w-7 flex items-center justify-center rounded-md bg-blue-900 text-white hover:bg-blue-800"
                              title="저장"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDeptId(null)}
                              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                              title="취소"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (dept.id == null) return;
                                setEditingDeptId(dept.id);
                                setEditingName(dept.name);
                              }}
                              disabled={dept.id == null}
                              className="flex-1 text-left text-[13px] font-medium text-slate-800 hover:text-blue-900 truncate disabled:text-slate-500"
                            >
                              {dept.name}
                            </button>
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {dept.members.length}명
                            </span>
                            <button
                              type="button"
                              disabled={!canMoveUp}
                              onClick={() => dept.id != null && handleMoveDept(dept.id, -1)}
                              className="h-6 w-6 flex items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              title="위로"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={!canMoveDown}
                              onClick={() => dept.id != null && handleMoveDept(dept.id, 1)}
                              className="h-6 w-6 flex items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              title="아래로"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => dept.id != null && handleDeleteDept(dept.id)}
                              className="h-6 w-6 flex items-center justify-center rounded-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                              title={canDelete ? "팀 삭제" : `소속 조직원 ${dept.members.length}명 — 삭제 불가`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-2">
                  {addingNew ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateDept();
                          if (e.key === "Escape") {
                            setAddingNew(false);
                            setNewDeptName("");
                          }
                        }}
                        placeholder="새 팀 이름"
                        className="flex-1 h-8 px-2.5 rounded-md border border-slate-300 text-[13px] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleCreateDept}
                        className="h-8 px-2.5 rounded-md bg-blue-900 text-white text-[12px] font-semibold hover:bg-blue-800"
                      >
                        추가
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingNew(false);
                          setNewDeptName("");
                        }}
                        className="h-8 px-2.5 rounded-md text-[12px] text-slate-500 hover:bg-slate-100"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingNew(true)}
                      className="w-full h-8 flex items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 text-[12px] font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-3 w-3" />
                      팀 추가
                    </button>
                  )}
                </div>

                {deptError && (
                  <div className="mt-2 text-[11px] text-rose-600 font-medium">{deptError}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <OrgMemberFormDialog
        open={memberFormOpen}
        onOpenChange={setMemberFormOpen}
        departments={departments}
        roles={roles}
        members={displayMembers}
        initialMember={memberFormInitial}
        presetDepartmentId={memberFormPresetDept}
        presetRoleCode={memberFormPresetRole}
        defaultCompanyName={site.corporation_name ?? ""}
        onSubmit={handleMemberSubmit}
      />
    </Dialog>
  );
}
