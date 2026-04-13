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

const ACTIVE_COLOR = "#2563EB";
const PRE_START_COLOR = "#F59E0B";
const COMPLETED_COLOR = "#94A3B8";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function StatusDonutChart({ data, selectedStatus, onStatusClick }: StatusDonutChartProps) {
  const [hovSlice, setHovSlice] = useState<string | null>(null);

  const active = data.find((d) => d.status === "ACTIVE")?.count ?? 0;
  const preStart = data.find((d) => d.status === "PRE_START")?.count ?? 0;
  const completed = data.find((d) => d.status === "COMPLETED")?.count ?? 0;
  const donutTotal = active + preStart;

  const cx = 70;
  const cy = 70;
  const r = 55;

  // Build donut slices (진행중 + 착공전 only)
  const slices = [
    { key: "ACTIVE", count: active, color: ACTIVE_COLOR },
    { key: "PRE_START", count: preStart, color: PRE_START_COLOR },
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
  const showCompleted = completed > 0;

  if (!showDonut && !showCompleted) return <div style={{ width: 140, height: 140 }} />;

  return (
    <div className="p-2">
      <div className="relative flex items-center gap-3">
        {/* 준공 — 원형 그래프 좌측 하단 */}
        {showCompleted && (() => {
          const isSelected = selectedStatus === "COMPLETED";
          const isDimmed = selectedStatus != null && !isSelected;
          return (
            <div
              className="absolute cursor-pointer transition-all duration-200"
              style={{ left: -4, bottom: 0, opacity: isDimmed ? 0.35 : 1 }}
              onClick={() => onStatusClick?.(isSelected ? null : "COMPLETED")}
            >
              <div
                className="rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  width: 36, height: 36,
                  backgroundColor: isSelected ? "white" : COMPLETED_COLOR,
                  border: isSelected ? `3px solid ${COMPLETED_COLOR}` : undefined,
                  boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${COMPLETED_COLOR}` : undefined,
                }}
              >
                <span className="font-bold text-[12px]" style={{ color: isSelected ? COMPLETED_COLOR : "white" }}>{completed}</span>
              </div>
            </div>
          );
        })()}

        {/* 도넛 — 진행중 + 착공전 */}
        {showDonut ? (
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
                    d={d} fill={s.color} stroke="#EEF2F7"
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
                  <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill="white" className="pointer-events-none">
                    {s.count}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div style={{ width: 140, height: 140 }} />
        )}
      </div>
    </div>
  );
}
