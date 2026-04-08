"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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
}

// Transform labels like "100억 미만" → "<100억", "100~500억" → "100-500억", "2,000억 이상" → "2,000억<"
function toHundredBillion(label: string): string {
  const stripped = label.replace(/억/g, "").replace(/\s/g, "");
  if (stripped.includes("미만")) return `< ${stripped.replace("미만", "")}억`;
  if (stripped.includes("이상")) return `${stripped.replace("이상", "")}억 <`;
  return `${stripped.replace(/~/g, "-")}억`;
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
  color,
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

  // Pin the number to the edge adjacent to the label column so all values
  // line up vertically regardless of bar length.
  const innerJustify = direction === "left" ? "justify-end" : "justify-start";
  const innerPad: React.CSSProperties =
    direction === "left" ? { paddingRight: 6 } : { paddingLeft: 6 };

  return (
    <div className={cn("flex items-center", justify)} style={{ width: HALF_W, height: s.rowH, opacity: isHov ? 1 : 0.8 }}>
      {value > 0 && (
        <div
          className={cn("flex items-center transition-all duration-200", innerJustify)}
          style={{
            width: w,
            height: s.rowH,
            backgroundColor: color,
            borderTopLeftRadius: direction === "left" ? s.radius : 0,
            borderBottomLeftRadius: direction === "left" ? s.radius : 0,
            borderTopRightRadius: direction === "right" ? s.radius : 0,
            borderBottomRightRadius: direction === "right" ? s.radius : 0,
            ...innerPad,
          }}
        >
          <span className="font-bold whitespace-nowrap leading-none" style={{ color: textColor, fontSize: s.fontSize, lineHeight: 1 }}>{value}</span>
        </div>
      )}
    </div>
  );
}

export function AmountHeatmapChart({ data, series: which = "both", mirror = false }: AmountHeatmapChartProps) {
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
    archColor: "#2563EB",
    civilColor: "#BFDBFE",
    labelColW: 80,
    labelColBg: "transparent",
  };

  if (labels.length === 0 || (contractRows.length === 0 && shareRows.length === 0)) return null;

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
                className="inline-block font-bold text-slate-900"
                style={{ fontSize: heatStyle.titleFontSize }}
              >
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
                return (
                  <div
                    key={label}
                    className="flex items-center gap-0 relative"
                    style={{ height: heatStyle.rowH }}
                    onMouseEnter={() => setHovIdx(i)}
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
                        className="text-[10px] font-semibold text-foreground whitespace-nowrap"
                        style={{ lineHeight: 1, display: "inline-block" }}
                      >
                        {toHundredBillion(label)}
                      </span>
                    </div>
                    <HalfBar
                      value={s.bars[i].civil}
                      maxVal={s.maxCivil}
                      color={heatStyle.civilColor}
                      textColor="#1E3A8A"
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
