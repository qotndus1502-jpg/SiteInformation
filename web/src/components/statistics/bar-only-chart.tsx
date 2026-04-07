"use client";

import type { RingEntry } from "./chart-types";

interface BarOnlyChartProps {
  title: string;
  entries: RingEntry[];
  unit: string;
}

export function BarOnlyChart({ title, entries, unit }: BarOnlyChartProps) {
  const total = entries.reduce((s, e) => s + e.value, 0);
  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-center min-h-[220px]">
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    );
  }
  const maxVal = Math.max(...entries.map((e) => e.value), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col">
      <h4 className="text-sm font-bold text-foreground mb-4">{title}</h4>

      {/* Vertical bars */}
      <div className="flex items-end justify-center gap-6 flex-1 min-h-[160px]">
        {entries.map((entry) => {
          const barPct = (entry.value / maxVal) * 100;
          return (
            <div key={entry.name} className="flex flex-col items-center gap-2">
              {/* Value label */}
              <span className="text-xs font-bold font-mono text-foreground">
                {entry.value.toLocaleString()}
              </span>
              {/* Bar */}
              <div className="w-12 h-[120px] bg-muted/40 rounded-t-lg overflow-hidden flex items-end">
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${barPct}%`,
                    backgroundColor: entry.color,
                  }}
                />
              </div>
              {/* Label */}
              <span className="text-xs text-muted-foreground font-medium">{entry.name}</span>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground text-right mt-3 pt-3 border-t border-border">
        합계 <span className="font-bold font-mono text-foreground">{total.toLocaleString()}{unit}</span>
      </div>
    </div>
  );
}
