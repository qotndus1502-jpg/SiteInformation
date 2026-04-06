"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
  "남광토건": "#16A34A",
  "극동건설": "#2563EB",
  "금광기업": "#EA580C",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-semibold text-foreground">
            {entry.name === "평균공정률" ? `${(entry.value * 100).toFixed(1)}%` :
             entry.name === "총도급액" ? `${entry.value.toLocaleString()}억` :
             entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
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
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-foreground mb-4">법인별 성과 비교</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="현장수" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="인원" fill="#06B6D4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* 하단 요약 */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-border">
        {data.map((d) => (
          <div key={d.corporation} className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">{d.corporation}</p>
            <p className="text-sm font-bold" style={{ color: CORP_COLORS[d.corporation] ?? "#666" }}>
              {(d.avg_progress * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">{d.total_contract.toLocaleString()}억</p>
          </div>
        ))}
      </div>
    </div>
  );
}
