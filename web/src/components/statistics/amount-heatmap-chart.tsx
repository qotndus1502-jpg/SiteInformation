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
}

const DIV_CONFIG: Record<string, { color: string; label: string }> = {
  "건축": { color: "#2563EB", label: "건축" },
  "토목": { color: "#94A3B8", label: "토목" },
};

function BarChart({
  title,
  rows,
  labels,
}: {
  title: string;
  rows: DivisionRow[];
  labels: string[];
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  const barData = labels.map((l) => {
    const arch = (rows.find((r) => r.division === "건축")?.[l] as number) ?? 0;
    const civil = (rows.find((r) => r.division === "토목")?.[l] as number) ?? 0;
    return { label: l, arch, civil, total: arch + civil };
  });

  const maxTotal = Math.max(...barData.map((d) => d.total), 1);
  const BAR_HEIGHT = 130;

  return (
    <div className="flex-1 min-w-0" onMouseLeave={() => setHovIdx(null)}>
      <p className="text-xs font-semibold text-muted-foreground mb-3">{title}</p>
      <div className="flex items-end gap-1.5" style={{ height: BAR_HEIGHT }}>
        {barData.map((d, i) => {
          const archH = (d.arch / maxTotal) * BAR_HEIGHT;
          const civilH = (d.civil / maxTotal) * BAR_HEIGHT;
          const isHov = hovIdx === i;
          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center justify-end h-full relative"
              onMouseEnter={() => setHovIdx(i)}
            >
              {/* Total label */}
              <span className="text-[10px] font-bold font-mono text-foreground mb-1">{d.total}</span>

              {/* Stacked bar */}
              <div className={cn(
                "flex flex-col items-center gap-0.5 w-full max-w-[32px] transition-opacity",
                isHov ? "opacity-100" : "opacity-80"
              )}>
                {d.civil > 0 && (
                  <div
                    className="w-full rounded-t-md relative overflow-hidden"
                    style={{ height: Math.max(civilH, 14), backgroundColor: DIV_CONFIG["토목"].color }}
                  >
                    <div className="absolute inset-0" style={{
                      backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.2) 3px, rgba(255,255,255,0.2) 6px)",
                    }} />
                    {civilH > 14 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90">{d.civil}</span>
                    )}
                  </div>
                )}
                {d.arch > 0 && (
                  <div
                    className="w-full rounded-b-md relative"
                    style={{ height: Math.max(archH, 14), backgroundColor: DIV_CONFIG["건축"].color }}
                  >
                    {archH > 14 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90">{d.arch}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Hover tooltip */}
              {isHov && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-foreground/90 text-background rounded-md px-2 py-1 text-[8px] whitespace-nowrap z-10 pointer-events-none">
                  건축 {d.arch} · 토목 {d.civil}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {barData.map((d) => (
          <div key={d.label} className="flex-1 text-center">
            <span className="text-[8px] text-muted-foreground leading-tight">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AmountHeatmapChart({ data }: AmountHeatmapChartProps) {
  const labels = data.labels ?? [];
  const contractRows = data.by_contract_division ?? [];
  const shareRows = data.by_our_share_division ?? [];

  if (labels.length === 0 || (contractRows.length === 0 && shareRows.length === 0)) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-center min-h-[180px]">
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative">
      {/* Legend - right top */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-0">
        {["건축", "토목"].map((d) => (
          <div key={d} className="flex items-center gap-1 px-2 py-1">
            <span className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: DIV_CONFIG[d]?.color,
                backgroundImage: d === "토목"
                  ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.25) 2px, rgba(255,255,255,0.25) 4px)"
                  : undefined,
              }} />
            <span className="text-[10px] text-muted-foreground">{DIV_CONFIG[d]?.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <BarChart title="총공사비" rows={contractRows} labels={labels} />
        <div className="w-px bg-border shrink-0" />
        <BarChart title="자사도급액" rows={shareRows} labels={labels} />
      </div>
    </div>
  );
}
