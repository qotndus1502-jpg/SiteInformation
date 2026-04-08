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

function Timeline({
  label,
  data,
  color,
  maxCount,
  totalSlots,
}: {
  label: string;
  data: YearData[];
  color: string;
  maxCount: number;
  totalSlots: number;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  return (
    <div className="flex-1 min-w-0 flex items-center justify-end gap-1" onMouseLeave={() => setHovIdx(null)}>
      {/* Title tag */}
      <span className="shrink-0 text-center text-[11px] font-semibold text-muted-foreground whitespace-pre-line leading-tight">
        {label}
      </span>

      {/* Timeline */}
      <div className="shrink-0" style={{ width: totalSlots * 70 }}>
        <div className="relative" style={{ height: 60 }}>
          {/* Background line */}
          <div className="absolute right-[35px] top-[22px] h-[2px] rounded-full" style={{ width: (totalSlots - 1) * 70, backgroundColor: color, opacity: 0.2 }} />
          {/* Nodes */}
          <div className="flex h-full justify-end gap-0">
            {data.map((d, i) => {
              const isHov = hovIdx === i;
              const r = maxCount > 0 ? 10 + (d.count / maxCount) * 18 : 10;
              return (
                <div
                  key={d.year}
                  className="w-[70px] flex flex-col items-center cursor-pointer"
                  onMouseEnter={() => setHovIdx(i)}
                >
                  <div
                    className="rounded-full flex items-center justify-center transition-all duration-200 z-10"
                    style={{
                      width: r * 2,
                      height: r * 2,
                      marginTop: 22 - r,
                      backgroundColor: color,
                      opacity: isHov ? 1 : 0.8,
                      boxShadow: isHov ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                    }}
                  >
                    <span className="text-white font-bold text-[9px]">{d.count}</span>
                  </div>
                  <span className="text-[11px] mt-0.5 font-semibold text-foreground">
                    {d.year}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompletionYearChart({ preStartData, activeData }: CompletionYearChartProps) {
  const allCounts = [...preStartData.map((d) => d.count), ...activeData.map((d) => d.count)];
  const maxCount = Math.max(...allCounts, 1);
  const maxSlots = Math.max(preStartData.length, activeData.length);

  if (preStartData.length === 0 && activeData.length === 0) {
    return null;
  }

  return (
    <div className="pl-0 pr-3 py-3">
      <div className="flex flex-col gap-3">
        <Timeline label={"착공예정\n현장"} data={preStartData} color={PRE_COLOR} maxCount={maxCount} totalSlots={maxSlots} />
        <Timeline label={"준공예정\n현장"} data={activeData} color={ACTIVE_COLOR} maxCount={maxCount} totalSlots={maxSlots} />
      </div>
    </div>
  );
}
