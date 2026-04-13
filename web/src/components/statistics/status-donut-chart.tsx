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
  /** Cross-filter: currently filtered status (for highlight). */
  selectedStatus?: string | null;
  /** Cross-filter: called when user clicks a slice. Pass null to clear. */
  onStatusClick?: (status: string | null) => void;
}

const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "ACTIVE", label: "진행중", color: "#2563EB" },
  { key: "PRE_START", label: "착공전", color: "#F59E0B" },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function StatusDonutChart({ data, selectedStatus, onStatusClick }: StatusDonutChartProps) {
  const active = data.find((d) => d.status === "ACTIVE")?.count ?? 0;
  const preStart = data.find((d) => d.status === "PRE_START")?.count ?? 0;
  const total = active + preStart;

  if (total === 0) return <div style={{ width: 140, height: 140 }} />;

  const activePct = active / total;

  const cx = 70;
  const cy = 70;
  const r = 55;
  const strokeW = 18;
  const circumference = 2 * Math.PI * r;

  const activeLen = circumference * activePct;
  const preStartLen = circumference - activeLen;

  const activeRotate = -90;
  const preStartRotate = -90 + activePct * 360;

  const [hovSlice, setHovSlice] = useState<string | null>(null);

  return (
    <div className="p-2">
      <div className="flex items-center gap-3">
        <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-[140px] h-[140px] shrink-0" onMouseLeave={() => setHovSlice(null)}>
          {/* Active slice — only when value > 0 */}
          {active > 0 && (() => {
            const startAngle = -90;
            const endAngle = startAngle + activePct * 360;
            const midAngle = (startAngle + endAngle) / 2;
            const labelPos = polarToCartesian(cx, cy, r * 0.6, midAngle);
            const start = polarToCartesian(cx, cy, r, startAngle);
            const end = polarToCartesian(cx, cy, r, endAngle);
            const largeArc = activePct > 0.5 ? 1 : 0;
            // When active is the only slice (preStart=0), draw a full circle instead of a wedge
            const d = preStart === 0
              ? `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`
              : `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
            const textPos = preStart === 0 ? { x: cx, y: cy } : labelPos;
            const isHov = hovSlice === "ACTIVE";
            const isSelected = selectedStatus === "ACTIVE";
            const isDimmed = selectedStatus != null && !isSelected;
            return (<>
              <path d={d} fill={STATUS_CONFIG[0].color} stroke="#EEF2F7" strokeWidth={isSelected ? 6 : 4} className="transition-all duration-200 ease-out cursor-pointer" style={{ transform: isHov || isSelected ? `scale(1.06)` : "scale(1)", transformOrigin: `${cx}px ${cy}px`, opacity: isDimmed ? 0.35 : (isHov || isSelected ? 1 : 0.8) }} onMouseEnter={() => setHovSlice("ACTIVE")} onClick={(e) => { e.stopPropagation(); onStatusClick?.(isSelected ? null : "ACTIVE"); }} />
              <text x={textPos.x} y={textPos.y} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill="white" className="pointer-events-none">{active}</text>
            </>);
          })()}
          {/* PreStart slice — only when value > 0 */}
          {preStart > 0 && (() => {
            const startAngle = -90 + activePct * 360;
            const endAngle = 270;
            const midAngle = (startAngle + endAngle) / 2;
            const labelPos = polarToCartesian(cx, cy, r * 0.6, midAngle);
            const start = polarToCartesian(cx, cy, r, startAngle);
            const end = polarToCartesian(cx, cy, r, endAngle);
            const largeArc = (1 - activePct) > 0.5 ? 1 : 0;
            // When preStart is the only slice (active=0), draw a full circle instead of a wedge
            const d = active === 0
              ? `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`
              : `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
            const textPos = active === 0 ? { x: cx, y: cy } : labelPos;
            const isHov = hovSlice === "PRE_START";
            const isSelected = selectedStatus === "PRE_START";
            const isDimmed = selectedStatus != null && !isSelected;
            return (<>
              <path d={d} fill={STATUS_CONFIG[1].color} stroke="#EEF2F7" strokeWidth={isSelected ? 6 : 4} className="transition-all duration-200 ease-out cursor-pointer" style={{ transform: isHov || isSelected ? `scale(1.06)` : "scale(1)", transformOrigin: `${cx}px ${cy}px`, opacity: isDimmed ? 0.35 : (isHov || isSelected ? 1 : 0.8) }} onMouseEnter={() => setHovSlice("PRE_START")} onClick={(e) => { e.stopPropagation(); onStatusClick?.(isSelected ? null : "PRE_START"); }} />
              <text x={textPos.x} y={textPos.y} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill="white">{preStart}</text>
            </>);
          })()}
        </svg>
      </div>
    </div>
  );
}
