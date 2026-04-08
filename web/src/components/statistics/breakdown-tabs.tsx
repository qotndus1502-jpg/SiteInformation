"use client";

import type { RingEntry } from "./chart-types";
import { RadialRingChart } from "./radial-ring-chart";
import { KoreaMapChart } from "./korea-map-chart";
import { StatusDonutChart } from "./status-donut-chart";
import { CorpDivisionChart } from "./corp-division-chart";
import { AmountHeatmapChart } from "./amount-heatmap-chart";
import { CompletionYearChart } from "./completion-year-chart";

/* ── Types ──────────────────────────────────────────────── */

interface BreakdownTabsProps {
  by_corporation: { corporation: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_division_detail: { division: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_region_group: { region_group: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  by_status: { status: string; count: number; total_contract: number; total_headcount: number }[];
  by_amount_range: { label: string; count: number; total_contract: number; total_headcount: number }[];
  by_region: { region: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  pre_start_by_completion_year: { year: string; count: number }[];
  active_by_completion_year: { year: string; count: number }[];
  corpDivisionData: { corporation: string; division: string; count: number; total_contract: number; total_headcount: number }[];
  amount_heatmap: { by_contract: any[]; by_our_share: any[]; by_contract_division: any[]; by_our_share_division: any[]; labels: string[] };
}

/* ── Constants ──────────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "진행중",
  PRE_START: "착공전",
  COMPLETED: "준공",
  SUSPENDED: "중단",
};

const CORP_COLORS: Record<string, string> = {
  "남광토건": "#3B82F6",
  "극동건설": "#3B82F6",
  "금광기업": "#3B82F6",
};

const DIV_COLORS: Record<string, string> = {
  "건축": "#2563EB",
  "토목": "#94A3B8",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#2563EB",
  PRE_START: "#F59E0B",
  COMPLETED: "#94A3B8",
  SUSPENDED: "#94A3B8",
};

const AMOUNT_COLORS = ["#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6", "#1D4ED8"];

/* ── Main Component ─────────────────────────────────────── */

export function BreakdownTabs({
  by_corporation,
  by_division_detail,
  by_region_group,
  by_status,
  by_amount_range,
  by_region,
  pre_start_by_completion_year: completionYears,
  active_by_completion_year: activeYears,
  amount_heatmap,
  corpDivisionData,
}: BreakdownTabsProps) {

  // Build data for each category
  const corpSites: RingEntry[] = by_corporation.map((d) => ({
    name: d.corporation, value: d.count, color: CORP_COLORS[d.corporation] ?? "#3B82F6",
  }));
  const corpContract: RingEntry[] = by_corporation.map((d) => ({
    name: d.corporation, value: d.total_contract, color: CORP_COLORS[d.corporation] ?? "#3B82F6",
  }));

  const divSites: RingEntry[] = by_division_detail.map((d) => ({
    name: d.division, value: d.count, color: DIV_COLORS[d.division] ?? "#3B82F6",
  }));
  const divContract: RingEntry[] = by_division_detail.map((d) => ({
    name: d.division, value: d.total_contract, color: DIV_COLORS[d.division] ?? "#3B82F6",
  }));

  const amountSites: RingEntry[] = by_amount_range.map((d, i) => ({
    name: d.label, value: d.count, color: AMOUNT_COLORS[i % AMOUNT_COLORS.length],
  }));

  return (
    <div className="h-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] h-full">
        <div className="pr-5">
          <KoreaMapChart data={by_region} />
        </div>
        <div className="flex flex-col min-h-0 pl-5">
          <div className="border-b border-slate-400 pb-3">
            <CorpDivisionChart data={corpDivisionData} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] border-b border-slate-400 py-3">
            <div>
              <StatusDonutChart data={by_status} />
            </div>
            <CompletionYearChart preStartData={completionYears} activeData={activeYears} />
          </div>
          <div className="pt-3">
            <AmountHeatmapChart data={amount_heatmap} />
          </div>
        </div>
      </div>
    </div>
  );
}
