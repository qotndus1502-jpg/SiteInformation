"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { SiteDashboard } from "@/types/database";
import { COMPANY_CONFIG, STATUS_CONFIG } from "@/types/database";

const TABLE_COLS = "grid-cols-[minmax(80px,0.8fr)_minmax(70px,0.7fr)_minmax(70px,0.7fr)_minmax(80px,0.8fr)_minmax(80px,0.8fr)_minmax(80px,0.8fr)_minmax(140px,2fr)_minmax(75px,0.9fr)_minmax(30px,0.2fr)_minmax(70px,0.9fr)]";

type SortKey = "corporation_name" | "division" | "region_name" | "facility_type_name" | "order_type" | "status" | "site_name" | "contract_amount" | "progress_rate";
type SortDir = "asc" | "desc";

interface SiteListProps {
  sites: SiteDashboard[];
  selectedSiteId: number | null;
  onSelect: (site: SiteDashboard) => void;
}

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "corporation_name", label: "법인" },
  { key: "division", label: "부문" },
  { key: "region_name", label: "지역" },
  { key: "facility_type_name", label: "시설유형" },
  { key: "order_type", label: "발주유형" },
  { key: "status", label: "상태" },
  { key: "site_name", label: "현장명" },
  { key: "contract_amount", label: "공사금액", align: "right" },
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />;
}

export function SiteList({ sites, selectedSiteId, onSelect }: SiteListProps) {
  const [sortKeys, setSortKeys] = useState<{ key: SortKey; dir: SortDir }[]>([]);

  const handleSort = (key: SortKey) => {
    setSortKeys((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) {
        // 새 키 추가 (뒤에)
        return [...prev, { key, dir: "asc" }];
      }
      if (prev[idx].dir === "asc") {
        // 두 번째 클릭: desc
        const next = [...prev];
        next[idx] = { key, dir: "desc" };
        return next;
      }
      // 세 번째 클릭: 제거
      return prev.filter((_, i) => i !== idx);
    });
  };

  const sorted = useMemo(() => {
    if (sortKeys.length === 0) return sites;
    return [...sites].sort((a, b) => {
      for (const { key, dir } of sortKeys) {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) continue;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "ko");
        if (cmp !== 0) return dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [sites, sortKeys]);

  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      {/* 컬럼 헤더 */}
      <div className={cn("grid gap-2 px-4 py-1.5 bg-muted/60 border-b border-border text-[13px] font-semibold text-muted-foreground tracking-wide", TABLE_COLS)}>
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={cn(
              "flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors",
              col.align === "right" && "justify-end"
            )}
          >
            {col.label}
            {(() => { const s = sortKeys.find((sk) => sk.key === col.key); return <SortIcon active={!!s} dir={s?.dir ?? "asc"} />; })()}
          </button>
        ))}
        <span />
        <button
          onClick={() => handleSort("progress_rate")}
          className="flex items-center gap-1 justify-end cursor-pointer hover:text-foreground transition-colors"
        >
          공정률
          {(() => { const s = sortKeys.find((sk) => sk.key === "progress_rate"); return <SortIcon active={!!s} dir={s?.dir ?? "asc"} />; })()}
        </button>
      </div>

      {/* 데이터 행 */}
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <p className="text-sm">검색 결과가 없습니다</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40 max-h-[calc(100vh-260px)] overflow-y-auto">
          {sorted.map((site) => {
            const companyConfig = COMPANY_CONFIG[site.corporation_name];
            const statusConfig = STATUS_CONFIG[site.status];
            const progressPct = (site.progress_rate ?? 0) * 100;

            return (
              <div
                key={site.id}
                onClick={() => onSelect(site)}
                className={cn(
                  "grid gap-2 px-4 py-2 cursor-pointer transition-colors items-center",
                  TABLE_COLS,
                  selectedSiteId === site.id
                    ? "bg-accent border-l-[3px] border-l-primary"
                    : "hover:bg-muted/30"
                )}
              >
                <span>
                  {companyConfig ? (
                    <Badge variant={companyConfig.variant} size="sm">{companyConfig.label}</Badge>
                  ) : (
                    <span className="text-[16px] text-foreground">{site.corporation_name}</span>
                  )}
                </span>
                <span className="text-[16px] text-foreground">{site.division}</span>
                <span className="text-[16px] text-foreground">{site.region_name}</span>
                <span className="text-[16px] text-foreground truncate">{site.facility_type_name}</span>
                <span className="text-[16px] text-foreground truncate">{site.order_type ?? "-"}</span>
                <span>
                  {statusConfig ? (
                    <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
                  ) : (
                    <span className="text-xs">{site.status}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{site.site_name}</p>
                  {site.office_address && (
                    <p className="text-[12px] text-muted-foreground/70 truncate">{site.office_address}</p>
                  )}
                </div>
                <span className="text-[14px] text-foreground font-mono text-right tabular-nums">
                  {site.contract_amount != null ? `${Math.round(site.contract_amount / 100)}백억` : "-"}
                </span>
                <span />
                <div className="text-right">
                  <span className="text-[14px] text-foreground font-mono tabular-nums">{progressPct.toFixed(0)}%</span>
                  <div className="h-1 bg-muted rounded-full mt-0.5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, progressPct)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
