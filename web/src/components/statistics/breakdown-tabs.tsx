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
  "남광토건": "#2563EB",
  "극동건설": "#60A5FA",
  "금광기업": "#BFDBFE",
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
    <div className="space-y-4">
      {/* 지도(좌측) + 차트들(우측) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3 items-stretch">
        <KoreaMapChart data={by_region} />
        <div className="flex flex-col gap-4">
          <CorpDivisionChart data={corpDivisionData} />
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
            <StatusDonutChart data={by_status} />
            <CompletionYearChart preStartData={completionYears} activeData={activeYears} />
          </div>
          <AmountHeatmapChart data={amount_heatmap} />
        </div>
      </div>
    </div>
  );
}
