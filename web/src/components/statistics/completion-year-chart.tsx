"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { charts } from "@/lib/chart-colors";

interface YearData {
  year: string;
  count: number;
}

interface CompletionYearChartProps {
  preStartData: YearData[];
  activeData: YearData[];
  selectedStartYear?: string | null;
  selectedEndYear?: string | null;
  onStartYearClick?: (year: string | null) => void;
  onEndYearClick?: (year: string | null) => void;
}

const PRE_COLOR = charts.completionYear.preStart;
const ACTIVE_COLOR = charts.completionYear.active;

function HorizontalTimeline({
  label,
  data,
  color,
  maxCount,
  maxSlots,
  selectedYear,
  onYearClick,
}: {
  label: string;
  data: YearData[];
  color: string;
  maxCount: number;
  maxSlots: number;
  selectedYear?: string | null;
  onYearClick?: (year: string | null) => void;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  if (data.length === 0) return <div style={{ minHeight: 40 }} />;

  const SLOT_W = 60;
  const LABEL_W = 64;
  const TOTAL_H = 50;
  const BUBBLE_CY = 16; // bubble vertical center
  const YEAR_Y = 36;    // year text top position (below bubble)
  // Use maxSlots for container width so every timeline has the same width
  // → right-aligned containers share the same left edge → titles line up.
  const totalW = LABEL_W + maxSlots * SLOT_W;
  // Bubbles are placed flush to the RIGHT edge so the latest year is always rightmost.
  const dataRightEdge = totalW; // right edge in local coords
  const firstBubbleCx = dataRightEdge - SLOT_W / 2 - (data.length - 1) * SLOT_W;

  return (
    <div className="flex items-center" onMouseLeave={() => setHovIdx(null)}>
      <div className="relative" style={{ width: totalW, height: TOTAL_H }}>
        {/* Title — at the left edge of the container (fixed absolute position across timelines) */}
        <span
          className="absolute inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-900 tracking-tight whitespace-nowrap"
          style={{ left: 0, top: BUBBLE_CY, transform: "translate(-28px, -50%)" }}
        >
          <span className="inline-block w-0.5 h-3 rounded-sm" style={{ background: color, opacity: 0.85 }} />
          {label}
        </span>

        {/* Background horizontal line — gradient fade at both ends */}
        <div
          className="absolute h-px"
          style={{
            left: firstBubbleCx,
            width: (data.length - 1) * SLOT_W,
            top: BUBBLE_CY,
            transform: "translateY(-0.5px)",
            background: `linear-gradient(90deg, transparent 0%, color-mix(in srgb, ${color} 45%, transparent) 15%, color-mix(in srgb, ${color} 45%, transparent) 85%, transparent 100%)`,
          }}
        />

        {/* Nodes — bubble at slot center, year label below */}
        {data.map((d, i) => {
          const isHov = hovIdx === i;
          const r = maxCount > 0 ? 10 + (d.count / maxCount) * 8 : 10;
          const cx = firstBubbleCx + i * SLOT_W;
          const isSelected = selectedYear === d.year;
          const isDimmed = selectedYear != null && !isSelected;
          return (
            <div key={d.year} onMouseEnter={() => setHovIdx(i)}>
              {/* Bubble — center pinned to (cx, BUBBLE_CY) */}
              <div
                className="absolute rounded-full flex items-center justify-center transition-all duration-300 z-10 cursor-pointer"
                onClick={() => onYearClick?.(isSelected ? null : d.year)}
                style={{
                  left: cx,
                  top: BUBBLE_CY,
                  transform: "translate(-50%, -50%)",
                  width: r * 2,
                  height: r * 2,
                  background: isSelected
                    ? "white"
                    : `linear-gradient(180deg, color-mix(in srgb, ${color} 90%, white) 0%, ${color} 100%)`,
                  border: isSelected ? `3px solid ${color}` : undefined,
                  opacity: isDimmed ? 0.35 : isHov ? 1 : 0.9,
                  boxShadow: isHov && !isSelected
                    ? `0 0 0 2px white, 0 0 0 4px ${color}`
                    : isSelected
                      ? undefined
                      : `0 1px 3px -1px color-mix(in srgb, ${color} 60%, transparent)`,
                }}
              >
                <span className="font-semibold text-[11px]" style={{ color: isSelected ? color : "white" }}>{d.count}</span>
              </div>
              {/* Year label — below bubble, horizontally centered on cx */}
              <span
                className={cn(
                  "absolute text-[11px] font-medium whitespace-nowrap tracking-tight transition-colors duration-(--motion)",
                  isSelected ? "text-slate-900" : "text-slate-600",
                )}
                style={{
                  left: cx,
                  top: YEAR_Y,
                  transform: "translateX(-50%)",
                  lineHeight: 1,
                }}
              >
                {d.year}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const CompletionYearChart = memo(function CompletionYearChart({ preStartData, activeData, selectedStartYear, selectedEndYear, onStartYearClick, onEndYearClick }: CompletionYearChartProps) {
  const allCounts = [...preStartData.map((d) => d.count), ...activeData.map((d) => d.count)];
  const maxCount = Math.max(...allCounts, 1);
  const maxSlots = Math.max(preStartData.length, activeData.length, 1);

  if (preStartData.length === 0 && activeData.length === 0) {
    return <div className="px-2 py-0" style={{ minHeight: 60 }} />;
  }

  return (
    <div className="px-2 py-0">
      <div className="flex flex-col items-end gap-0">
        <HorizontalTimeline label={"착공예정 현장"} data={preStartData} color={PRE_COLOR} maxCount={maxCount} maxSlots={maxSlots} selectedYear={selectedStartYear} onYearClick={onStartYearClick} />
        <HorizontalTimeline label={"준공예정 현장"} data={activeData} color={ACTIVE_COLOR} maxCount={maxCount} maxSlots={maxSlots} selectedYear={selectedEndYear} onYearClick={onEndYearClick} />
      </div>
    </div>
  );
});
