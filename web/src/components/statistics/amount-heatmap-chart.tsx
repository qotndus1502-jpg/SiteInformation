"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { charts } from "@/lib/chart-colors";

interface DivisionRow {
  division: string;
  [label: string]: string | number;
}

interface AmountHeatmapData {
  by_contract: any[];
  by_our_share: any[];
  by_contract_division: DivisionRow[];
  by_our_share_division: DivisionRow[];
  labels: string[];
}

interface AmountHeatmapChartProps {
  data: AmountHeatmapData;
  series?: "contract" | "share" | "both";
  /** When true, rows are anchored to the right edge (mirrors left-anchored layout) */
  mirror?: boolean;
  /** Cross-filter: currently selected amount range key (e.g. "100-500") */
  selectedRangeKey?: string | null;
  /** Cross-filter: called when user clicks a row. Pass null to clear. */
  onRangeClick?: (rangeKey: string | null) => void;
}

// Map display labels (from backend) to the range keys used in filter.amountRanges
const LABEL_TO_RANGE_KEY: Record<string, string> = {
  "≤ 500억":   "0-500",
  "≤ 1,000억": "500-1000",
  "≤ 2,000억": "1000-2000",
  "≤ 3,000억": "2000-3000",
  "> 3,000억": "3000-",
};

// Backend already sends labels in the desired display form ("≤ 100억", "> 3,000억")
function toHundredBillion(label: string): string {
  return label;
}

interface HeatmapStyle {
  /** Width of the LEFT half (건축). */
  archHalfW: number;
  /** Width of the RIGHT half (토목). */
  civilHalfW: number;
  rowH: number;
  rowGap: number;
  radius: number;
  fontSize: number;
  titleFontSize: number;
  archColor: string;
  civilColor: string;
  labelColW: number;
  labelColBg: string;
}

function HalfBar({
  value,
  maxVal,
  textColor,
  direction,
  isHov,
  s,
}: {
  value: number;
  maxVal: number;
  color: string;
  textColor: string;
  direction: "left" | "right";
  isHov: boolean;
  s: HeatmapStyle;
}) {
  const HALF_W = direction === "left" ? s.archHalfW : s.civilHalfW;
  const w = value > 0 ? Math.max((value / maxVal) * HALF_W, 24) : 0;
  const justify = direction === "left" ? "justify-end" : "justify-start";

  const innerJustify = direction === "left" ? "justify-end" : "justify-start";
  const innerPad: React.CSSProperties =
    direction === "left" ? { paddingRight: 6 } : { paddingLeft: 6 };

  // 기존 건축 blue-600 / 토목 blue-200 팔레트 유지.
  // 건축 (direction=left, 값 끝=왼쪽): 270deg, tint(blue-400)→base(blue-600)
  // 토목 (direction=right, 값 끝=오른쪽): 90deg, tint(blue-100)→base(blue-200)
  const gradient = direction === "left"
    ? "linear-gradient(270deg, #60A5FA 0%, #2563EB 100%)"
    : "linear-gradient(90deg, #DBEAFE 0%, #BFDBFE 100%)";

  return (
    <div className={cn("flex items-center", justify)} style={{ width: HALF_W, height: s.rowH }}>
      {value > 0 && (
        <div
          className={cn("flex items-center", innerJustify)}
          style={{
            width: w,
            height: s.rowH,
            background: gradient,
            borderTopLeftRadius: direction === "left" ? s.radius : 0,
            borderBottomLeftRadius: direction === "left" ? s.radius : 0,
            borderTopRightRadius: direction === "right" ? s.radius : 0,
            borderBottomRightRadius: direction === "right" ? s.radius : 0,
            filter: isHov ? "brightness(1.05)" : "none",
            transition: "width 800ms cubic-bezier(0.2,0.7,0.3,1), filter 150ms ease-out",
            ...innerPad,
          }}
        >
          <span className="font-bold whitespace-nowrap leading-none" style={{ color: textColor, fontSize: s.fontSize, lineHeight: 1 }}>{value}</span>
        </div>
      )}
    </div>
  );
}

export function AmountHeatmapChart({ data, series: which = "both", mirror = false, selectedRangeKey, onRangeClick }: AmountHeatmapChartProps) {
  const labels = data.labels ?? [];
  const contractRows = data.by_contract_division ?? [];
  const shareRows = data.by_our_share_division ?? [];
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  void which;
  const heatStyle: HeatmapStyle = {
    // 건축은 값이 작아 좁게, 토목은 값이 커서 넓게
    archHalfW: 140,
    civilHalfW: 150,
    rowH: 16,
    rowGap: 0,
    radius: 6,
    fontSize: 10,
    titleFontSize: 11,
    archColor: charts.amountHeatmap.arch,
    civilColor: charts.amountHeatmap.civil,
    labelColW: 80,
    labelColBg: "transparent",
  };

  if (labels.length === 0 || (contractRows.length === 0 && shareRows.length === 0)) return <div className="p-2" style={{ minHeight: 140 }} />;

  const allSeries: { title: string; unit: string; rows: DivisionRow[] }[] = [
    { title: "총 공사비 별 현장 수", unit: "개", rows: contractRows },
    { title: "자사 도급액 별 현장 수", unit: "개", rows: shareRows },
  ];
  const series = which === "contract"
    ? [allSeries[0]]
    : which === "share"
      ? [allSeries[1]]
      : allSeries;

  // For each series, compute per-row arch/civil values and a shared max
  // (shared max ensures left/right bars are visually symmetric for equal values)
  const seriesData = series.map((s) => {
    const bars = labels.map((l) => {
      const arch = (s.rows.find((r) => r.division === "건축")?.[l] as number) ?? 0;
      const civil = (s.rows.find((r) => r.division === "토목")?.[l] as number) ?? 0;
      return { arch, civil };
    });
    const sharedMax = Math.max(
      ...bars.map((b) => b.arch),
      ...bars.map((b) => b.civil),
      1
    );
    return { ...s, bars, maxArch: sharedMax, maxCivil: sharedMax };
  });

  return (
    <div className="p-2 relative">
<div className="px-3 pt-0 pb-2 flex flex-col gap-4" onMouseLeave={() => setHovIdx(null)}>
        {seriesData.map((s) => (
          <div key={s.title} className="flex-1 flex flex-col">
            {/* Title centered above the pyramid */}
            <div className="text-center mb-1">
              <span
                className="inline-flex items-center gap-1.5 font-semibold text-slate-900 tracking-tight"
                style={{ fontSize: heatStyle.titleFontSize }}
              >
                <span className="inline-block w-0.5 h-3 rounded-sm bg-primary/80" />
                {s.title}
              </span>
            </div>

            {/* Rows - 건축 left, label center, 토목 right (pyramid layout).
                When mirror=false rows anchor to the left edge, when mirror=true
                rows anchor to the right edge so two charts can butt up against
                each other in the middle. */}
            <div
              className={cn(
                "flex flex-col relative",
                mirror ? "items-end" : "items-start"
              )}
              style={{ gap: heatStyle.rowGap || 4 }}
            >
              {/* Continuous background spanning the full label column, flush with bars. */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  // mirror=false: 라벨 칸은 archHalfW 만큼 우측 (건축 바 다음)
                  // mirror=true:  라벨 칸은 civilHalfW 만큼 좌측 (토목 바 다음, 우측 정렬 기준)
                  ...(mirror
                    ? { right: heatStyle.civilHalfW }
                    : { left: heatStyle.archHalfW }),
                  width: heatStyle.labelColW,
                  backgroundColor: heatStyle.labelColBg,
                }}
              />
              {labels.map((label, i) => {
                const isHov = hovIdx === i;
                const rangeKey = LABEL_TO_RANGE_KEY[label];
                const isSelected = !!rangeKey && selectedRangeKey === rangeKey;
                const isDimmed = selectedRangeKey != null && !isSelected;
                return (
                  <div
                    key={label}
                    className="flex items-center gap-0 relative cursor-pointer transition-opacity"
                    style={{ height: heatStyle.rowH, opacity: isDimmed ? 0.4 : 1 }}
                    onMouseEnter={() => setHovIdx(i)}
                    onClick={() => {
                      if (!rangeKey) return;
                      onRangeClick?.(isSelected ? null : rangeKey);
                    }}
                  >
                    <HalfBar
                      value={s.bars[i].arch}
                      maxVal={s.maxArch}
                      color={heatStyle.archColor}
                      textColor="rgba(255,255,255,0.9)"
                      direction="left"
                      isHov={isHov}
                      s={heatStyle}
                    />
                    <div
                      className="shrink-0 flex items-center justify-center"
                      style={{ width: heatStyle.labelColW, height: heatStyle.rowH }}
                    >
                      <span
                        className="text-[11px] font-medium text-slate-700 whitespace-nowrap tracking-tight"
                        style={{ lineHeight: 1, display: "inline-block" }}
                      >
                        {toHundredBillion(label)}
                      </span>
                    </div>
                    <HalfBar
                      value={s.bars[i].civil}
                      maxVal={s.maxCivil}
                      color={heatStyle.civilColor}
                      textColor={charts.amountHeatmap.onLight}
                      direction="right"
                      isHov={isHov}
                      s={heatStyle}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
