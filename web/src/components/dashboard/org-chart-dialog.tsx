"use client";

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import { Users, ChevronLeft, Plus, X, Check, ChevronUp, ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrgMemberCard } from "./org-member-card";
import { EmployeeProfile } from "./employee-profile";
import {
  fetchOrgChart,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/lib/queries/org-chart";
import type { Department, OrgMember } from "@/types/org-chart";
import type { SiteDashboard } from "@/types/database";
import { useAuth } from "@/lib/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

interface OrgChartDialogProps {
  site: SiteDashboard;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OrgChartDialog({ site, open, onOpenChange }: OrgChartDialogProps) {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  // For slide animation: keep profile mounted during exit
  const [showProfile, setShowProfile] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 팀 관리 모드
  const [mode, setMode] = useState<"view" | "manage">("view");
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [deptError, setDeptError] = useState<string | null>(null);

  // 조직도 콘텐츠를 viewport에 맞춰 scale up — 큰 모니터에서도 맥북처럼 꽉 찬 느낌을 주려고.
  const contentRef = useRef<HTMLDivElement>(null);
  // 다이얼로그 박스는 현장에 관계없이 고정. 가장 큰 현장(구리갈매역세권)이 꽉 차는 viewport 비율 기준.
  const [metrics, setMetrics] = useState<{ w: number; h: number; scale: number }>({ w: 0, h: 0, scale: 1 });

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = contentRef.current;
      if (!el) return;
      const naturalW = el.offsetWidth;
      const naturalH = el.offsetHeight;
      if (!naturalW || !naturalH) return;
      // 박스 크기는 항상 고정 — viewport 95% × 92% (최대 캡 적용).
      const boxW = Math.min(window.innerWidth * 0.95, 1600);
      const boxH = Math.min(window.innerHeight * 0.92, 900);
      // 로딩/빈 상태에서도 박스는 그대로 유지.
      if (loading || members.length === 0) {
        setMetrics({ w: boxW, h: boxH, scale: 1 });
        return;
      }
      // 콘텐츠를 박스에 꽉 차게 스케일업 (한 축이 박스를 채울 때까지). 상한 2.5.
      const s = Math.min(boxW / naturalW, boxH / naturalH, 2.5);
      setMetrics({ w: boxW, h: boxH, scale: s });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, members.length, loading, showProfile, departments.length, mode]);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const [orgData, deptData] = await Promise.all([
        fetchOrgChart(site.id),
        fetchDepartments(site.id),
      ]);
      setMembers(orgData);
      setDepartments(deptData);
    } catch {
      setMembers([]);
      setDepartments([]);
    }
    setLoading(false);
  }, [open, site.id]);

  const reloadDepartments = useCallback(async () => {
    try {
      const deptData = await fetchDepartments(site.id);
      setDepartments(deptData);
    } catch {
      /* noop */
    }
  }, [site.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!open) {
      setSelectedMemberId(null);
      setShowProfile(false);
      setProfileMemberId(null);
      setMode("view");
      setEditingDeptId(null);
      setAddingNew(false);
      setDeptError(null);
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

  const topLevel = members.filter((m) => m.parent_id == null);

  // 부서별 그룹핑 — departments 상태를 source of truth로 사용.
  type DeptEntry = { id: number | null; name: string; sort_order: number; members: OrgMember[] };
  const deptEntries: DeptEntry[] = departments
    .map((d) => ({
      id: d.id,
      name: d.name,
      sort_order: d.sort_order,
      members: members
        .filter((m) => m.parent_id != null && m.department_id === d.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  // FK 미일치 조직원(기타 버킷) — 정상 상태에서는 비어있음
  const orphans = members.filter(
    (m) => m.parent_id != null && !departments.some((d) => d.id === m.department_id)
  );
  if (orphans.length > 0) {
    deptEntries.push({ id: null, name: "기타", sort_order: 9999, members: orphans });
  }

  // view 모드: 멤버 있는 팀만, manage 모드: 빈 팀도 모두 노출.
  const displayedDepts: DeptEntry[] =
    mode === "manage" ? deptEntries : deptEntries.filter((d) => d.members.length > 0);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        style={{
          width: metrics.w ? `${metrics.w}px` : "max-content",
          height: metrics.h ? `${metrics.h}px` : "auto",
          maxWidth: "98vw",
          maxHeight: "96vh",
        }}
        className="overflow-hidden p-0!"
      >
        {/* DialogTitle은 접근성을 위해 숨겨진 상태로만 유지 */}
        <DialogHeader className="sr-only">
          <DialogTitle>{site.site_name} 조직도</DialogTitle>
        </DialogHeader>

        {/* Scale wrapper — 자연 크기 기준 렌더 후 viewport에 맞춰 uniform scale.
            width/height: max-content 로 부모 제약에서 분리해서 ResizeObserver 루프 차단. */}
        <div
          ref={contentRef}
          style={{
            width: "max-content",
            height: "max-content",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${metrics.scale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Org Chart — slides left when profile opens */}
          <div
            className={cn(
              "transition-transform duration-300 ease-in-out",
              showProfile ? "-translate-x-full" : "translate-x-0"
            )}
          >
            <div className="relative">
              {/* 나가기 버튼 + 타이틀 — 좌측 상단 absolute, 로딩/빈 상태에서도 항상 표시 */}
              <div className="absolute left-3 top-2 z-10 flex flex-col items-start gap-1">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  나가기
                </button>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight">
                    {site.site_name}
                  </h2>
                  <span className="text-[12px] text-slate-400">
                    조직도{members.length > 0 ? ` · ${members.length}명` : ""}
                    {mode === "manage" ? " · 팀 편집 중" : ""}
                  </span>
                </div>
              </div>

              {/* 팀 관리 토글 — 관리자만, 우측 상단 absolute */}
              {isAdmin && (
                <div className="absolute right-3 top-2 z-10">
                  {mode === "view" ? (
                    <button
                      type="button"
                      onClick={() => setMode("manage")}
                      className="h-8 px-3 flex items-center gap-1.5 rounded-md border border-slate-300 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      팀 관리
                    </button>
                  ) : (
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
                </div>
              )}

            {loading ? (
              <div className="flex items-center justify-center min-h-100 min-w-150 text-muted-foreground">불러오는 중...</div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-100 min-w-150 text-muted-foreground">
                <Users className="h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm">등록된 조직원이 없습니다</p>
              </div>
            ) : (
              <div className="flex flex-col items-center px-3 pt-4 pb-3">
                {/* === 최상위: 현장대리인 + 현장소장 === */}
                <div className="flex items-start gap-5">
                  {topLevel.map((m) => (
                    <OrgMemberCard key={m.id} member={m} primary onSelect={() => openProfile(m.id)} />
                  ))}
                </div>

                <div className="h-3" />
                <div className="w-px h-4 bg-gradient-to-b from-slate-500 to-slate-400" />

                {/* === 부서 행들 — 최대 8개씩, 초과 시 아래 행으로 === */}
                {deptRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex flex-col items-center">
                    {rowIdx === 0 && (
                      <div className="h-px bg-slate-400" style={{ width: `${rowWidth(row)}px` }} />
                    )}
                    {rowIdx > 0 && <div className="h-5" />}
                    <div className="flex items-start" style={{ gap: `${DEPT_GAP}px` }}>
                      {row.map((dept) => {
                        const wide = dept.members.length > 5;
                        return (
                          <div
                            key={dept.id ?? `orphan-${dept.name}`}
                            className="flex flex-col items-center"
                            style={{ width: wide ? DEPT_WIDTH_WIDE : DEPT_WIDTH_NARROW }}
                          >
                            {rowIdx === 0 && <div className="w-px h-3 bg-slate-400" />}
                            <div className="mt-0.5 mb-1.5 px-2.5 py-0.5 rounded-md bg-blue-900 text-white text-[12px] font-semibold tracking-tight whitespace-nowrap max-w-full truncate">
                              {dept.name}
                            </div>
                            <div className="w-full bg-white ring-1 ring-slate-300 px-2 py-2">
                              {wide ? (
                                <div className="flex gap-x-2 justify-start">
                                  <div className="flex flex-col items-start gap-2.5">
                                    {dept.members.filter((_, i) => i % 2 === 0).map((m) => (
                                      <OrgMemberCard key={m.id} member={m} onSelect={() => openProfile(m.id)} />
                                    ))}
                                  </div>
                                  <div className="flex flex-col items-start gap-2.5">
                                    {dept.members.filter((_, i) => i % 2 === 1).map((m) => (
                                      <OrgMemberCard key={m.id} member={m} onSelect={() => openProfile(m.id)} />
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-2.5">
                                  {dept.members.map((m) => (
                                    <OrgMemberCard key={m.id} member={m} onSelect={() => openProfile(m.id)} />
                                  ))}
                                </div>
                              )}
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

          {/* Profile — slides in from right */}
          {profileMemberId != null && (
            <div
              className={cn(
                "absolute inset-0 transition-transform duration-300 ease-in-out",
                showProfile ? "translate-x-0" : "translate-x-full"
              )}
            >
              <EmployeeProfile
                memberId={profileMemberId}
                siteName={`${site.corporation_name ?? ""} · ${site.site_name}`}
                onBack={closeProfile}
                fallbackMember={members.find((m) => m.id === profileMemberId) ?? null}
                allMembers={members}
              />
            </div>
          )}
        </div>

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
    </Dialog>
  );
}
