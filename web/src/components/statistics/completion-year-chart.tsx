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
    <div className="flex-1 min-w-0 flex flex-col justify-end" onMouseLeave={() => setHovIdx(null)}>
      {/* Title */}
      <p className="text-[11px] font-bold text-foreground mb-2">{label}</p>

      {/* Progress bar background */}
      <div className="relative h-2 bg-muted/50 rounded-full mb-1">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: "100%", backgroundColor: color, opacity: 0.15 }}
        />
      </div>

      {/* Timeline nodes */}
      <div className="flex">
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
              <div className="relative -mt-4">
                <div
                  className="rounded-full flex items-center justify-center transition-all duration-200"
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
              </div>
              {/* Year label */}
              <span className={cn(
                "text-[10px] mt-1 font-mono",
                isHov ? "font-bold text-foreground" : "text-muted-foreground"
              )}>
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

  if (preStartData.length === 0 && activeData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center justify-center min-h-[80px]">
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="space-y-4">
        <Timeline label="착공예정 년도별" data={preStartData} color={PRE_COLOR} maxCount={maxCount} />
        <Timeline label="준공예정 년도별" data={activeData} color={ACTIVE_COLOR} maxCount={maxCount} />
      </div>
    </div>
  );
}
