"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ProgressDistData {
  label: string;
  count: number;
}

interface ProgressDistributionChartProps {
  data: ProgressDistData[];
}

const BAR_COLORS = ["#EF4444", "#F59E0B", "#3B82F6", "#06B6D4", "#16A34A"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">현장 수: <span className="font-mono font-semibold text-foreground">{payload[0].value}개</span></p>
    </div>
  );
}

export function ProgressDistributionChart({ data }: ProgressDistributionChartProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-foreground mb-4">공정률 분포</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
