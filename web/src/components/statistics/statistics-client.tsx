"use client";

import { Building2, Wallet, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressDistributionChart } from "./progress-distribution-chart";
import { BreakdownTabs } from "./breakdown-tabs";
import { CorpDivisionChart } from "./corp-division-chart";

/* ── Types ──────────────────────────────────────────────── */

interface StatisticsSummary {
  progress: Record<string, any>;
  safety: Record<string, any>;
  headcount: Record<string, any>;
  budget: Record<string, any>;
  by_status: { status: string; count: number; total_contract: number; total_headcount: number }[];
  by_division: { division: string; count: number }[];
  total_sites: number;
  by_corporation: { corporation: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_region_group: { region_group: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  progress_distribution: { label: string; count: number }[];
  alert_sites: any[];
  by_division_detail: { division: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_amount_range: { label: string; count: number; total_contract: number; total_headcount: number }[];
  by_corporation_division: { corporation: string; division: string; count: number; total_contract: number; total_headcount: number }[];
  by_region: { region: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
}

interface StatisticsClientProps {
  summary: StatisticsSummary;
}

/* ── Hero KPI Card ──────────────────────────────────────── */

function HeroKpi({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  edgeShadow,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
  edgeShadow: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 text-white overflow-hidden transition-all duration-300",
        "bg-gradient-to-br", gradient,
        "hover:[transform:perspective(800px)_rotateX(0deg)_rotateY(0deg)]",
        "[transform:perspective(800px)_rotateX(2deg)_rotateY(-2deg)]",
      )}
      style={{
        boxShadow: `0 4px 0 0 ${edgeShadow}, 0 8px 24px -4px rgba(0,0,0,0.25), 0 4px 8px -2px rgba(0,0,0,0.1)`,
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
      <div className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
        <Icon className="h-6 w-6" />
      </div>
      <div className="relative z-10">
        <p className="text-sm font-medium text-white/80 mb-2">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-white/70 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export function StatisticsClient({ summary }: StatisticsClientProps) {
  const progress = summary.progress;
  const headcount = summary.headcount;
  const budget = summary.budget;

  const execRatePct = ((budget.average_execution_rate ?? 0) * 100).toFixed(1);

  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          그룹 3사 현장 대시보드
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          전체 {summary.total_sites}개 현장의 주요 지표를 한눈에 확인합니다
        </p>
      </div>

      {/* ── Hero KPIs (vertical) + Corp Division Chart ── */}
      <div className="flex gap-4 items-stretch">
        {/* KPI column */}
        <div className="flex flex-col gap-3 shrink-0 w-[340px] [&>*]:flex-1">
          <HeroKpi
            icon={Building2}
            label="총 현장"
            value={`${summary.total_sites}개`}
            sub={`진행중 ${progress.total ?? 0}개 | 지연 ${progress.delayed ?? 0}개`}
            gradient="from-blue-500 to-blue-700"
            edgeShadow="rgba(37,99,235,0.5)"
          />
          <HeroKpi
            icon={Wallet}
            label="총 도급액"
            value={`${(budget.total_contract ?? 0).toLocaleString()}억`}
            sub={`자사분 ${(budget.total_our_share ?? 0).toLocaleString()}억 | 실행률 ${execRatePct}%`}
            gradient="from-amber-500 to-amber-700"
            edgeShadow="rgba(245,158,11,0.5)"
          />
          <HeroKpi
            icon={Users}
            label="총 인원"
            value={`${(headcount.total ?? 0).toLocaleString()}명`}
            sub={Object.entries(headcount.by_division ?? {}).map(([d, c]) => `${d} ${(c as number).toLocaleString()}명`).join(" | ")}
            gradient="from-sky-500 to-sky-700"
            edgeShadow="rgba(14,165,233,0.5)"
          />
        </div>

        {/* Corp Division Chart */}
        <div className="flex-1 min-w-0 flex">
          <CorpDivisionChart data={summary.by_corporation_division ?? []} />
        </div>
      </div>

      {/* ── Breakdown Tabs ── */}
      <BreakdownTabs
        by_corporation={summary.by_corporation ?? []}
        by_division_detail={summary.by_division_detail ?? []}
        by_region_group={summary.by_region_group ?? []}
        by_status={summary.by_status ?? []}
        by_amount_range={summary.by_amount_range ?? []}
        by_region={summary.by_region ?? []}
      />

      {/* ── Progress Distribution ── */}
      <ProgressDistributionChart data={summary.progress_distribution ?? []} />

    </div>
  );
}
