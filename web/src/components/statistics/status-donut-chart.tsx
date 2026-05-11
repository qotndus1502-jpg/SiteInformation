"use client";

import { memo, useState } from "react";
import { charts } from "@/lib/chart-colors";

interface StatusData {
  status: string;
  count: number;
  total_contract: number;
  total_headcount: number;
}

interface StatusDonutChartProps {
  data: StatusData[];
  selectedStatus?: string | null;
  onStatusClick?: (status: string | null) => void;
}

const ACTIVE_COLOR = charts.statusDonut.active;
const PRE_START_COLOR = charts.statusDonut.preStart;
const COMPLETED_COLOR = charts.statusDonut.completed;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export const StatusDonutChart = memo(function StatusDonutChart({ data, selectedStatus, onStatusClick }: StatusDonutChartProps) {
  const [hovSlice, setHovSlice] = useState<string | null>(null);

  const active = data.find((d) => d.status === "ACTIVE")?.count ?? 0;
  const preStart = data.find((d) => d.status === "PRE_START")?.count ?? 0;
  const completed = data.find((d) => d.status === "COMPLETED")?.count ?? 0;
  const donutTotal = active + preStart + completed;

  const cx = 70;
  const cy = 70;
  const r = 55;
  const innerR = 30;

  const slices = [
    { key: "ACTIVE", count: active, color: ACTIVE_COLOR },
    { key: "PRE_START", count: preStart, color: PRE_START_COLOR },
    { key: "COMPLETED", count: completed, color: COMPLETED_COLOR },
  ].filter((s) => s.count > 0);

  let currentAngle = -90;
  const sliceData = slices.map((s) => {
    const pct = donutTotal > 0 ? s.count / donutTotal : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + pct * 360;
    const midAngle = (startAngle + endAngle) / 2;
    currentAngle = endAngle;
    return { ...s, pct, startAngle, endAngle, midAngle };
  });

  const showDonut = donutTotal > 0;

  if (!showDonut) return <div style={{ width: 140, height: 140 }} />;

  return (
    <div>
      <div className="relative flex items-center gap-3">
        <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-31 h-31 shrink-0" onMouseLeave={() => setHovSlice(null)} style={{ overflow: "visible" }}>
            <defs>
              {sliceData.map((s) => (
                <linearGradient key={s.key} id={`donut-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${s.color} 88%, white)` }} />
                  <stop offset="100%" style={{ stopColor: s.color }} />
                </linearGradient>
              ))}
            </defs>

            {sliceData.map((s) => {
              const isOnly = slices.length === 1;
              const startOuter = polarToCartesian(cx, cy, r, s.startAngle);
              const endOuter = polarToCartesian(cx, cy, r, s.endAngle);
              const startInner = polarToCartesian(cx, cy, innerR, s.endAngle);
              const endInner = polarToCartesian(cx, cy, innerR, s.startAngle);
              const largeArc = s.pct > 0.5 ? 1 : 0;
              const d = isOnly
                ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 1 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 1 ${cx - innerR} ${cy} Z`
                : `M ${startOuter.x} ${startOuter.y} A ${r} ${r} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
              const labelR = (r + innerR) / 2;
              const labelPos = isOnly ? { x: cx, y: cy - labelR } : polarToCartesian(cx, cy, labelR, s.midAngle);
              const isHov = hovSlice === s.key;
              const isSelected = selectedStatus === s.key;
              const isDimmed = selectedStatus != null && !isSelected;
              const labelFill = s.key === "COMPLETED" ? "#334155" : "#FFFFFF";
              return (
                <g key={s.key}>
                  <path
                    d={d} fill={`url(#donut-grad-${s.key})`}
                    stroke="white" strokeWidth={1.5} strokeLinejoin="round"
                    className="transition-[transform,opacity] duration-(--motion) ease-out cursor-pointer"
                    style={{
                      transform: isHov || isSelected ? "scale(1.04)" : "scale(1)",
                      transformOrigin: `${cx}px ${cy}px`,
                      opacity: isDimmed ? 0.4 : (isHov || isSelected ? 1 : 0.92),
                    }}
                    onMouseEnter={() => setHovSlice(s.key)}
                    onClick={(e) => { e.stopPropagation(); onStatusClick?.(isSelected ? null : s.key); }}
                  />
                  <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill={labelFill} className="pointer-events-none">
                    {s.count}
                  </text>
                </g>
              );
            })}

            {/* 중앙 총합 */}
            <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={700} fill="#0F172A" className="pointer-events-none">
              {donutTotal}
            </text>
            <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={500} fill="#64748B" letterSpacing={0.5} className="pointer-events-none">
              TOTAL
            </text>
        </svg>
      </div>
    </div>
  );
});
