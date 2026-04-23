"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { charts } from "@/lib/chart-colors";

interface AmountDistData {
  label: string;
  count: number;
}

interface AmountDistributionChartProps {
  data: AmountDistData[];
}

const BAR_COLORS = charts.amountDistribution;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">현장 수: <span className="font-mono font-semibold text-foreground">{payload[0].value}개</span></p>
    </div>
  );
}

export function AmountDistributionChart({ data }: AmountDistributionChartProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-(--shadow-card) hover:shadow-(--shadow-card-hover) hover:-translate-y-0.5 transition-[box-shadow,transform] duration-(--motion)">
      <h3 className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-slate-900 tracking-tight mb-4">
        <span className="inline-block w-0.5 h-3.5 rounded-sm bg-primary/80" />
        도급액 규모별 분포
      </h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} layout="vertical">
            <defs>
              {data.map((_, i) => {
                const c = BAR_COLORS[i % BAR_COLORS.length];
                return (
                  <linearGradient key={i} id={`amount-dist-bar-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${c} 92%, white)` }} />
                    <stop offset="100%" style={{ stopColor: c }} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(148,163,184,0.3)" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} stroke="rgba(148,163,184,0.4)" />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: "#64748B" }} width={80} stroke="rgba(148,163,184,0.4)" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#amount-dist-bar-${i})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
