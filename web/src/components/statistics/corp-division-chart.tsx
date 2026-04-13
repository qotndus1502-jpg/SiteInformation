"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CorpDivisionData {
  corporation: string;
  division: string;
  count: number;
  total_contract: number;
  total_headcount: number;
}

interface CorpDivisionChartProps {
  data: CorpDivisionData[];
  /** Cross-filter: currently filtered corporation (for highlight). */
  selectedCorp?: string | null;
  /** Cross-filter: called when user clicks a corp row. Pass null to clear. */
  onCorpClick?: (corp: string | null) => void;
}

const CORP_ORDER = ["남광토건", "극동건설", "금광기업"];

const DEFAULT_DIV_COLORS: Record<string, string> = {
  "건축": "#2563EB",
  "토목": "#BFDBFE",
};

const divisions = ["건축", "토목"];

type Metric = "count" | "total_contract" | "total_headcount";

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "count", label: "현장 수", unit: "개" },
  { key: "total_contract", label: "자사도급액", unit: "억" },
  { key: "total_headcount", label: "인원", unit: "명" },
];

function fmtVal(v: number, metric: Metric): string {
  if (metric === "total_contract") return `${Math.round(v).toLocaleString()}`;
  return `${v.toLocaleString()}`;
}

/* ── Single bar cell (건축+토목 stacked horizontally) ── */

interface BarCellStyle {
  barAreaW: number;
  rowH: number;
  radius: number;
  fontSize: number;
  archColor: string;
  civilColor: string;
}

function BarCell({
  archVal,
  civilVal,
  maxArch,
  maxCivil,
  metric,
  isHov,
  s,
}: {
  archVal: number;
  civilVal: number;
  maxArch: number;
  maxCivil: number;
  metric: Metric;
  isHov: boolean;
  s: BarCellStyle;
}) {
  // Distribute the cell width between 건축 / 토목 in proportion to their max
  // values, while keeping a *single* px-per-unit so the two bars remain
  // directly comparable. The total cell width is unchanged — only the
  // internal split point shifts.
  //
  // 자사도급액은 범위가 넓어 sqrt 스케일, 현장 수/인원은 linear 스케일
  const useSqrt = metric === "total_contract";
  const scale = (v: number) => useSqrt ? Math.sqrt(v) : v;
  const scaledMaxArch = scale(maxArch) || 1;
  const scaledMaxCivil = scale(maxCivil) || 1;
  const totalScaledMax = scaledMaxArch + scaledMaxCivil || 1;
  const pxPerUnit = s.barAreaW / totalScaledMax;
  const archHalfW = scaledMaxArch * pxPerUnit;
  const civilHalfW = scaledMaxCivil * pxPerUnit;
  const archW = archVal > 0 ? Math.max(scale(archVal) * pxPerUnit, 36) : 0;
  const civilW = civilVal > 0 ? Math.max(scale(civilVal) * pxPerUnit, 36) : 0;

  return (
    <div className="flex items-center justify-center" style={{ opacity: isHov ? 1 : 0.8, height: s.rowH }}>
      {/* Left half - 건축 */}
      <div className="flex justify-end transition-[width] duration-200 ease-out" style={{ width: archHalfW }}>
        {archVal > 0 && (
          <div
            className="flex items-center justify-center transition-all duration-200 ease-out"
            style={{
              width: archW,
              height: s.rowH,
              backgroundColor: s.archColor,
              borderTopLeftRadius: s.radius,
              borderBottomLeftRadius: s.radius,
            }}
          >
            <span className="font-bold text-white/90 whitespace-nowrap" style={{ fontSize: s.fontSize }}>
              {fmtVal(archVal, metric)}
            </span>
          </div>
        )}
      </div>
      {/* Right half - 토목 */}
      <div className="flex justify-start transition-[width] duration-200 ease-out" style={{ width: civilHalfW }}>
        {civilVal > 0 && (
          <div
            className="flex items-center justify-center transition-all duration-200 ease-out"
            style={{
              width: civilW,
              height: s.rowH,
              backgroundColor: s.civilColor,
              borderTopRightRadius: s.radius,
              borderBottomRightRadius: s.radius,
            }}
          >
            <span className="font-bold whitespace-nowrap" style={{ color: "#1E3A8A", fontSize: s.fontSize }}>
              {fmtVal(civilVal, metric)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────── */

export function CorpDivisionChart({ data, selectedCorp, onCorpClick }: CorpDivisionChartProps) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  const cellStyle: BarCellStyle = {
    barAreaW: 250,
    rowH: 22,
    radius: 6,
    fontSize: 11,
    archColor: DEFAULT_DIV_COLORS["건축"],
    civilColor: DEFAULT_DIV_COLORS["토목"],
  };
  const titleFontSize = 11;
  const rowGap = 10;

  function buildGrouped(metric: Metric) {
    const grouped: Record<string, Record<string, number>> = {};
    for (const d of data) {
      if (!grouped[d.corporation]) grouped[d.corporation] = {};
      grouped[d.corporation][d.division] = d[metric];
    }
    return grouped;
  }

  const groupedCount = buildGrouped("count");
  // Always render the 3 group corps so the chart height stays constant even
  // when filters reduce the dataset to a subset (e.g. clicking 극동건설 only).
  // Empty rows render zero-width bars in their slot.
  const otherCorps = Object.keys(groupedCount).filter((c) => !CORP_ORDER.includes(c));
  const corps = [...CORP_ORDER, ...otherCorps];

  // Build data for each metric and yMax (per-division max for diverging bars)
  const metricData = METRICS.map((m) => {
    const grouped = buildGrouped(m.key);
    const archVals = corps.map((c) => grouped[c]?.["건축"] ?? 0);
    const civilVals = corps.map((c) => grouped[c]?.["토목"] ?? 0);
    const maxArch = Math.max(...archVals, 1);
    const maxCivil = Math.max(...civilVals, 1);
    return { ...m, grouped, yMax: Math.max(maxArch, maxCivil), maxArch, maxCivil };
  });

  const cellWidth = cellStyle.barAreaW + 30;

  return (
    <div className="px-3 pt-0 pb-2 inline-flex flex-col relative" onMouseLeave={() => setHovIdx(null)}>
      {/* Header row: empty corp column + metric labels */}
      <div className="flex items-center gap-0 mb-1 mt-0">
        <div className="w-14 shrink-0" />
        {metricData.map((m, mi) => {
          const extraW = m.key === "total_contract" ? 20 : 0;
          return (
            <div key={m.key} className={cn("shrink-0 text-center", mi < metricData.length - 1 && "mr-2")} style={{ width: cellWidth + extraW }}>
              <span className="inline-block font-bold text-slate-900" style={{ fontSize: titleFontSize }}>
                {`법인별 ${m.label}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Corp rows */}
      <div className="flex flex-col" style={{ gap: rowGap }}>
        {corps.map((corp, i) => {
          const isHov = hovIdx === i;
          const isSelected = selectedCorp === corp;
          const isDimmed = selectedCorp != null && !isSelected;
          return (
            <div
              key={corp}
              className="flex items-center gap-0 cursor-pointer transition-opacity"
              style={{ opacity: isDimmed ? 0.4 : 1 }}
              onMouseEnter={() => setHovIdx(i)}
              onClick={() => onCorpClick?.(isSelected ? null : corp)}
            >
              {/* Corp name */}
              <span
                className={cn("font-semibold w-14 shrink-0", isSelected ? "text-primary" : "text-foreground")}
                style={{ fontSize: cellStyle.fontSize }}
              >{corp}</span>

              {/* 3 metric cells */}
              {metricData.map((m, mi) => {
                const extraW = m.key === "total_contract" ? 20 : 0;
                return (
                  <div key={m.key} className={cn("shrink-0", mi < metricData.length - 1 && "mr-2")} style={{ width: cellWidth + extraW }}>
                    <BarCell
                      archVal={m.grouped[corp]?.["건축"] ?? 0}
                      civilVal={m.grouped[corp]?.["토목"] ?? 0}
                      maxArch={m.maxArch}
                      maxCivil={m.maxCivil}
                      metric={m.key}
                      isHov={isHov}
                      s={cellStyle}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
