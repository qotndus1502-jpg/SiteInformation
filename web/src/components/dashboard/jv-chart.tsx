"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface JvChartProps {
  jvSummary: string;
  compact?: boolean;
}

// 우리 3사 — 진한 브랜드 컬러
const OUR_COMPANIES: Record<string, string> = {
  "남광토건": "#16A34A",  // Green-600
  "극동건설": "#2563EB",  // Blue-600
  "금광기업": "#EA580C",  // Orange-600
};

// 외부업체 — 연한 뮤트 톤 (디자인시스템 chart 색상 기반)
const EXTERNAL_COLORS = [
  "#94A3B8", // Slate-400
  "#CBD5E1", // Slate-300
  "#A5B4FC", // Indigo-300
  "#D4D4D8", // Zinc-300
  "#BFDBFE", // Blue-200
  "#C4B5FD", // Violet-300
  "#FDE68A", // Amber-200
  "#D1D5DB", // Gray-300
];

function parseJvSummary(summary: string): { name: string; value: number }[] {
  return summary.split(",").map((part) => {
    const trimmed = part.trim();
    const match = trimmed.match(/^(.+?)\s+([\d.]+)%$/);
    if (!match) return null;
    return { name: match[1].trim(), value: parseFloat(match[2]) };
  }).filter(Boolean) as { name: string; value: number }[];
}

function isOurCompany(name: string): boolean {
  return name in OUR_COMPANIES;
}

function getColor(name: string, externalIndex: number): string {
  return OUR_COMPANIES[name] ?? EXTERNAL_COLORS[externalIndex % EXTERNAL_COLORS.length];
}

export function JvChart({ jvSummary, compact }: JvChartProps) {
  const data = parseJvSummary(jvSummary);
  if (data.length === 0) return <p className="text-sm">{jvSummary}</p>;

  // 우리 회사를 맨 앞으로, 외부업체 인덱스 별도 카운트
  const sorted = [...data].sort((a, b) => {
    if (isOurCompany(a.name) && !isOurCompany(b.name)) return -1;
    if (!isOurCompany(a.name) && isOurCompany(b.name)) return 1;
    return b.value - a.value;
  });

  let extIdx = 0;
  const colorMap = new Map<string, string>();
  sorted.forEach((entry) => {
    if (isOurCompany(entry.name)) {
      colorMap.set(entry.name, getColor(entry.name, 0));
    } else {
      colorMap.set(entry.name, getColor(entry.name, extIdx++));
    }
  });

  const chartSize = compact ? 160 : 160;
  const inner = compact ? 45 : 45;
  const outer = compact ? 75 : 75;
  const textSize = compact ? "text-sm" : "text-sm";

  return (
    <div className={compact ? "flex flex-col items-center" : "flex items-center gap-4"}>
      {/* 도넛 차트 */}
      <div className="shrink-0 relative" style={{ width: chartSize, height: chartSize }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              cx="50%"
              cy="50%"
              innerRadius={inner}
              outerRadius={outer}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {sorted.map((entry) => (
                <Cell key={entry.name} fill={colorMap.get(entry.name)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground font-medium pointer-events-none">지분율</span>
      </div>

      {/* 범례 */}
      <div className={compact ? "mt-1.5 space-y-0.5 w-full" : "flex-1 space-y-1"}>
        {sorted.map((entry) => {
          const ours = isOurCompany(entry.name);
          return (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorMap.get(entry.name) }}
              />
              <span className={ours ? `${textSize} font-semibold text-foreground` : `${textSize} text-muted-foreground`}>
                {entry.name}
              </span>
              <span className={ours ? `${textSize} font-mono font-bold ml-auto` : `${textSize} font-mono text-muted-foreground ml-auto`}>
                {entry.value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
