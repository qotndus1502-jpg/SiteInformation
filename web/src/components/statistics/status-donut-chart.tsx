"use client";

import { useState } from "react";

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

const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "ACTIVE", label: "진행중", color: "#2563EB" },
  { key: "PRE_START", label: "착공전", color: "#F59E0B" },
  { key: "COMPLETED", label: "준공", color: "#94A3B8" },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function StatusDonutChart({ data, selectedStatus, onStatusClick }: StatusDonutChartProps) {
  const [hovSlice, setHovSlice] = useState<string | null>(null);

  const slices = STATUS_CONFIG
    .map((cfg) => ({ ...cfg, count: data.find((d) => d.status === cfg.key)?.count ?? 0 }))
    .filter((s) => s.count > 0);

  const total = slices.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div style={{ width: 140, height: 140 }} />;

  const cx = 70;
  const cy = 70;
  const r = 55;

  // Build angles
  let currentAngle = -90;
  const sliceData = slices.map((s) => {
    const pct = s.count / total;
    const startAngle = currentAngle;
    const endAngle = currentAngle + pct * 360;
    const midAngle = (startAngle + endAngle) / 2;
    currentAngle = endAngle;
    return { ...s, pct, startAngle, endAngle, midAngle };
  });

  return (
    <div className="p-2">
      <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-[140px] h-[140px] shrink-0" onMouseLeave={() => setHovSlice(null)}>
        {sliceData.map((s) => {
          const isOnly = slices.length === 1;
          const start = polarToCartesian(cx, cy, r, s.startAngle);
          const end = polarToCartesian(cx, cy, r, s.endAngle);
          const largeArc = s.pct > 0.5 ? 1 : 0;
          const d = isOnly
            ? `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`
            : `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
          const labelPos = isOnly ? { x: cx, y: cy } : polarToCartesian(cx, cy, r * 0.6, s.midAngle);
          const isHov = hovSlice === s.key;
          const isSelected = selectedStatus === s.key;
          const isDimmed = selectedStatus != null && !isSelected;
          return (
            <g key={s.key}>
              <path
                d={d}
                fill={s.color}
                stroke="#EEF2F7"
                strokeWidth={isSelected ? 6 : 4}
                className="transition-all duration-200 ease-out cursor-pointer"
                style={{
                  transform: isHov || isSelected ? "scale(1.06)" : "scale(1)",
                  transformOrigin: `${cx}px ${cy}px`,
                  opacity: isDimmed ? 0.35 : (isHov || isSelected ? 1 : 0.8),
                }}
                onMouseEnter={() => setHovSlice(s.key)}
                onClick={(e) => { e.stopPropagation(); onStatusClick?.(isSelected ? null : s.key); }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={700}
                fill="white"
                className="pointer-events-none"
              >
                {s.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
