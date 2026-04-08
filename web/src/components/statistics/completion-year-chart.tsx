"use client";

import { useState } from "react";

interface YearData {
  year: string;
  count: number;
}

interface CompletionYearChartProps {
  preStartData: YearData[];
  activeData: YearData[];
}

const PRE_COLOR = "#F59E0B";
const ACTIVE_COLOR = "#2563EB";

function HorizontalTimeline({
  label,
  data,
  color,
  maxCount,
  maxSlots,
}: {
  label: string;
  data: YearData[];
  color: string;
  maxCount: number;
  maxSlots: number;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const SLOT_W = 60;
  const LABEL_W = 64;
  const TOTAL_H = 80;
  const BUBBLE_CY = 32; // bubble vertical center
  const YEAR_Y = 64;    // year text top position (below bubble)
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
          className="absolute inline-block text-[11px] font-bold text-slate-900 whitespace-nowrap"
          style={{ left: 0, top: BUBBLE_CY, transform: "translateY(-50%)" }}
        >
          {label}
        </span>

        {/* Background horizontal line — spans bubble range (right-aligned) */}
        <div
          className="absolute h-[2px] rounded-full"
          style={{
            left: firstBubbleCx,
            width: (data.length - 1) * SLOT_W,
            top: BUBBLE_CY,
            transform: "translateY(-1px)",
            backgroundColor: color,
            opacity: 0.25,
          }}
        />

        {/* Nodes — bubble at slot center, year label below */}
        {data.map((d, i) => {
          const isHov = hovIdx === i;
          const r = maxCount > 0 ? 10 + (d.count / maxCount) * 14 : 10;
          const cx = firstBubbleCx + i * SLOT_W;
          return (
            <div key={d.year} onMouseEnter={() => setHovIdx(i)}>
              {/* Bubble — center pinned to (cx, BUBBLE_CY) */}
              <div
                className="absolute rounded-full flex items-center justify-center transition-all duration-200 z-10 cursor-pointer"
                style={{
                  left: cx,
                  top: BUBBLE_CY,
                  transform: "translate(-50%, -50%)",
                  width: r * 2,
                  height: r * 2,
                  backgroundColor: color,
                  opacity: isHov ? 1 : 0.85,
                  boxShadow: isHov ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                }}
              >
                <span className="text-white font-bold text-[9px]">{d.count}</span>
              </div>
              {/* Year label — below bubble, horizontally centered on cx */}
              <span
                className="absolute text-[11px] font-semibold text-foreground whitespace-nowrap"
                style={{
                  left: cx,
                  top: YEAR_Y,
                  transform: "translateX(-50%)",
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

export function CompletionYearChart({ preStartData, activeData }: CompletionYearChartProps) {
  const allCounts = [...preStartData.map((d) => d.count), ...activeData.map((d) => d.count)];
  const maxCount = Math.max(...allCounts, 1);
  const maxSlots = Math.max(preStartData.length, activeData.length, 1);

  if (preStartData.length === 0 && activeData.length === 0) {
    return null;
  }

  return (
    <div className="px-2 pt-0 pb-2 -mt-3">
      <div className="flex flex-col items-end gap-0">
        <HorizontalTimeline label={"착공예정 현장"} data={preStartData} color={PRE_COLOR} maxCount={maxCount} maxSlots={maxSlots} />
        <HorizontalTimeline label={"준공예정 현장"} data={activeData} color={ACTIVE_COLOR} maxCount={maxCount} maxSlots={maxSlots} />
      </div>
    </div>
  );
}
