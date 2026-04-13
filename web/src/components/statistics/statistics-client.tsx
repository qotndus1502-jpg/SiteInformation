"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { BreakdownTabs } from "./breakdown-tabs";
import { CorpDivisionChart } from "./corp-division-chart";
import { KoreaMapChart } from "./korea-map-chart";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { SiteList } from "@/components/dashboard/site-list";
import { SiteDetail } from "@/components/dashboard/site-detail";
import { SiteMap, type ColorCategory } from "@/components/dashboard/site-map";
import type { SiteFilter, FilterOptions } from "@/lib/queries/sites";
import type { SiteDashboard } from "@/types/database";

/* ── Dashboard Scaler ──────────────────────────────────── */

const BASE_W = 1560;
const BASE_H = 920;

function DashboardScaler({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const s = Math.max(window.innerWidth / BASE_W, 0.5);
      setScale(s);
      document.documentElement.style.setProperty("--dashboard-zoom", String(s));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      className="-mx-4 -mt-0.5 -mb-4 sm:-mx-6 sm:-mb-4 overflow-x-hidden"
      style={{ minHeight: "calc(100vh - 52px)" }}
    >
      <div
        className="flex flex-col gap-1 p-1 lg:p-2"
        style={{
          width: BASE_W,
          zoom: scale,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Types ──────────────────────────────────────────────── */

interface StatisticsSummary {
  progress: Record<string, any>;
  safety: Record<string, any>;
  headcount: Record<string, any>;
  budget: Record<string, any>;
  by_status: { status: string; count: number; total_contract: number; total_headcount: number }[];
  by_division: { division: string; count: number }[];
  total_sites: number;
  by_corporation: { corporation: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_region_group: { region_group: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  progress_distribution: { label: string; count: number }[];
  alert_sites: any[];
  by_division_detail: { division: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_amount_range: { label: string; count: number; total_contract: number; total_headcount: number }[];
  by_corporation_division: { corporation: string; division: string; count: number; total_contract: number; total_headcount: number }[];
  by_region: { region: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  pre_start_by_completion_year: { year: string; count: number }[];
  active_by_completion_year: { year: string; count: number }[];
  amount_heatmap: { by_contract: any[]; by_our_share: any[]; by_contract_division: any[]; by_our_share_division: any[]; labels: string[]; no_contract_count?: number; no_share_count?: number };
}

interface StatisticsClientProps {
  summary: StatisticsSummary;
  filterOptions: FilterOptions;
  initialSites?: SiteDashboard[];
}

/* ── SiteList + Detail (detail aligned to selected row) ── */

function SiteListWithDetail({
  sites,
  selectedSite,
  displayedSite,
  panelOpen,
  onSelectSite,
  onCloseSite,
  embedded = false,
}: {
  sites: SiteDashboard[];
  selectedSite: SiteDashboard | null;
  displayedSite: SiteDashboard | null;
  panelOpen: boolean;
  onSelectSite: (s: SiteDashboard) => void;
  onCloseSite: () => void;
  embedded?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Track whether the SITE LIST section is visible in the viewport so the
  // floating detail card hides when the user scrolls up to the dashboard area.
  const sectionRef = useRef<HTMLDivElement>(null);
  const [sectionInView, setSectionInView] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setSectionInView(entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: "0px 0px -50% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cardVisible = panelOpen && sectionInView;

  const content = (
    <>
      <div ref={sectionRef} className="relative">
        {/* List transitions to make room for floating detail panel */}
        <div
          className="transition-[padding-right] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ paddingRight: cardVisible ? 516 : 0 }}
        >
          <SiteList
            sites={sites}
            selectedSiteId={selectedSite?.id ?? null}
            onSelect={onSelectSite}
          />
        </div>
      </div>
      {/* Floating detail card: portal to body so it escapes DashboardScaler's zoom,
          but then re-applies the same zoom internally so the card scales in sync
          with the list. The card is only shown while the SITE LIST section is in
          the viewport — scrolling up to the dashboard/charts hides it. */}
      {mounted && displayedSite &&
        createPortal(
          <div
            className="fixed right-4 z-50 pointer-events-none transition-opacity duration-300"
            style={{
              top: "calc(var(--sticky-header-bottom, 200px) + 40px)",
              opacity: cardVisible ? 1 : 0,
              visibility: cardVisible ? "visible" : "hidden",
            }}
          >
            {/* Zoom layer — matches DashboardScaler so the card is drawn at the
                same scale as the site list next to it */}
            <div style={{ zoom: "var(--dashboard-zoom, 1)" }}>
              <div
                className="overflow-hidden transition-[max-width,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto shadow-2xl rounded-2xl"
                style={{
                  maxWidth: cardVisible ? 500 : 0,
                  opacity: cardVisible ? 1 : 0,
                }}
              >
                {/* CSS height divided by zoom so the *visual* height fills from
                    just below the sticky header down to ~16px above the viewport bottom. */}
                <div
                  className="w-[500px]"
                  style={{
                    height:
                      "calc((100vh - var(--sticky-header-bottom, 200px) - 56px) / var(--dashboard-zoom, 1))",
                  }}
                >
                  <SiteDetail site={displayedSite} onClose={onCloseSite} />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );

  if (embedded) return content;
  return (
    <div className="mt-[10px] p-4">
      {content}
    </div>
  );
}

/* ── Hero KPI Card ──────────────────────────────────────── */

function HeroKpi({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-0.5">
      <p className="text-[14px] text-muted-foreground">{label}</p>
      <p className="inline-flex items-center text-[20px] font-extrabold text-foreground tracking-tight">{value}<span className="text-[14px] font-normal text-muted-foreground ml-0.5">{unit}</span></p>
    </div>
  );
}

/* ── Mini Pie Chart (filled, for inside KPI cards) ──── */

const CORP_PIE_COLORS: Record<string, string> = {
  "남광토건": "rgba(255,255,255,0.9)",
  "극동건설": "rgba(255,255,255,0.5)",
  "금광기업": "rgba(255,255,255,0.25)",
};

function MiniPie({ data, valueKey }: { data: { name: string; value: number }[]; valueKey: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: 100, height: 100 }} />;

  const cx = 50;
  const cy = 50;
  const r = 42;
  let currentAngle = -90;

  const slices = data.map((d) => {
    const pct = d.value / total;
    const startAngle = currentAngle;
    const sweep = pct * 360;
    currentAngle += sweep;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = sweep > 180 ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...d, path, pct };
  });

  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-[80px] h-[80px] shrink-0">
        {slices.map((s) => (
          <path
            key={s.name}
            d={s.path}
            fill={CORP_PIE_COLORS[s.name] ?? "rgba(255,255,255,0.3)"}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-0.5">
        {slices.map((s) => (
          <div key={s.name} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CORP_PIE_COLORS[s.name] }} />
            <span className="text-[8px] text-white/70">{s.name}</span>
            <span className="text-[8px] font-bold text-white/90">{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

function setToParam(s: Set<string>): string {
  return Array.from(s).join(",");
}

export function StatisticsClient({ summary: initialSummary, filterOptions, initialSites = [] }: StatisticsClientProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [sites, setSites] = useState<SiteDashboard[]>(initialSites);
  const [selectedSite, setSelectedSite] = useState<SiteDashboard | null>(null);
  // Animation state for SiteDetail panel (mirrors dashboard-client.tsx map tab)
  const [displayedSite, setDisplayedSite] = useState<SiteDashboard | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const siteListRef = useRef<HTMLDivElement>(null);
  const handleSelectSite = useCallback((site: SiteDashboard) => {
    clearTimeout(closingTimer.current);
    setSelectedSite(site);
    setDisplayedSite(site);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPanelOpen(true);
        siteListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

  const handleCloseSite = useCallback(() => {
    setPanelOpen(false);
    closingTimer.current = setTimeout(() => {
      setSelectedSite(null);
      setDisplayedSite(null);
    }, 500);
  }, []);
  const [filters, setFilters] = useState<SiteFilter>({});
  const [amountRanges, setAmountRanges] = useState<Set<string>>(new Set());
  const [progressRanges, setProgressRanges] = useState<Set<string>>(new Set());
  // 자사 도급액 별 필터 — FilterBar에는 노출하지 않고, AmountHeatmapChart의
  // 자사도급액 시리즈 클릭으로만 토글된다.
  const [shareRanges, setShareRanges] = useState<Set<string>>(new Set());
  const [selectedStartYear, setSelectedStartYear] = useState<string | null>(null);
  const [selectedEndYear, setSelectedEndYear] = useState<string | null>(null);
  const [pageScale, setPageScale] = useState(1);
  const [stickyContentH, setStickyContentH] = useState(88);
  const stickyContentRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showDetailMap, setShowDetailMap] = useState(false);
  const [mapColorCategory, setMapColorCategory] = useState<ColorCategory>("corporation");
  const detailMapRef = useRef<HTMLDivElement>(null);

  const handleShowDetailMap = useCallback(() => {
    setShowDetailMap(true);
  }, []);

  // Lock page scroll while the DETAIL MAP view is active — only the detail card
  // scrolls internally; the map itself fills the viewport. Reset scroll to 0 so
  // both the page header (top-0) and the sticky KPI header (top-14) stay visible.
  useEffect(() => {
    if (!showDetailMap) return;
    window.scrollTo(0, 0);
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [showDetailMap]);

  useEffect(() => {
    function update() {
      const nextScale = Math.max(window.innerWidth / BASE_W, 0.5);
      setPageScale(nextScale);
      let nextStickyH = stickyContentH;
      if (stickyContentRef.current) {
        nextStickyH = stickyContentRef.current.offsetHeight;
        setStickyContentH(nextStickyH);
      }
      // Expose sticky header bottom (top-14 + header height) as a CSS var so the
      // floating detail card can anchor itself below it regardless of viewport width.
      const headerBottom = 56 + nextStickyH * nextScale;
      document.documentElement.style.setProperty("--sticky-header-bottom", `${headerBottom}px`);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [stickyContentH]);

  const buildParams = useCallback((f: SiteFilter, aRanges: Set<string>, pRanges: Set<string>, sRanges: Set<string>, sYear?: string | null, eYear?: string | null) => {
    const params = new URLSearchParams();
    if (f.corporation && f.corporation !== "all") params.set("corporation", f.corporation);
    if (f.division && f.division !== "all") params.set("division", f.division);
    if (f.region && f.region !== "all") params.set("region", f.region);
    if (f.facilityType && f.facilityType !== "all") params.set("facilityType", f.facilityType);
    if (f.orderType && f.orderType !== "all") params.set("orderType", f.orderType);
    if (f.status && f.status !== "all") params.set("status", f.status);
    if (f.search) params.set("search", f.search);
    if (aRanges.size > 0) params.set("amountRanges", setToParam(aRanges));
    if (pRanges.size > 0) params.set("progressRanges", setToParam(pRanges));
    if (sRanges.size > 0) params.set("groupShareRanges", setToParam(sRanges));
    if (sYear) params.set("startYear", sYear);
    if (eYear) params.set("endYear", eYear);
    return params;
  }, []);

  const fetchSummary = useCallback(async (f: SiteFilter, aRanges: Set<string>, pRanges: Set<string>, sRanges: Set<string>, sYear?: string | null, eYear?: string | null) => {
    const params = buildParams(f, aRanges, pRanges, sRanges, sYear, eYear);
    try {
      const qs = params.toString();
      const [summaryRes, sitesRes] = await Promise.all([
        fetch(`${API_BASE}/api/statistics/summary${qs ? `?${qs}` : ""}`),
        fetch(`${API_BASE}/api/sites${qs ? `?${qs}` : ""}`),
      ]);
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary({ ...initialSummary, ...data });
      }
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data);
      }
    } catch {}
  }, [initialSummary, buildParams]);

  const handleFilterChange = useCallback((key: keyof SiteFilter, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (key === "search") {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => fetchSummary(next, amountRanges, progressRanges, shareRanges, selectedStartYear, selectedEndYear), 300);
    } else {
      fetchSummary(next, amountRanges, progressRanges, shareRanges, selectedStartYear, selectedEndYear);
    }
  }, [filters, amountRanges, progressRanges, shareRanges, fetchSummary]);

  const handleAmountChange = useCallback((v: Set<string>) => {
    setAmountRanges(v);
    fetchSummary(filters, v, progressRanges, shareRanges, selectedStartYear, selectedEndYear);
  }, [filters, progressRanges, shareRanges, selectedStartYear, selectedEndYear, fetchSummary]);

  const handleProgressChange = useCallback((v: Set<string>) => {
    setProgressRanges(v);
    fetchSummary(filters, amountRanges, v, shareRanges, selectedStartYear, selectedEndYear);
  }, [filters, amountRanges, shareRanges, selectedStartYear, selectedEndYear, fetchSummary]);

  const handleResetFilters = useCallback(() => {
    const empty: SiteFilter = {};
    const emptyAmount = new Set<string>();
    const emptyProgress = new Set<string>();
    const emptyShare = new Set<string>();
    setFilters(empty);
    setAmountRanges(emptyAmount);
    setProgressRanges(emptyProgress);
    setShareRanges(emptyShare);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSelectedStartYear(null);
    setSelectedEndYear(null);
    fetchSummary(empty, emptyAmount, emptyProgress, emptyShare, null, null);
  }, [fetchSummary]);

  /* ── Cross-filter handlers (Power BI style) ──
     Clicking a chart element toggles the corresponding filter. Clicking the
     same element again clears it. The shared `handleFilterChange` already
     re-fetches summary + sites, so all charts and the site list update. */
  const handleCrossFilter = useCallback((key: keyof SiteFilter, value: string | null) => {
    const current = filters[key];
    const next = value == null || current === value ? "all" : value;
    handleFilterChange(key, next);
  }, [filters, handleFilterChange]);

  const handleRegionCrossFilter = useCallback((region: string | null) => {
    handleCrossFilter("region", region);
  }, [handleCrossFilter]);
  const handleCorpCrossFilter = useCallback((corp: string | null) => {
    handleCrossFilter("corporation", corp);
  }, [handleCrossFilter]);
  const handleStatusCrossFilter = useCallback((status: string | null) => {
    handleCrossFilter("status", status);
  }, [handleCrossFilter]);

  const handleAmountRangeCrossFilter = useCallback((rangeKey: string | null) => {
    if (rangeKey == null) {
      const empty = new Set<string>();
      setAmountRanges(empty);
      fetchSummary(filters, empty, progressRanges, shareRanges, selectedStartYear, selectedEndYear);
      return;
    }
    // Toggle: if already the only selected one, clear; otherwise select just it.
    const isOnlySelected = amountRanges.size === 1 && amountRanges.has(rangeKey);
    const next = new Set<string>(isOnlySelected ? [] : [rangeKey]);
    setAmountRanges(next);
    fetchSummary(filters, next, progressRanges, shareRanges, selectedStartYear, selectedEndYear);
  }, [filters, amountRanges, progressRanges, shareRanges, selectedStartYear, selectedEndYear, fetchSummary]);

  // 자사 도급액 별 — 백엔드 필터(`groupShareRanges`)에는 적용되지만 FilterBar에는 안 보임
  const handleShareRangeCrossFilter = useCallback((rangeKey: string | null) => {
    if (rangeKey == null) {
      const empty = new Set<string>();
      setShareRanges(empty);
      fetchSummary(filters, amountRanges, progressRanges, empty, selectedStartYear, selectedEndYear);
      return;
    }
    const isOnlySelected = shareRanges.size === 1 && shareRanges.has(rangeKey);
    const next = new Set<string>(isOnlySelected ? [] : [rangeKey]);
    setShareRanges(next);
    fetchSummary(filters, amountRanges, progressRanges, next, selectedStartYear, selectedEndYear);
  }, [filters, amountRanges, progressRanges, shareRanges, selectedStartYear, selectedEndYear, fetchSummary]);

  const handleStartYearClick = useCallback((year: string | null) => {
    setSelectedStartYear(year);
    setSelectedEndYear(null);
    fetchSummary(filters, amountRanges, progressRanges, shareRanges, year, null);
  }, [filters, amountRanges, progressRanges, shareRanges, fetchSummary]);

  const handleEndYearClick = useCallback((year: string | null) => {
    setSelectedEndYear(year);
    setSelectedStartYear(null);
    fetchSummary(filters, amountRanges, progressRanges, shareRanges, null, year);
  }, [filters, amountRanges, progressRanges, shareRanges, fetchSummary]);

  // Single-value selection state derived from current filter strings.
  // (Filter strings can be comma-separated; we treat exactly one value as "selected".)
  const selectedRegion = filters.region && filters.region !== "all" && !filters.region.includes(",") ? filters.region : null;
  const selectedCorp = filters.corporation && filters.corporation !== "all" && !filters.corporation.includes(",") ? filters.corporation : null;
  const selectedStatus = filters.status && filters.status !== "all" && !filters.status.includes(",") ? filters.status : null;
  const selectedAmountRange = amountRanges.size === 1 ? Array.from(amountRanges)[0] : null;
  const selectedShareRange = shareRanges.size === 1 ? Array.from(shareRanges)[0] : null;

  const progress = summary.progress;
  const headcount = summary.headcount;
  const budget = summary.budget;

  const execRatePct = ((budget.average_execution_rate ?? 0) * 100).toFixed(1);

  const byCorp = summary.by_corporation ?? [];
  const corpSites = byCorp.map((d) => ({ name: d.corporation, value: d.count }));
  const corpContract = byCorp.map((d) => ({ name: d.corporation, value: d.total_contract }));
  const corpHeadcount = byCorp.map((d) => ({ name: d.corporation, value: d.total_headcount }));

  return (
    <>
      {/* Sticky Header: Filter + KPIs - 페이지 헤더 바로 아래 고정 */}
      <div className="sticky top-14 z-30 bg-background border-b-[1.5px] border-slate-300 -mx-4 sm:-mx-6 overflow-x-hidden" style={{ height: `${stickyContentH * pageScale}px` }}>
        <div
          ref={stickyContentRef}
          style={{
            width: BASE_W,
            transform: `scale(${pageScale})`,
            transformOrigin: "top left",
          }}
          className="px-4 sm:px-6"
        >
          <FilterBar
            filterOptions={filterOptions}
            filters={filters}
            onFilterChange={handleFilterChange}
            amountRanges={amountRanges}
            progressRanges={progressRanges}
            onAmountRangesChange={handleAmountChange}
            onProgressRangesChange={handleProgressChange}
            onReset={handleResetFilters}
          />
          <div className="grid grid-cols-4 pb-4">
            <HeroKpi label="총 현장" value={`${summary.total_sites}`} unit="개" />
            <HeroKpi label="총 공사비" value={`${Math.round(budget.total_contract ?? 0).toLocaleString()}`} unit="억" />
            <HeroKpi label="자사 도급액" value={`${Math.round((budget as any).total_our_share ?? 0).toLocaleString()}`} unit="억" />
            <HeroKpi label="총 인원" value={`${(headcount.total ?? 0).toLocaleString()}`} unit="명" isLast />
          </div>
        </div>
      </div>

    <DashboardScaler>

      {!showDetailMap ? (
        <>
          {/* ── Charts area ── */}
          <div className="flex-1 min-h-0">
            <BreakdownTabs
              by_corporation={summary.by_corporation ?? []}
              by_division_detail={summary.by_division_detail ?? []}
              by_region_group={summary.by_region_group ?? []}
              by_status={summary.by_status ?? []}
              by_amount_range={summary.by_amount_range ?? []}
              by_region={summary.by_region ?? []}
              pre_start_by_completion_year={summary.pre_start_by_completion_year ?? []}
              active_by_completion_year={summary.active_by_completion_year ?? []}
              amount_heatmap={summary.amount_heatmap ?? { by_contract: [], by_our_share: [], by_contract_division: [], by_our_share_division: [], labels: [], no_contract_count: 0, no_share_count: 0 }}
              corpDivisionData={summary.by_corporation_division ?? []}
              onShowDetailMap={handleShowDetailMap}
              selectedRegion={selectedRegion}
              selectedCorp={selectedCorp}
              selectedStatus={selectedStatus}
              selectedAmountRange={selectedAmountRange}
              selectedShareRange={selectedShareRange}
              onRegionClick={handleRegionCrossFilter}
              onCorpClick={handleCorpCrossFilter}
              onStatusClick={handleStatusCrossFilter}
              onAmountRangeClick={handleAmountRangeCrossFilter}
              onShareRangeClick={handleShareRangeCrossFilter}
              selectedStartYear={selectedStartYear}
              selectedEndYear={selectedEndYear}
              onStartYearClick={handleStartYearClick}
              onEndYearClick={handleEndYearClick}
            />
          </div>

          {/* ── Site List area ── */}
          <div ref={siteListRef}>
            <SiteListWithDetail
              sites={sites}
              selectedSite={selectedSite}
              displayedSite={displayedSite}
              panelOpen={panelOpen}
              onSelectSite={handleSelectSite}
              onCloseSite={handleCloseSite}
            />
          </div>
        </>
      ) : (
        /* ── Detail map fills the whole body under the header (no heading row, no page scroll) ── */
        <div ref={detailMapRef} className="pt-1.5 px-4 overflow-hidden">
          {/* Map + animated detail card side-by-side — fills viewport, no page scroll */}
          <div
            className="flex gap-3"
            style={{
              height:
                "calc((100vh - var(--sticky-header-bottom, 200px) - 50px) / var(--dashboard-zoom, 1))",
            }}
          >
            <div className="relative flex-1 min-w-0">
              {/* Floating return button — top-right of map */}
              <button
                type="button"
                onClick={() => setShowDetailMap(false)}
                className="absolute top-3 right-10 z-20 flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium border transition-all hover:opacity-90"
                style={{ borderColor: "#1E3A8A", color: "#fff", backgroundColor: "#1E3A8A" }}
              >
                ← 대시보드로 돌아가기
              </button>
              {/* Color category selector + legend — top-left overlay */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                <div className="flex bg-card/90 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-border/50">
                  {([
                    { key: "corporation" as ColorCategory, label: "법인별" },
                    { key: "division" as ColorCategory, label: "부문별" },
                    { key: "status" as ColorCategory, label: "상태별" },
                  ]).map((c) => (
                    <button
                      key={c.key}
                      type="button"
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
                {/* Legend — varies by category */}
                <div className="flex flex-col gap-0.5 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm border border-border/50">
                  {(mapColorCategory === "corporation"
                    ? [{ label: "남광토건", color: "#22c55e" }, { label: "극동건설", color: "#3b82f6" }, { label: "금광기업", color: "#f97316" }]
                    : mapColorCategory === "division"
                    ? [{ label: "건축", color: "#2563EB" }, { label: "토목", color: "#F97316" }]
                    : [{ label: "진행중", color: "#3b82f6" }, { label: "착공전", color: "#f59e0b" }]
                  ).map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-foreground font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Force SiteMap (which has its own h-[calc(100vh-280px)]) to fill the parent box */}
              <div className="absolute inset-0 [&>div]:h-full [&>div>div]:!h-full [&>div>div]:!min-h-0">
                <SiteMap
                  sites={sites}
                  selectedSiteId={selectedSite?.id ?? null}
                  onSelect={handleSelectSite}
                  colorCategory={mapColorCategory}
                />
              </div>
            </div>
            {displayedSite && (
              <div
                className="shrink-0 hidden lg:block h-full overflow-hidden transition-[max-width,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{
                  maxWidth: panelOpen ? 500 : 0,
                  opacity: panelOpen ? 1 : 0,
                }}
              >
                <div className="w-[500px] h-full">
                  <SiteDetail site={displayedSite} onClose={handleCloseSite} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </DashboardScaler>
    </>
  );
}
