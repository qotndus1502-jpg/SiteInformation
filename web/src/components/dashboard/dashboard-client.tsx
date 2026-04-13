"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { List, LayoutGrid, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBar } from "./filter-bar";
import { SiteList } from "./site-list";
import { SiteCardGrid } from "./site-card-grid";
import { SiteMap, type ColorCategory } from "./site-map";
import { charts } from "@/lib/chart-colors";
import { SiteDetail } from "./site-detail";
import type { SiteFilter, FilterOptions } from "@/lib/queries/sites";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const DASH_BASE_W = 1560;

function DashboardScaler({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const s = Math.max(window.innerWidth / DASH_BASE_W, 0.5);
      setScale(s);
      document.documentElement.style.setProperty("--dashboard-zoom", String(s));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="overflow-x-hidden" style={{ minHeight: "calc(100vh - 52px)" }}>
      <div
        className="flex flex-col gap-2 p-2 lg:p-3"
        style={{ width: DASH_BASE_W, zoom: scale }}
      >
        {children}
      </div>
    </div>
  );
}
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
  const searchParams = useSearchParams();
  const initialView: ViewMode = searchParams?.get("view") === "map" ? "map" : "list";
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  useEffect(() => {
    const v = searchParams?.get("view");
    setViewMode(v === "map" ? "map" : "list");
  }, [searchParams]);
  const [mapColorCategory, setMapColorCategory] = useState<ColorCategory>("corporation");
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

  const handleResetFilters = useCallback(() => {
    const empty: SiteFilter = {};
    const emptyAmount = new Set<string>();
    const emptyProgress = new Set<string>();
    setFilters(empty);
    setAmountRanges(emptyAmount);
    setProgressRanges(emptyProgress);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    buildAndFetch(empty, emptyAmount, emptyProgress);
  }, [buildAndFetch]);

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
    <DashboardScaler>
      {/* 1행: 통계 + 뷰토글 (지도 뷰에서는 숨김) */}
      {viewMode !== "map" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Stat label="전체 현장" value={stats.total} unit="개소" />
            <div className="w-px h-4 bg-border" />
            <Stat label="진행중" value={stats.active} />
            <div className="w-px h-4 bg-border" />
            <Stat label="총 인원" value={stats.totalWorkers.toLocaleString()} unit="명" />
            <div className="w-px h-4 bg-border" />
            <Stat label="총 도급액" value={`${Math.round(stats.totalAmount / 100)}`} unit="백억" />
          </div>
        </div>
      )}

      {/* 2행: 필터 (리스트/카드 뷰일 때만 표시, 지도에서는 숨김) */}
      {viewMode !== "list" && viewMode !== "map" && (
        <FilterBar
          filterOptions={filterOptions}
          filters={filters}
          onFilterChange={handleFilterChange}
          amountRanges={amountRanges}
          progressRanges={progressRanges}
          onAmountRangesChange={handleAmountRangesChange}
          onProgressRangesChange={handleProgressRangesChange}
          onReset={handleResetFilters}
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
                onReset={handleResetFilters}
              />
              <SiteList sites={sites} selectedSiteId={selectedSite?.id ?? null} onSelect={handleSelect} />
            </>
          )}
          {viewMode === "card" && (
            <SiteCardGrid sites={sites} selectedSiteId={selectedSite?.id ?? null} onSelect={handleSelect} />
          )}
          {viewMode === "map" && (
            <div className="relative">
              {/* Color category selector - top left overlay */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                <div className="flex bg-card/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-border/50">
                  {([
                    { key: "corporation" as ColorCategory, label: "법인별" },
                    { key: "division" as ColorCategory, label: "부문별" },
                    { key: "status" as ColorCategory, label: "상태별" },
                  ]).map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setMapColorCategory(c.key)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        mapColorCategory === c.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {/* Legend */}
                <div className="flex flex-col gap-0.5 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm border border-border/50">
                  {(mapColorCategory === "corporation"
                    ? [
                        { label: "남광토건", color: charts.siteMap.corporation.namgwang },
                        { label: "극동건설", color: charts.siteMap.corporation.geukdong },
                        { label: "금광기업", color: charts.siteMap.corporation.geumgwang },
                      ]
                    : mapColorCategory === "division"
                    ? [
                        { label: "건축", color: charts.siteMap.division.arch },
                        { label: "토목", color: charts.siteMap.division.civil },
                      ]
                    : [
                        { label: "진행중", color: charts.siteMap.status.active },
                        { label: "착공전", color: charts.siteMap.status.preStart },
                      ]
                  ).map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-foreground font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <SiteMap sites={sites} selectedSiteId={selectedSite?.id ?? null} onSelect={handleSelect} colorCategory={mapColorCategory} />
            </div>
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
    </DashboardScaler>
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
