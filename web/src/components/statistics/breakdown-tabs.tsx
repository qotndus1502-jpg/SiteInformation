"use client";

import { memo } from "react";
import type { RingEntry } from "./chart-types";
import { KoreaMapChart } from "./korea-map-chart";
import { StatusDonutChart } from "./status-donut-chart";
import { CorpDivisionChart } from "./corp-division-chart";
import { AmountHeatmapChart } from "./amount-heatmap-chart";
import { CompletionYearChart } from "./completion-year-chart";
import { charts } from "@/lib/chart-colors";

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
  amount_heatmap: {
    by_contract: ({ corporation: string } & Record<string, string | number>)[];
    by_our_share: ({ corporation: string } & Record<string, string | number>)[];
    by_contract_division: ({ division: string } & Record<string, string | number>)[];
    by_our_share_division: ({ division: string } & Record<string, string | number>)[];
    labels: string[];
    no_contract_count?: number;
    no_share_count?: number;
  };
  onShowDetailMap?: () => void;
  /* ── Cross-filter (Power BI style) ───────────────────── */
  selectedRegion?: string | null;
  selectedCorp?: string | null;
  selectedStatus?: string | null;
  selectedAmountRange?: string | null;
  selectedShareRange?: string | null;
  onRegionClick?: (region: string | null) => void;
  onCorpClick?: (corp: string | null) => void;
  onStatusClick?: (status: string | null) => void;
  onAmountRangeClick?: (rangeKey: string | null) => void;
  onShareRangeClick?: (rangeKey: string | null) => void;
  selectedStartYear?: string | null;
  selectedEndYear?: string | null;
  onStartYearClick?: (year: string | null) => void;
  onEndYearClick?: (year: string | null) => void;
}

/* ── Constants ──────────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "진행중",
  PRE_START: "착공전",
  COMPLETED: "준공",
  SUSPENDED: "중단",
};

const CORP_COLORS: Record<string, string> = {
  "남광토건": charts.breakdownCorp.namgwang,
  "극동건설": charts.breakdownCorp.geukdong,
  "금광기업": charts.breakdownCorp.geumgwang,
};
const CORP_FALLBACK = charts.breakdownCorp.fallback;

const DIV_COLORS: Record<string, string> = {
  "건축": charts.breakdownDivision.arch,
  "토목": charts.breakdownDivision.civil,
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: charts.breakdownStatus.active,
  PRE_START: charts.breakdownStatus.preStart,
  COMPLETED: charts.breakdownStatus.completed,
  SUSPENDED: charts.breakdownStatus.suspended,
};

const AMOUNT_COLORS = charts.breakdownAmount;

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
  onShowDetailMap,
  selectedRegion,
  selectedCorp,
  selectedStatus,
  selectedAmountRange,
  selectedShareRange,
  onRegionClick,
  onCorpClick,
  onStatusClick,
  onAmountRangeClick,
  onShareRangeClick,
  selectedStartYear,
  selectedEndYear,
  onStartYearClick,
  onEndYearClick,
}: BreakdownTabsProps) {

  // Build data for each category
  const corpSites: RingEntry[] = by_corporation.map((d) => ({
    name: d.corporation, value: d.count, color: CORP_COLORS[d.corporation] ?? CORP_FALLBACK,
  }));
  const corpContract: RingEntry[] = by_corporation.map((d) => ({
    name: d.corporation, value: d.total_contract, color: CORP_COLORS[d.corporation] ?? CORP_FALLBACK,
  }));

  const divSites: RingEntry[] = by_division_detail.map((d) => ({
    name: d.division, value: d.count, color: DIV_COLORS[d.division] ?? CORP_FALLBACK,
  }));
  const divContract: RingEntry[] = by_division_detail.map((d) => ({
    name: d.division, value: d.total_contract, color: DIV_COLORS[d.division] ?? CORP_FALLBACK,
  }));

  const amountSites: RingEntry[] = by_amount_range.map((d, i) => ({
    name: d.label, value: d.count, color: AMOUNT_COLORS[i % AMOUNT_COLORS.length],
  }));

  return (
    <div className="h-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] h-full gap-2">
        <div className="rounded-[6px] glass-card-dark overflow-hidden">
          <KoreaMapChart data={by_region} onShowDetailMap={onShowDetailMap} selectedRegion={selectedRegion} onRegionClick={onRegionClick} />
        </div>
        <div className="flex flex-col min-h-0 gap-2">
          {/* Row 1 — 법인별: 현장수 / 자사도급액 / 인원 (right edge aligned with row 3 below) */}
          <div className="relative rounded-[6px] glass-card py-4 px-3 flex justify-end">
            {/* Legend — same position as Row 2/3 for alignment */}
            <div className="absolute top-3 left-5 z-10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.08)]" style={{ backgroundColor: DIV_COLORS["건축"] }} />
                <span className="text-[11px] font-medium text-slate-600 tracking-wide">건축</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.08)]" style={{ backgroundColor: DIV_COLORS["토목"] }} />
                <span className="text-[11px] font-medium text-slate-600 tracking-wide">토목</span>
              </div>
            </div>
            <CorpDivisionChart data={corpDivisionData} selectedCorp={selectedCorp} onCorpClick={onCorpClick} />
          </div>

          {/* Row 2 — 상태별: 도넛 + 착공·준공예정 가로 배치 (Row 1 의 CorpDivisionChart 폭에 맞춰 우측 정렬) */}
          <div className="relative px-3 py-0 rounded-[6px] glass-card">
            {/* Legend — top-left of the row (matches Row 3 legend x position) */}
            <div className="absolute top-2 left-5 z-10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.08)]" style={{ backgroundColor: STATUS_COLORS.ACTIVE }} />
                <span className="text-[11px] font-medium text-slate-600 tracking-wide">진행중</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.08)]" style={{ backgroundColor: STATUS_COLORS.PRE_START }} />
                <span className="text-[11px] font-medium text-slate-600 tracking-wide">착공전</span>
              </div>
            </div>
            <div className="flex justify-end">
              <div style={{ width: 956 }} className="flex items-start">
                {/* 도넛 — 첫 번째 metric 컬럼(법인별 현장 수, x: 68~348) 중앙 */}
                <div style={{ width: 348, paddingLeft: 68 }} className="flex justify-center shrink-0">
                  <StatusDonutChart data={by_status} selectedStatus={selectedStatus} onStatusClick={onStatusClick} />
                </div>
                {/* CompletionYear — 도넛 우측 나머지 영역 */}
                <div className="flex-1 flex items-start pt-3">
                  <CompletionYearChart preStartData={completionYears} activeData={activeYears} selectedStartYear={selectedStartYear} selectedEndYear={selectedEndYear} onStartYearClick={onStartYearClick} onEndYearClick={onEndYearClick} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 — 금액별: 자사도급액별(좌, mirror) | 총공사비별(우) — 두 차트가 중앙에서 맞닿도록 */}
          <div className="relative p-3 rounded-[6px] glass-card">
            {/* Legend — top-left of the row (matches Row 2 legend x position) */}
            <div className="absolute top-3 left-5 z-10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.08)]" style={{ backgroundColor: DIV_COLORS["건축"] }} />
                <span className="text-[11px] font-medium text-slate-600 tracking-wide">건축</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(15,23,42,0.08)]" style={{ backgroundColor: DIV_COLORS["토목"] }} />
                <span className="text-[11px] font-medium text-slate-600 tracking-wide">토목</span>
              </div>
              {((amount_heatmap.no_contract_count ?? 0) > 0 || (amount_heatmap.no_share_count ?? 0) > 0) && (
                <span className="text-[11px] font-medium text-slate-600 tracking-wide">
                  미입력 {amount_heatmap.no_contract_count ?? 0}개
                </span>
              )}
            </div>
            <div className="flex items-start justify-center gap-0 [&>*]:-mx-2 [&>*]:-my-2">
              <AmountHeatmapChart data={amount_heatmap} series="share" mirror selectedRangeKey={selectedShareRange} onRangeClick={onShareRangeClick} />
              <AmountHeatmapChart data={amount_heatmap} series="contract" selectedRangeKey={selectedAmountRange} onRangeClick={onAmountRangeClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
