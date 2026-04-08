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

// "100억 미만" → "1백억 미만", "100~500억" → "1~5백억" etc.
function toHundredBillion(label: string): string {
  const nums = label.match(/[\d,]+/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10) / 100) ?? [];
  if (label.includes("미만")) return `<${nums[0]}백억`;
  if (label.includes("이상")) return `${nums[0]}백억≤`;
  if (nums.length === 2) return `${nums[0]}~${nums[1]}백억`;
  return label;
}

const DIV_CONFIG: Record<string, { color: string; label: string }> = {
  "건축": { color: "#2563EB", label: "건축" },
  "토목": { color: "#BFDBFE", label: "토목" },
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
    <div className="relative flex-1 min-w-0 px-3 pb-0 pt-6 flex flex-col" onMouseLeave={() => setHovIdx(null)}>
      <span className="absolute top-1 left-3 text-[11px] font-semibold text-muted-foreground leading-tight text-center">
        {title.split("\\n").map((line, i) => <span key={i} className="block">{line}</span>)}
      </span>
      <div className="flex items-end justify-center gap-0.5" style={{ height: BAR_HEIGHT }}>
        {barData.map((d, i) => {
          const archH = (d.arch / maxTotal) * BAR_HEIGHT;
          const civilH = (d.civil / maxTotal) * BAR_HEIGHT;
          const isHov = hovIdx === i;
          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center justify-end h-full relative max-w-[80px]"
              onMouseEnter={() => setHovIdx(i)}
            >
              {/* Total label */}
              <span className="text-[13px] font-bold font-mono text-foreground mb-1">{d.total}</span>

              {/* Stacked bar */}
              <div className={cn(
                "flex flex-col items-center w-full max-w-[42px] transition-opacity",
                isHov ? "opacity-100" : "opacity-80"
              )}>
                {d.civil > 0 && (
                  <div
                    className="w-full rounded-t-md relative"
                    style={{ height: Math.max(civilH, 14), backgroundColor: DIV_CONFIG["토목"].color }}
                  >
                    {civilH > 14 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-600">{d.civil}</span>
                    )}
                  </div>
                )}
                {d.arch > 0 && (
                  <div
                    className="w-full rounded-b-md relative"
                    style={{ height: Math.max(archH, 14), backgroundColor: DIV_CONFIG["건축"].color }}
                  >
                    {archH > 14 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/90">{d.arch}</span>
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
      <div className="flex justify-center gap-0.5 mt-1">
        {barData.map((d) => (
          <div key={d.label} className="flex-1 text-center max-w-[80px]">
            <span className="text-[11px] text-foreground font-semibold leading-tight">{toHundredBillion(d.label)}</span>
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

  if (labels.length === 0 || (contractRows.length === 0 && shareRows.length === 0)) return null;

  return (
    <div className="p-2 relative">
      {/* Legend - right top */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-0">
        {["건축", "토목"].map((d) => (
          <div key={d} className="flex items-center gap-1 px-2 py-1">
            <span className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: DIV_CONFIG[d]?.color,
              }} />
            <span className="text-[10px] text-muted-foreground">{DIV_CONFIG[d]?.label}</span>
          </div>
        ))}
      </div>

      <div className="flex">
        <BarChart title="총 공사비 별\n현장 수" rows={contractRows} labels={labels} />
        <BarChart title="자사 도급액 별\n현장 수" rows={shareRows} labels={labels} />
      </div>
    </div>
  );
}
