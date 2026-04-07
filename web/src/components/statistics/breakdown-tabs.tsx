"use client";

import type { RingEntry } from "./chart-types";
import { RadialRingChart } from "./radial-ring-chart";
import { KoreaMapChart } from "./korea-map-chart";

/* ── Types ──────────────────────────────────────────────── */

interface BreakdownTabsProps {
  by_corporation: { corporation: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_division_detail: { division: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_region_group: { region_group: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  by_status: { status: string; count: number; total_contract: number; total_headcount: number }[];
  by_amount_range: { label: string; count: number; total_contract: number; total_headcount: number }[];
  by_region: { region: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
}

/* ── Constants ──────────────────────────────────────────── */

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "진행중",
  PRE_START: "착공전",
  COMPLETED: "준공",
  SUSPENDED: "중단",
};

const CORP_COLORS: Record<string, string> = {
  "남광토건": "#16A34A",
  "극동건설": "#2563EB",
  "금광기업": "#EA580C",
};

const DIV_COLORS: Record<string, string> = {
  "토목": "#10B981",
  "건축": "#3B82F6",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#2563EB",
  PRE_START: "#F59E0B",
  COMPLETED: "#16A34A",
  SUSPENDED: "#EF4444",
};

const AMOUNT_COLORS = ["#94A3B8", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];

/* ── Main Component ─────────────────────────────────────── */

export function BreakdownTabs({
  by_corporation,
  by_division_detail,
  by_region_group,
  by_status,
  by_amount_range,
  by_region,
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

  const statusSites: RingEntry[] = by_status.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status, value: d.count, color: STATUS_COLORS[d.status] ?? "#94A3B8",
  }));

  const amountSites: RingEntry[] = by_amount_range.map((d, i) => ({
    name: d.label, value: d.count, color: AMOUNT_COLORS[i % AMOUNT_COLORS.length],
  }));

  return (
    <div className="space-y-4">
      {/* 지역별 지도 */}
      <KoreaMapChart data={by_region} />

      {/* Row 4: 상태별 + 규모별 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RadialRingChart title="상태별 현장 수" entries={statusSites} unit="현장" />
        <RadialRingChart title="규모별 현장 수" entries={amountSites} unit="현장" />
      </div>
    </div>
  );
}
