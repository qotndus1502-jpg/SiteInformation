"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SCurveData {
  months: string[];
  plan: number[];
  actual: number[];
}

interface SCurveChartProps {
  data: SCurveData;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name === "plan" ? "계획" : "실적"}:</span>
          <span className="font-mono font-semibold text-foreground">{entry.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export function SCurveChart({ data }: SCurveChartProps) {
  const chartData = data.months.map((month, i) => ({
    month,
    plan: data.plan[i] ?? 0,
    actual: data.actual[i] ?? 0,
  }));

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-foreground mb-4">S-Curve (계획 vs 실적)</h3>
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickFormatter={(v) => {
                const [y, m] = v.split("-");
                return `${m}월`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={currentMonth}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "현재", position: "top", fontSize: 11, fill: "#EF4444" }}
            />
            <Area
              type="monotone"
              dataKey="plan"
              stroke="#94A3B8"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              name="plan"
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#2563EB"
              strokeWidth={2.5}
              fill="url(#actualGrad)"
              name="actual"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
