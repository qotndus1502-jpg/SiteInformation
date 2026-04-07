"use client";

import type { RingEntry } from "./chart-types";

interface RadialRingChartProps {
  title: string;
  entries: RingEntry[];
  unit: string;
}

export function RadialRingChart({ title, entries, unit }: RadialRingChartProps) {
  const total = entries.reduce((s, e) => s + e.value, 0);

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-center min-h-[220px]">
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  const cx = 110;
  const cy = 110;
  const ringWidth = 16;
  const ringGap = 6;
  const startAngle = -90;
  const maxRings = Math.min(entries.length, 7);
  const maxVal = Math.max(...entries.map((e) => e.value), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col">
      <h4 className="text-sm font-bold text-foreground mb-4">{title}</h4>
      <div className="flex items-center gap-4 flex-1">
        {/* SVG Ring */}
        <div className="shrink-0">
          <svg
            viewBox={`0 0 ${cx * 2} ${cy * 2}`}
            className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px]"
          >
            {entries.slice(0, maxRings).map((entry, i) => {
              const pct = total > 0 ? entry.value / total : 0;
              const r = (cx - 14) - i * (ringWidth + ringGap);
              if (r <= 10) return null;
              const circumference = 2 * Math.PI * r;
              const dashLen = circumference * pct;
              const dashGap = circumference - dashLen;
              return (
                <g key={entry.name}>
                  <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke="currentColor"
                    className="text-border/50"
                    strokeWidth={ringWidth}
                  />
                  <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={entry.color}
                    strokeWidth={ringWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${dashLen} ${dashGap}`}
                    transform={`rotate(${startAngle} ${cx} ${cy})`}
                    className="transition-all duration-700"
                  />
                </g>
              );
            })}
            <text
              x={cx} y={cy - 6}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              className="fill-foreground"
            >
              {total.toLocaleString()}
            </text>
            <text
              x={cx} y={cy + 12}
              textAnchor="middle"
              fontSize={11}
              className="fill-muted-foreground"
            >
              {unit}
            </text>
          </svg>
        </div>

        {/* Bar labels */}
        <div className="flex flex-col gap-2.5 min-w-0 flex-1">
          {entries.slice(0, maxRings).map((entry) => {
            const barPct = total > 0 ? (entry.value / maxVal) * 100 : 0;
            return (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground truncate w-16 shrink-0">{entry.name}</span>
                <div className="flex-1 h-4 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, backgroundColor: entry.color }}
                  />
                </div>
                <span className="font-bold font-mono ml-1 whitespace-nowrap w-14 text-right">
                  {entry.value.toLocaleString()}{unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
