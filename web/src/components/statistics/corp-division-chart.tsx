"use client";

interface CorpDivisionData {
  corporation: string;
  division: string;
  count: number;
  total_contract: number;
  total_headcount: number;
}

interface CorpDivisionChartProps {
  data: CorpDivisionData[];
}

const CORP_ORDER = ["남광토건", "극동건설", "금광기업"];

const DIV_CONFIG: Record<string, { color: string; label: string }> = {
  "건축": { color: "#2563EB", label: "건축" },
  "토목": { color: "#BFDBFE", label: "토목" },
};

const CORP_OPACITY: Record<string, number> = {
  "남광토건": 1.0,
  "극동건설": 1.0,
  "금광기업": 1.0,
};

const divisions = ["건축", "토목"];

type Metric = "count" | "total_contract" | "total_headcount";

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "count", label: "현장 수", unit: "개" },
  { key: "total_contract", label: "자사도급액", unit: "백억" },
  { key: "total_headcount", label: "인원", unit: "명" },
];

function fmtVal(v: number, metric: Metric): string {
  if (metric === "total_contract") return `${Math.round(v / 100)}`;
  return `${v.toLocaleString()}`;
}

/* ── Single metric bar group ─────────────────────────── */


function MetricBars({
  label,
  unit,
  corps,
  grouped,
  metric,
}: {
  label: string;
  unit: string;
  corps: string[];
  grouped: Record<string, Record<string, number>>;
  metric: Metric;
}) {
  const stackTotals = corps.map((c) => divisions.reduce((s, d) => s + (grouped[c]?.[d] ?? 0), 0));
  const maxStack = Math.max(...stackTotals, 1);
  const yMax = Math.ceil(maxStack * 1.05);

  return (
    <div className="relative flex-1 min-w-0 px-3 pb-0 pt-6 flex flex-col">
      {/* Tag label */}
      <span className="absolute top-1 left-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {/* Unit label */}
      <span className="absolute top-1 right-3 text-[10px] text-muted-foreground">
        (단위: {unit})
      </span>

      {/* Bar area */}
      <div className="flex items-end justify-center gap-5" style={{ height: 200 }}>
        {corps.map((corp) => {
          const archVal = grouped[corp]?.["건축"] ?? 0;
          const civilVal = grouped[corp]?.["토목"] ?? 0;
          const archH = archVal > 0 ? Math.max((archVal / yMax) * 200, 18) : 0;
          const civilH = civilVal > 0 ? Math.max((civilVal / yMax) * 200, 18) : 0;

          const total = archVal + civilVal;
          const op = CORP_OPACITY[corp] ?? 0.6;

          return (
            <div key={corp} className="flex flex-col items-center justify-end w-10 h-full">
              <span className="text-[13px] font-bold font-mono text-foreground mb-1">
                {fmtVal(total, metric)}
              </span>
              <div className="flex flex-col items-center w-full">
                {civilVal > 0 && (
                  <div
                    className="w-full rounded-t-md relative"
                    style={{ height: civilH, backgroundColor: DIV_CONFIG["토목"].color, opacity: op }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-600">
                      {fmtVal(civilVal, metric)}
                    </span>
                  </div>
                )}
                {archVal > 0 && (
                  <div
                    className="w-full rounded-b-md relative"
                    style={{ height: archH, backgroundColor: DIV_CONFIG["건축"].color, opacity: op }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white/90">
                      {fmtVal(archVal, metric)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Corp names inside background */}
      <div className="flex justify-center gap-5 pt-1 pb-1">
        {corps.map((corp) => (
          <span key={corp} className="text-[11px] text-foreground font-semibold w-10 text-center">{corp}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────── */

export function CorpDivisionChart({ data }: CorpDivisionChartProps) {
  function buildGrouped(metric: Metric) {
    const grouped: Record<string, Record<string, number>> = {};
    for (const d of data) {
      if (!grouped[d.corporation]) grouped[d.corporation] = {};
      grouped[d.corporation][d.division] = d[metric];
    }
    return grouped;
  }

  const groupedCount = buildGrouped("count");
  const knownCorps = CORP_ORDER.filter((c) => c in groupedCount);
  const otherCorps = Object.keys(groupedCount).filter((c) => !CORP_ORDER.includes(c));
  const corps = [...knownCorps, ...otherCorps];

  if (corps.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-center min-h-[220px]">
        <p className="text-sm text-muted-foreground">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="p-2 flex-1 flex flex-col overflow-hidden relative">
      {/* Legend - overlaid top right */}
      <div className="absolute top-8 right-5 z-10 flex flex-col gap-1 items-end">
        {divisions.map((d) => (
          <div key={d} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DIV_CONFIG[d].color }} />
            <span className="text-[9px] text-muted-foreground">{DIV_CONFIG[d].label}</span>
          </div>
        ))}
      </div>

      {/* 3 metric columns */}
      <div className="flex flex-1">
        {METRICS.map((m) => (
          <MetricBars
            key={m.key}
            label={m.label}
            unit={m.unit}
            corps={corps}
            grouped={buildGrouped(m.key)}
            metric={m.key}
          />
        ))}
      </div>

    </div>
  );
}
