"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipCard, type RechartsTooltipProps } from "./_shared/chart-tooltip";

interface RegionData {
  region_group: string;
  count: number;
  total_contract: number;
}

interface RegionChartProps {
  data: RegionData[];
}

const REGION_COLORS = ["#3B82F6", "#06B6D4", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981", "#94A3B8"];

function CustomTooltip({ active, payload }: RechartsTooltipProps<RegionData>) {
  if (!payload?.length) return null;
  const d = payload[0].payload;
  return (
    <ChartTooltipCard active={active} title={d.region_group}>
      <div className="space-y-0.5">
        <p className="text-muted-foreground">현장 <span className="font-mono font-semibold text-foreground">{d.count}개</span></p>
        <p className="text-muted-foreground">도급액 <span className="font-mono font-semibold text-foreground">{d.total_contract.toLocaleString()}억</span></p>
      </div>
    </ChartTooltipCard>
  );
}

export function RegionChart({ data }: RegionChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, d) => s + d.count, 0);

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-base font-bold text-foreground mb-4">지역별 현장 분포</h3>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={sorted}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="count"
                strokeWidth={0}
              >
                {sorted.map((_, i) => (
                  <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <span className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground">{total}</span>
            <span className="text-xs text-muted-foreground">현장</span>
          </span>
        </div>
        <div className="space-y-2 flex-1">
          {sorted.map((d, i) => (
            <div key={d.region_group} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }} />
              <span className="text-sm text-muted-foreground flex-1">{d.region_group}</span>
              <span className="text-sm font-bold font-mono text-foreground">{d.count}개</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
