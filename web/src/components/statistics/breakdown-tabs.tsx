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
  amount_heatmap: { by_contract: any[]; by_our_share: any[]; by_contract_division: any[]; by_our_share_division: any[]; labels: string[]; no_contract_count?: number; no_share_count?: number };
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
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] h-full">
        <div className="pr-0">
          <KoreaMapChart data={by_region} onShowDetailMap={onShowDetailMap} selectedRegion={selectedRegion} onRegionClick={onRegionClick} />
        </div>
        <div className="flex flex-col min-h-0 pl-0 gap-3">
          {/* Row 1 — 법인별: 현장수 / 자사도급액 / 인원 (right edge aligned with row 3 below) */}
          <div className="pb-3 flex justify-end">
            <CorpDivisionChart data={corpDivisionData} selectedCorp={selectedCorp} onCorpClick={onCorpClick} />
          </div>

          {/* Row 2 — 상태별: 도넛 + 착공·준공예정 가로 배치 (Row 1 의 CorpDivisionChart 폭에 맞춰 우측 정렬) */}
          <div className="relative pt-3 pb-0 border-t-[1.5px] border-slate-300">
            {/* Legend — top-left of the row (matches Row 3 legend x position) */}
            <div className="absolute top-3 left-5 z-10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#2563EB" }} />
                <span className="text-[11px] text-muted-foreground">진행중</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
                <span className="text-[11px] text-muted-foreground">착공전</span>
              </div>
              {(() => {
                const completedCount = by_status.find((d) => d.status === "COMPLETED")?.count ?? 0;
                return completedCount > 0 ? (
                  <span className="text-[11px] text-muted-foreground">준공 {completedCount}개</span>
                ) : null;
              })()}
            </div>
            <div className="flex justify-end">
              <div style={{ width: 956 }} className="flex items-start">
                {/* 도넛 — 첫 번째 metric 컬럼(법인별 현장 수, x: 68~348) 중앙 */}
                <div style={{ width: 348, paddingLeft: 68 }} className="flex justify-center shrink-0">
                  <StatusDonutChart data={by_status} selectedStatus={selectedStatus} onStatusClick={onStatusClick} />
                </div>
                {/* CompletionYear — 도넛 우측 나머지 영역 */}
                <div className="flex-1 flex items-start">
                  <CompletionYearChart preStartData={completionYears} activeData={activeYears} selectedStartYear={selectedStartYear} selectedEndYear={selectedEndYear} onStartYearClick={onStartYearClick} onEndYearClick={onEndYearClick} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 — 금액별: 자사도급액별(좌, mirror) | 총공사비별(우) — 두 차트가 중앙에서 맞닿도록 */}
          <div className="relative pt-1 border-t-[1.5px] border-slate-300">
            {/* Legend — top-left of the row (matches Row 2 legend x position) */}
            <div className="absolute top-3 left-5 z-10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#2563EB" }} />
                <span className="text-[11px] text-muted-foreground">건축</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#BFDBFE" }} />
                <span className="text-[11px] text-muted-foreground">토목</span>
              </div>
              {((amount_heatmap.no_contract_count ?? 0) > 0 || (amount_heatmap.no_share_count ?? 0) > 0) && (
                <span className="text-[11px] text-muted-foreground">
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
