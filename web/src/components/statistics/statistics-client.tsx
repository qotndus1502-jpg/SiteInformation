"use client";

import { KpiCard } from "./kpi-card";
import { SCurveChart } from "./s-curve-chart";
import { StatusChart } from "./status-chart";

interface StatisticsSummary {
  progress: Record<string, any>;
  safety: Record<string, any>;
  headcount: Record<string, any>;
  budget: Record<string, any>;
  by_status: { status: string; count: number }[];
  by_division: { division: string; count: number }[];
  total_sites: number;
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
    <div className="space-y-6 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">현장 대시보드</h1>
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

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SCurveChart data={scurve} />
        </div>
        <div>
          <StatusChart data={summary.by_status} />
        </div>
      </div>
    </div>
  );
}
