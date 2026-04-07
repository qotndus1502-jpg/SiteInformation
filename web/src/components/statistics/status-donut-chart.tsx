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

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const active = data.find((d) => d.status === "ACTIVE")?.count ?? 0;
  const preStart = data.find((d) => d.status === "PRE_START")?.count ?? 0;
  const total = active + preStart;

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-center min-h-[140px]">
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

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
    <div className="bg-card border border-border rounded-xl p-2 shadow-sm">
      {/* Donut */}
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-[100px] h-[100px]">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" className="text-border/30" strokeWidth={strokeW} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={STATUS_CONFIG[0].color} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={`${activeLen} ${circumference - activeLen}`} transform={`rotate(${activeRotate} ${cx} ${cy})`} className="transition-all duration-700" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={STATUS_CONFIG[1].color} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={`${preStartLen} ${circumference - preStartLen}`} transform={`rotate(${preStartRotate} ${cx} ${cy})`} className="transition-all duration-700" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} className="fill-foreground">{total}</text>
        </svg>
      </div>

      {/* Legend below */}
      <div className="flex flex-col items-center gap-0.5 mt-6">
        {STATUS_CONFIG.map((cfg) => {
          const count = cfg.key === "ACTIVE" ? active : preStart;
          return (
            <div key={cfg.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
              <span className="text-[11px] font-bold font-mono text-foreground">{count}개</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
