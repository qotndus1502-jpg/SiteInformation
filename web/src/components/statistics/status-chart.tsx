"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface StatusChartProps {
  data: { status: string; count: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "진행중", color: "#2563EB" },
  PRE_START: { label: "착공전", color: "#F59E0B" },
  COMPLETED: { label: "준공", color: "#16A34A" },
  SUSPENDED: { label: "중단", color: "#EF4444" },
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const config = STATUS_CONFIG[entry.payload.status] ?? { label: entry.payload.status, color: "#999" };
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
        <span className="text-muted-foreground">{config.label}:</span>
        <span className="font-mono font-semibold text-foreground">{entry.value}개</span>
      </div>
    </div>
  );
}

export function StatusChart({ data }: StatusChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-foreground mb-4">현장 상태 분포</h3>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="count"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_CONFIG[entry.status]?.color ?? "#999"}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <span className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground">{total}</span>
            <span className="text-xs text-muted-foreground">전체 현장</span>
          </span>
        </div>

        {/* 범례 */}
        <div className="space-y-2.5">
          {data.map((entry) => {
            const config = STATUS_CONFIG[entry.status] ?? { label: entry.status, color: "#999" };
            return (
              <div key={entry.status} className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
                <span className="text-sm text-muted-foreground w-14">{config.label}</span>
                <span className="text-sm font-bold font-mono text-foreground">{entry.count}개</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
