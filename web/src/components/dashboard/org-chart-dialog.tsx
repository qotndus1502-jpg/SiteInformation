"use client";

import { useEffect, useState, useCallback } from "react";
import { Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrgMemberCard } from "./org-member-card";
import { fetchOrgChart } from "@/lib/queries/org-chart";
import type { OrgMember } from "@/types/org-chart";
import type { SiteDashboard } from "@/types/database";

interface OrgChartDialogProps {
  site: SiteDashboard;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OrgChartDialog({ site, open, onOpenChange }: OrgChartDialogProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await fetchOrgChart(site.id);
      setMembers(data);
    } catch {
      setMembers([]);
    }
    setLoading(false);
  }, [open, site.id]);

  useEffect(() => { load(); }, [load]);

  // 최상위 (parent_id=null)
  const topLevel = members.filter((m) => m.parent_id == null);

  // 부서별 그룹핑 (최상위 제외)
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

  // 부서 내 정렬: sort_order 기준
  for (const [, deptMembers] of sortedDepts) {
    deptMembers.sort((a, b) => a.sort_order - b.sort_order);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            {site.site_name} 조직도
            <span className="text-sm font-normal text-muted-foreground ml-2">({members.length}명)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">불러오는 중...</div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">등록된 조직원이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col items-center min-w-max mx-auto">
              {/* 최상위: 현장대리인 + 현장소장 */}
              <div className="flex items-start gap-6 mb-2">
                {topLevel.map((m) => (
                  <OrgMemberCard key={m.id} member={m} primary />
                ))}
              </div>

              {/* 연결선: 세로 + 가로 */}
              {sortedDepts.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  {/* 가로 연결선 */}
                  <div className="relative w-full">
                    <div className="border-t border-border mx-auto" style={{ width: `${Math.max(1, sortedDepts.length - 1) * 170}px` }} />
                  </div>
                </div>
              )}

              {/* 부서 컬럼 헤더 + 인원 */}
              <div className="flex items-start gap-3 mt-0">
                {sortedDepts.map(([deptName, deptMembers]) => (
                  <div key={deptName} className="flex flex-col items-center min-w-[150px]">
                    {/* 세로 연결선 */}
                    <div className="w-px h-4 bg-border" />
                    {/* 부서 헤더 */}
                    <div className="text-xs font-bold text-white bg-slate-600 px-4 py-1.5 rounded-md mb-3 whitespace-nowrap">
                      {deptName}
                    </div>
                    {/* 부서 인원 (세로 스택) */}
                    <div className="flex flex-col items-center gap-2">
                      {deptMembers.map((m, i) => (
                        <div key={m.id} className="flex flex-col items-center">
                          {i > 0 && <div className="w-px h-2 bg-border mb-2" />}
                          <OrgMemberCard member={m} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
