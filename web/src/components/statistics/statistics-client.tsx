"use client";

import { KpiCard } from "./kpi-card";
import { SCurveChart } from "./s-curve-chart";
import { StatusChart } from "./status-chart";
import { CorporationChart } from "./corporation-chart";
import { RegionChart } from "./region-chart";
import { ProgressDistributionChart } from "./progress-distribution-chart";
import { AlertSitesTable } from "./alert-sites-table";
import { DivisionComparison } from "./division-comparison";
import { AmountDistributionChart } from "./amount-distribution-chart";

interface StatisticsSummary {
  progress: Record<string, any>;
  safety: Record<string, any>;
  headcount: Record<string, any>;
  budget: Record<string, any>;
  by_status: { status: string; count: number }[];
  by_division: { division: string; count: number }[];
  total_sites: number;
  by_corporation: { corporation: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_region_group: { region_group: string; count: number; total_contract: number }[];
  progress_distribution: { label: string; count: number }[];
  alert_sites: any[];
  by_division_detail: { division: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_amount_range: { label: string; count: number }[];
}

interface SCurveData {
  months: string[];
  plan: number[];
  actual: number[];
}

interface StatisticsClientProps {
  summary: StatisticsSummary;
  scurve: SCurveData;
}

export function StatisticsClient({ summary, scurve }: StatisticsClientProps) {
  return (
    <div className="space-y-5 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">그룹 3사 현장 대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          전체 {summary.total_sites}개 현장의 주요 지표를 한눈에 확인합니다
        </p>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard type="progress" data={summary.progress} />
        <KpiCard type="safety" data={summary.safety} />
        <KpiCard type="headcount" data={summary.headcount} />
        <KpiCard type="budget" data={summary.budget} />
      </div>

      {/* 법인별 성과 + 지역별 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CorporationChart data={summary.by_corporation ?? []} />
        <RegionChart data={summary.by_region_group ?? []} />
      </div>

      {/* S-Curve + 공정률 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SCurveChart data={scurve} />
        <ProgressDistributionChart data={summary.progress_distribution ?? []} />
      </div>

      {/* 주의 현장 리스트 */}
      <AlertSitesTable data={summary.alert_sites ?? []} />

      {/* 부문별 비교 + 도급액 규모별 + 상태분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DivisionComparison data={summary.by_division_detail ?? []} />
        <AmountDistributionChart data={summary.by_amount_range ?? []} />
        <StatusChart data={summary.by_status} />
      </div>
    </div>
  );
}
