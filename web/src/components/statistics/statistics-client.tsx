"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Building2, Wallet, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { BreakdownTabs } from "./breakdown-tabs";
import { CorpDivisionChart } from "./corp-division-chart";
import { KoreaMapChart } from "./korea-map-chart";
import { FilterBar } from "@/components/dashboard/filter-bar";
import type { SiteFilter, FilterOptions } from "@/lib/queries/sites";

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
  amount_heatmap: { by_contract: any[]; by_our_share: any[]; by_contract_division: any[]; by_our_share_division: any[]; labels: string[] };
}

interface StatisticsClientProps {
  summary: StatisticsSummary;
  filterOptions: FilterOptions;
}

/* ── Hero KPI Card ──────────────────────────────────────── */

function HeroKpi({
  icon: Icon,
  label,
  value,
  accent = "bg-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="relative bg-card border border-border rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 overflow-hidden">
      <div className={cn("p-1.5 rounded-lg bg-muted")}>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground ml-auto">{value}</p>
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
  if (total === 0) return null;

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

export function StatisticsClient({ summary: initialSummary, filterOptions }: StatisticsClientProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [filters, setFilters] = useState<SiteFilter>({});
  const [amountRanges, setAmountRanges] = useState<Set<string>>(new Set());
  const [progressRanges, setProgressRanges] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSummary = useCallback(async (f: SiteFilter, aRanges: Set<string>, pRanges: Set<string>) => {
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

    try {
      const qs = params.toString();
      const res = await fetch(`${API_BASE}/api/statistics/summary${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setSummary({ ...initialSummary, ...data });
      }
    } catch {}
  }, [initialSummary]);

  const handleFilterChange = useCallback((key: keyof SiteFilter, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    if (key === "search") {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => fetchSummary(next, amountRanges, progressRanges), 300);
    } else {
      fetchSummary(next, amountRanges, progressRanges);
    }
  }, [filters, amountRanges, progressRanges, fetchSummary]);

  const handleAmountChange = useCallback((v: Set<string>) => {
    setAmountRanges(v);
    fetchSummary(filters, v, progressRanges);
  }, [filters, progressRanges, fetchSummary]);

  const handleProgressChange = useCallback((v: Set<string>) => {
    setProgressRanges(v);
    fetchSummary(filters, amountRanges, v);
  }, [filters, amountRanges, fetchSummary]);

  const progress = summary.progress;
  const headcount = summary.headcount;
  const budget = summary.budget;

  const execRatePct = ((budget.average_execution_rate ?? 0) * 100).toFixed(1);

  const byCorp = summary.by_corporation ?? [];
  const corpSites = byCorp.map((d) => ({ name: d.corporation, value: d.count }));
  const corpContract = byCorp.map((d) => ({ name: d.corporation, value: d.total_contract }));
  const corpHeadcount = byCorp.map((d) => ({ name: d.corporation, value: d.total_headcount }));

  return (
    <div className="space-y-3 p-3 lg:p-4 pt-1 lg:pt-2 bg-slate-900 min-h-screen -m-4 lg:-m-5 rounded-xl">

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border/40 shadow-sm">
        <FilterBar
          filterOptions={filterOptions}
          filters={filters}
          onFilterChange={handleFilterChange}
          amountRanges={amountRanges}
          progressRanges={progressRanges}
          onAmountRangesChange={handleAmountChange}
          onProgressRangesChange={handleProgressChange}
        />
      </div>

      {/* ── Hero KPIs ── */}
      <div className="grid grid-cols-4 gap-3">
        <HeroKpi icon={Building2} label="총 현장" value={`${summary.total_sites}개`} accent="bg-blue-500" />
        <HeroKpi icon={Wallet} label="총 공사비" value={`${Math.round(budget.total_contract ?? 0).toLocaleString()}억`} accent="bg-blue-500" />
        <HeroKpi icon={Wallet} label="자사 도급액" value={`${Math.round(budget.total_our_share ?? 0).toLocaleString()}억`} accent="bg-blue-500" />
        <HeroKpi icon={Users} label="총 인원" value={`${(headcount.total ?? 0).toLocaleString()}명`} accent="bg-blue-500" />
      </div>

      {/* ── Map + Charts ── */}
      <BreakdownTabs
        by_corporation={summary.by_corporation ?? []}
        by_division_detail={summary.by_division_detail ?? []}
        by_region_group={summary.by_region_group ?? []}
        by_status={summary.by_status ?? []}
        by_amount_range={summary.by_amount_range ?? []}
        by_region={summary.by_region ?? []}
        pre_start_by_completion_year={summary.pre_start_by_completion_year ?? []}
        active_by_completion_year={summary.active_by_completion_year ?? []}
        amount_heatmap={summary.amount_heatmap ?? { by_contract: [], by_our_share: [], labels: [] }}
        corpDivisionData={summary.by_corporation_division ?? []}
      />


    </div>
  );
}
