"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { charts } from "@/lib/chart-colors";
import { ChartTooltipCard, ChartTooltipDotRow, type RechartsTooltipProps } from "./_shared/chart-tooltip";

interface CorpData {
  corporation: string;
  count: number;
  avg_progress: number;
  total_contract: number;
  total_headcount: number;
}

interface CorporationChartProps {
  data: CorpData[];
}

const CORP_COLORS: Record<string, string> = {
  "남광토건": charts.corporationBars.namgwang,
  "극동건설": charts.corporationBars.geukdong,
  "금광기업": charts.corporationBars.geumgwang,
};

/** Chart's input is mapped through `chartData` below — series values come out
 *  as numbers, so we narrow `entry.value` to number for the math. */
function CustomTooltip({ active, payload, label }: RechartsTooltipProps<Record<string, number | string>>) {
  if (!payload?.length) return null;
  return (
    <ChartTooltipCard active={active} title={label}>
      {payload.map((entry) => {
        const v = typeof entry.value === "number" ? entry.value : 0;
        return (
          <ChartTooltipDotRow
            key={entry.name ?? ""}
            color={entry.color ?? "#999"}
            label={entry.name ?? ""}
            value={
              entry.name === "평균공정률"
                ? `${(v * 100).toFixed(1)}%`
                : entry.name === "총도급액"
                  ? `${v.toLocaleString()}억`
                  : v.toLocaleString()
            }
          />
        );
      })}
    </ChartTooltipCard>
  );
}

export function CorporationChart({ data }: CorporationChartProps) {
  const chartData = data.map((d) => ({
    name: d.corporation,
    현장수: d.count,
    평균공정률: d.avg_progress,
    총도급액: d.total_contract,
    인원: d.total_headcount,
  }));

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-base font-bold text-foreground mb-4">법인별 성과 비교</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="현장수" fill={charts.corporationBars.sites} radius={[4, 4, 0, 0]} />
            <Bar dataKey="인원" fill={charts.corporationBars.headcount} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* 하단 요약 */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-border">
        {data.map((d) => (
          <div key={d.corporation} className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">{d.corporation}</p>
            <p className="text-sm font-bold" style={{ color: CORP_COLORS[d.corporation] ?? charts.corporationBars.fallback }}>
              {(d.avg_progress * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">{d.total_contract.toLocaleString()}억</p>
          </div>
        ))}
      </div>
    </div>
  );
}
