"use client";

interface StatusData {
  status: string;
  count: number;
  total_contract: number;
  total_headcount: number;
}

interface StatusDonutChartProps {
  data: StatusData[];
}

const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "ACTIVE", label: "진행중", color: "#2563EB" },
  { key: "PRE_START", label: "착공전", color: "#F59E0B" },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const active = data.find((d) => d.status === "ACTIVE")?.count ?? 0;
  const preStart = data.find((d) => d.status === "PRE_START")?.count ?? 0;
  const total = active + preStart;

  if (total === 0) return null;

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

  return (
    <div className="p-2">
      <div className="flex items-start gap-3 ml-[50px]">
        <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-[140px] h-[140px] shrink-0">
          {/* Active slice */}
          {(() => {
            const startAngle = -90;
            const endAngle = startAngle + activePct * 360;
            const midAngle = (startAngle + endAngle) / 2;
            const labelPos = polarToCartesian(cx, cy, r * 0.6, midAngle);
            const start = polarToCartesian(cx, cy, r, startAngle);
            const end = polarToCartesian(cx, cy, r, endAngle);
            const largeArc = activePct > 0.5 ? 1 : 0;
            const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
            return (<>
              <path d={d} fill={STATUS_CONFIG[0].color} stroke="#F8FAFC" strokeWidth={4} className="transition-all duration-700" />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill="white">{active}</text>
            </>);
          })()}
          {/* PreStart slice */}
          {(() => {
            const startAngle = -90 + activePct * 360;
            const endAngle = 270;
            const midAngle = (startAngle + endAngle) / 2;
            const labelPos = polarToCartesian(cx, cy, r * 0.6, midAngle);
            const start = polarToCartesian(cx, cy, r, startAngle);
            const end = polarToCartesian(cx, cy, r, endAngle);
            const largeArc = (1 - activePct) > 0.5 ? 1 : 0;
            const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
            return (<>
              <path d={d} fill={STATUS_CONFIG[1].color} stroke="#F8FAFC" strokeWidth={4} className="transition-all duration-700" />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill="white">{preStart}</text>
            </>);
          })()}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-1 shrink-0 whitespace-nowrap">
          {STATUS_CONFIG.map((cfg) => {
            const count = data.find((d) => d.status === cfg.key)?.count ?? 0;
            return (
              <div key={cfg.key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
