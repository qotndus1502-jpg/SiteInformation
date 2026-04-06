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
  const [headcount, setHeadcount] = useState<{ category: string; required: number; current: number; future: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const orgData = await fetchOrgChart(site.id);
      setMembers(orgData);
    } catch {
      setMembers([]);
    }
    try {
      const hcData = await fetch(`${API_BASE}/api/sites/${site.id}/headcount-summary`).then((r) => r.json());
      setHeadcount(hcData);
    } catch {
      setHeadcount([]);
    }
    setLoading(false);
  }, [open, site.id, API_BASE]);

  useEffect(() => { load(); }, [load]);

  const topLevel = members.filter((m) => m.parent_id == null);

  // 부서별 그룹핑
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: "95vw", width: "95vw", height: "90vh" }} className="flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            {site.site_name} 조직도
            <span className="text-sm font-normal text-muted-foreground ml-2">({members.length}명)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">불러오는 중...</div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">등록된 조직원이 없습니다</p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 pb-8 min-w-max">

              {/* === 인원 현황 요약 (상단) === */}
              {headcount.length > 0 && (() => {
                const totalReq = headcount.reduce((s, r) => s + r.required, 0);
                const totalCur = headcount.reduce((s, r) => s + r.current, 0);
                const totalFut = headcount.reduce((s, r) => s + r.future, 0);
                const CAT_COLORS: Record<string, string> = {
                  "일반직": "bg-green-100 text-green-800",
                  "전문직": "bg-blue-100 text-blue-800",
                  "현채직": "bg-yellow-100 text-yellow-800",
                  "공동사": "bg-orange-100 text-orange-800",
                };
                return (
                  <div className="mb-6 border border-border rounded-lg overflow-hidden text-sm">
                    <div className="text-right text-xs text-muted-foreground px-3 py-1">※ 기타현채직(반장 2명)</div>
                    <table className="border-collapse w-full">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="px-6 py-2 font-semibold border-r border-border">구 분</th>
                          <th className="px-6 py-2 font-semibold border-r border-border">소요인원</th>
                          <th className="px-6 py-2 font-semibold border-r border-border">현재인원</th>
                          <th className="px-6 py-2 font-semibold">향후투입</th>
                        </tr>
                      </thead>
                      <tbody>
                        {headcount.map((row) => (
                          <tr key={row.category} className="border-t border-border">
                            <td className="px-6 py-1.5 border-r border-border">
                              <span className={`font-bold px-2 py-0.5 rounded text-xs ${CAT_COLORS[row.category] ?? ""}`}>{row.category}</span>
                            </td>
                            <td className="px-6 py-1.5 text-center border-r border-border font-mono">{row.required}</td>
                            <td className="px-6 py-1.5 text-center border-r border-border font-mono">{row.current}</td>
                            <td className="px-6 py-1.5 text-center font-mono">{row.future || "-"}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-border bg-amber-50 font-bold">
                          <td className="px-6 py-2 border-r border-border text-center">합 계</td>
                          <td className="px-6 py-2 text-center border-r border-border font-mono">{totalReq}</td>
                          <td className="px-6 py-2 text-center border-r border-border font-mono">{totalCur}</td>
                          <td className="px-6 py-2 text-center font-mono">{totalFut || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* === 최상위: 현장대리인 + 현장소장 === */}
              <div className="flex items-start gap-8">
                {topLevel.map((m) => (
                  <OrgMemberCard key={m.id} member={m} primary />
                ))}
              </div>

              {/* === 세로 연결선 === */}
              <div className="w-px h-6 bg-gray-400" />

              {/* === 가로 연결선 === */}
              <div className="border-t-2 border-gray-400" style={{ width: `${sortedDepts.length * 244}px` }} />

              {/* === 부서 컬럼들 === */}
              <div className="flex items-start">
                {sortedDepts.map(([deptName, deptMembers]) => (
                  <div key={deptName} className="flex flex-col items-center" style={{ width: 244 }}>
                    {/* 세로 연결선 */}
                    <div className="w-px h-4 bg-gray-400" />

                    {/* 부서 헤더 */}
                    <div className="text-[20px] font-bold text-primary border-2 border-primary bg-primary/5 px-6 py-2 rounded-full whitespace-nowrap mb-3 w-[200px] text-center">
                      {deptName}
                    </div>

                    {/* 부서 인원 (세로) */}
                    <div className="flex flex-col items-center gap-2">
                      {deptMembers.map((m) => (
                        <OrgMemberCard key={m.id} member={m} />
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
