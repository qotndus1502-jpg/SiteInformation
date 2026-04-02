"use client";

import { useState, useCallback, useRef } from "react";
import { List, LayoutGrid, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBar } from "./filter-bar";
import { SiteList } from "./site-list";
import { SiteCardGrid } from "./site-card-grid";
import { SiteMap } from "./site-map";
import { SiteDetail } from "./site-detail";
import type { SiteFilter, FilterOptions } from "@/lib/queries/sites";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
import type { SiteDashboard } from "@/types/database";

type ViewMode = "list" | "card" | "map";

interface DashboardClientProps {
  initialSites: SiteDashboard[];
  filterOptions: FilterOptions;
}

function setToParam(s: Set<string>): string {
  return [...s].join(",");
}

const VIEW_OPTIONS: { mode: ViewMode; icon: typeof List; label: string }[] = [
  { mode: "list", icon: List, label: "리스트" },
  { mode: "card", icon: LayoutGrid, label: "카드" },
  { mode: "map", icon: Map, label: "지도" },
];

export function DashboardClient({ initialSites, filterOptions }: DashboardClientProps) {
  const [sites, setSites] = useState(initialSites);
  const [selectedSite, setSelectedSite] = useState<SiteDashboard | null>(null);
  const [displayedSite, setDisplayedSite] = useState<SiteDashboard | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSelect = useCallback((site: SiteDashboard) => {
    clearTimeout(closingTimer.current);
    setSelectedSite(site);
    setDisplayedSite(site);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPanelOpen(true);
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setPanelOpen(false);
    closingTimer.current = setTimeout(() => {
      setSelectedSite(null);
      setDisplayedSite(null);
    }, 500);
  }, []);
  const [filters, setFilters] = useState<SiteFilter>({});
  const [amountRanges, setAmountRanges] = useState<Set<string>>(new Set());
  const [progressRanges, setProgressRanges] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSites = useCallback(async (f: SiteFilter) => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, v);
    });
    const res = await fetch(`${API_BASE}/api/sites?${params.toString()}`);
    const data = await res.json();
    setSites(data);
  }, []);

  const buildAndFetch = useCallback((f: SiteFilter, aRanges: Set<string>, pRanges: Set<string>) => {
    const next = { ...f };
    if (aRanges.size > 0) next.amountRanges = setToParam(aRanges);
    else delete next.amountRanges;
    if (pRanges.size > 0) next.progressRanges = setToParam(pRanges);
    else delete next.progressRanges;
    fetchSites(next);
  }, [fetchSites]);

  const handleFilterChange = useCallback((key: keyof SiteFilter, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value === "all" ? undefined : value || undefined };
      if (key === "search") {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => buildAndFetch(next, amountRanges, progressRanges), 300);
      } else {
        buildAndFetch(next, amountRanges, progressRanges);
      }
      return next;
    });
  }, [buildAndFetch, amountRanges, progressRanges]);

  const handleAmountRangesChange = useCallback((v: Set<string>) => {
    setAmountRanges(v);
    buildAndFetch(filters, v, progressRanges);
  }, [buildAndFetch, filters, progressRanges]);

  const handleProgressRangesChange = useCallback((v: Set<string>) => {
    setProgressRanges(v);
    buildAndFetch(filters, amountRanges, v);
  }, [buildAndFetch, filters, amountRanges]);

  const OUR_COMPANIES = ["남광토건", "극동건설", "금광기업"];

  function calcOurShare(site: SiteDashboard): number {
    if (site.our_share_amount != null) return site.our_share_amount;
    if (site.contract_amount != null && site.jv_summary) {
      const regex = /(남광토건|극동건설|금광기업)\s+([\d.]+)%/g;
      let totalPct = 0;
      let m;
      while ((m = regex.exec(site.jv_summary)) !== null) {
        totalPct += parseFloat(m[2]);
      }
      if (totalPct > 0) return Math.round(site.contract_amount * totalPct / 100);
    }
    return site.contract_amount ?? 0;
  }

  const stats = {
    total: sites.length,
    active: sites.filter((s) => s.status === "ACTIVE").length,
    totalWorkers: sites.reduce((sum, s) => sum + (s.headcount ?? 0), 0),
    totalAmount: sites.reduce((sum, s) => sum + calcOurShare(s), 0),
  };

  return (
    <div className="space-y-2">
      {/* 1행: 통계 + 뷰토글 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Stat label="전체 현장" value={stats.total} unit="개소" />
          <div className="w-px h-4 bg-border" />
          <Stat label="진행중" value={stats.active} />
          <div className="w-px h-4 bg-border" />
          <Stat label="총 인원" value={stats.totalWorkers.toLocaleString()} unit="명" />
          <div className="w-px h-4 bg-border" />
          <Stat label="총 도급액" value={Math.round(stats.totalAmount).toLocaleString()} unit="억" />
        </div>
        <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
          {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={label}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2행: 필터 (리스트 뷰가 아닐 때만 독립 배치) */}
      {viewMode !== "list" && (
        <FilterBar
          filterOptions={filterOptions}
          filters={filters}
          onFilterChange={handleFilterChange}
          amountRanges={amountRanges}
          progressRanges={progressRanges}
          onAmountRangesChange={handleAmountRangesChange}
          onProgressRangesChange={handleProgressRangesChange}
        />
      )}

      {/* 3행: 리스트 + 상세 */}
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          {viewMode === "list" && (
            <>
              <FilterBar
                filterOptions={filterOptions}
                filters={filters}
                onFilterChange={handleFilterChange}
                amountRanges={amountRanges}
                progressRanges={progressRanges}
                onAmountRangesChange={handleAmountRangesChange}
                onProgressRangesChange={handleProgressRangesChange}
              />
              <SiteList sites={sites} selectedSiteId={selectedSite?.id ?? null} onSelect={handleSelect} />
            </>
          )}
          {viewMode === "card" && (
            <SiteCardGrid sites={sites} selectedSiteId={selectedSite?.id ?? null} onSelect={handleSelect} />
          )}
          {viewMode === "map" && (
            <SiteMap sites={sites} selectedSiteId={selectedSite?.id ?? null} onSelect={handleSelect} />
          )}
        </div>
        {displayedSite && (
          <div
            className="shrink-0 hidden lg:block overflow-hidden transition-[max-width,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              maxWidth: panelOpen ? 700 : 0,
              opacity: panelOpen ? 1 : 0,
            }}
          >
            <div className="w-[700px]">
              <SiteDetail site={displayedSite} onClose={handleClose} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-bold font-mono tabular-nums">{value}</span>
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}
