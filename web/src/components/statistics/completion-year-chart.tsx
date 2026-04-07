"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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
}: {
  label: string;
  data: YearData[];
  color: string;
  maxCount: number;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);

  if (data.length === 0) return null;

  return (
    <div className="flex-1 min-w-0 flex items-center gap-3" onMouseLeave={() => setHovIdx(null)}>
      {/* Title tag - left */}
      <span className="shrink-0 w-[90px] text-center text-[11px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md whitespace-nowrap">
        {label}
      </span>

      {/* Timeline - right */}
      <div className="flex-1 min-w-0">
        {/* Timeline nodes on line */}
        <div className="relative flex items-center">
          {/* Background line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full" style={{ backgroundColor: color, opacity: 0.2 }} />
          <div className="flex flex-1">
        {data.map((d, i) => {
          const isHov = hovIdx === i;
          const r = maxCount > 0 ? 10 + (d.count / maxCount) * 18 : 10;
          return (
            <div
              key={d.year}
              className="flex-1 flex flex-col items-center cursor-pointer"
              onMouseEnter={() => setHovIdx(i)}
            >
              {/* Bubble */}
              <div
                className="rounded-full flex items-center justify-center transition-all duration-200 z-10"
                style={{
                  width: r * 2,
                  height: r * 2,
                  backgroundColor: color,
                  opacity: isHov ? 1 : 0.8,
                  boxShadow: isHov ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                }}
              >
                <span className="text-white font-bold text-[10px]">{d.count}</span>
              </div>
              {/* Year label */}
              <span className={cn(
                "text-[9px] mt-0.5 font-mono",
                isHov ? "font-bold text-foreground" : "text-muted-foreground"
              )}>
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

  if (preStartData.length === 0 && activeData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-2 shadow-sm flex items-center justify-center min-h-[80px]">
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
      <div className="flex flex-col gap-3">
        <Timeline label="착공예정 년도" data={preStartData} color={PRE_COLOR} maxCount={maxCount} />
        <Timeline label="준공예정 년도" data={activeData} color={ACTIVE_COLOR} maxCount={maxCount} />
      </div>
    </div>
  );
}
