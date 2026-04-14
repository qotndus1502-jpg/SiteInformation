"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Users, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrgMemberCard } from "./org-member-card";
import { EmployeeProfile } from "./employee-profile";
import { fetchOrgChart } from "@/lib/queries/org-chart";
import type { OrgMember } from "@/types/org-chart";
import type { SiteDashboard } from "@/types/database";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

interface OrgChartDialogProps {
  site: SiteDashboard;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OrgChartDialog({ site, open, onOpenChange }: OrgChartDialogProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  // For slide animation: keep profile mounted during exit
  const [showProfile, setShowProfile] = useState(false);
  const [profileMemberId, setProfileMemberId] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const orgData = await fetchOrgChart(site.id);
      setMembers(orgData);
    } catch {
      setMembers([]);
    }
    setLoading(false);
  }, [open, site.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!open) {
      setSelectedMemberId(null);
      setShowProfile(false);
      setProfileMemberId(null);
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

  // 부서별 그룹핑 + 정렬
  const deptMap = new Map<string, OrgMember[]>();
  const deptOrder = new Map<string, number>();
  for (const m of members) {
    if (m.parent_id == null) continue;
    const dept = m.department_name ?? "기타";
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    deptMap.get(dept)!.push(m);
    if (!deptOrder.has(dept)) deptOrder.set(dept, m.department_sort_order ?? 999);
  }
  const sortedDepts = [...deptMap.entries()].sort(
    (a, b) => (deptOrder.get(a[0]) ?? 999) - (deptOrder.get(b[0]) ?? 999)
  );
  for (const [, deptMembers] of sortedDepts) {
    deptMembers.sort((a, b) => a.sort_order - b.sort_order);
  }

  // 8개씩 행으로 나누기 (초과 시 다음 행으로 줄바꿈)
  const deptRows: (typeof sortedDepts)[] = [];
  for (let i = 0; i < sortedDepts.length; i += MAX_DEPTS_PER_ROW) {
    deptRows.push(sortedDepts.slice(i, i + MAX_DEPTS_PER_ROW));
  }

  // 주어진 부서 배열의 총 폭 계산 (rail 너비용)
  const rowWidth = (row: typeof sortedDepts) =>
    row.reduce((w, [, ms]) => w + (ms.length > 5 ? DEPT_WIDTH_WIDE : DEPT_WIDTH_NARROW) + DEPT_GAP, 0) - DEPT_GAP;

  const isProfileVisible = selectedMemberId != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        style={{ maxWidth: "98vw", width: "98vw", height: "96vh" }}
        className="flex flex-col overflow-hidden !p-3"
      >
        {/* DialogTitle은 접근성을 위해 숨겨진 상태로만 유지 */}
        <DialogHeader className="sr-only">
          <DialogTitle>{site.site_name} 조직도</DialogTitle>
        </DialogHeader>

        {/* Sliding container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Org Chart — slides left when profile opens */}
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-in-out",
              showProfile ? "-translate-x-full" : "translate-x-0"
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">불러오는 중...</div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Users className="h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm">등록된 조직원이 없습니다</p>
              </div>
            ) : (
              <div className="h-full overflow-hidden relative">
                {/* 나가기 버튼 + 타이틀 + 총 인원 — 좌측 상단 absolute */}
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
                      조직도 · {members.length}명
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center px-3 pt-4 pb-3 h-full">

                  {/* === 최상위: 현장대리인 + 현장소장 === */}
                  <div className="flex items-start gap-5">
                    {topLevel.map((m) => (
                      <OrgMemberCard key={m.id} member={m} primary onSelect={() => openProfile(m.id)} />
                    ))}
                  </div>

                  {/* === primary와 연결선 사이 약간의 간격 === */}
                  <div className="h-3" />
                  {/* === 세로 연결선 (primary → 첫 행 rail) === */}
                  <div className="w-px h-4 bg-gradient-to-b from-slate-500 to-slate-400" />

                  {/* === 부서 행들 — 최대 8개씩, 초과 시 아래 행으로 === */}
                  {deptRows.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex flex-col items-center">
                      {/* 첫 행만 가로 rail — primary와 시각적으로 연결 */}
                      {rowIdx === 0 && (
                        <div className="h-px bg-slate-400" style={{ width: `${rowWidth(row)}px` }} />
                      )}
                      {/* 두 번째 행부터는 위쪽 여백만 */}
                      {rowIdx > 0 && <div className="h-5" />}
                      <div className="flex items-start" style={{ gap: `${DEPT_GAP}px` }}>
                        {row.map(([deptName, deptMembers]) => {
                          const wide = deptMembers.length > 5;
                          return (
                            <div
                              key={deptName}
                              className="flex flex-col items-center"
                              style={{ width: wide ? DEPT_WIDTH_WIDE : DEPT_WIDTH_NARROW }}
                            >
                              {/* 첫 행만 세로 연결선 (rail → dept 태그) */}
                              {rowIdx === 0 && <div className="w-px h-3 bg-slate-400" />}
                              {/* 부서 태그 — blue-50 accent */}
                              <div className="mt-0.5 mb-1.5 px-2.5 py-0.5 rounded-md bg-blue-900 text-white text-[12px] font-semibold tracking-tight whitespace-nowrap max-w-full truncate">
                                {deptName}
                              </div>
                              {/* 부서 멤버 그룹 박스 — 카드를 싹 감싸도록 너비 = 부서 컬럼 전체 */}
                              <div className="w-full bg-white ring-1 ring-slate-300 px-2 py-2">
                                {wide ? (
                                  /* 2줄 팀: 2개의 sub-column을 나란히 배치 —
                                     각 sub-column은 1줄 팀과 동일한 flex-col로 렌더해서
                                     카드 좌측 여백이 1줄 팀과 똑같이 나오게 함. */
                                  <div className="flex gap-x-2 justify-start">
                                    <div className="flex flex-col items-start gap-2.5">
                                      {deptMembers.filter((_, i) => i % 2 === 0).map((m) => (
                                        <OrgMemberCard key={m.id} member={m} onSelect={() => openProfile(m.id)} />
                                      ))}
                                    </div>
                                    <div className="flex flex-col items-start gap-2.5">
                                      {deptMembers.filter((_, i) => i % 2 === 1).map((m) => (
                                        <OrgMemberCard key={m.id} member={m} onSelect={() => openProfile(m.id)} />
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-start gap-2.5">
                                    {deptMembers.map((m) => (
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
              </div>
            )}
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
      </DialogContent>
    </Dialog>
  );
}
