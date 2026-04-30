import { API_BASE } from "./client";

/* ── Statistics summary response ── */

export interface AlertSite {
  id: number;
  site_name: string | null;
  corporation_name: string | null;
  progress_rate: number | null;
  delay_days: number;
  risk_grade: string | null;
  contract_amount: number | null;
}

export interface StatisticsSummary {
  progress: { average: number; on_track: number; delayed: number; total: number };
  safety: { grade_a: number; grade_b: number; grade_c: number; grade_d: number };
  headcount: { total: number; by_division: Record<string, number> };
  budget: {
    total_contract: number;
    total_our_share: number;
    total_group_share?: number;
    average_execution_rate: number;
  };
  by_status: { status: string; count: number; total_contract: number; total_headcount: number }[];
  by_division: { division: string; count: number }[];
  total_sites: number;
  by_corporation: { corporation: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_region_group: { region_group: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  progress_distribution: { label: string; count: number }[];
  alert_sites: AlertSite[];
  by_division_detail: { division: string; count: number; avg_progress: number; total_contract: number; total_headcount: number }[];
  by_amount_range: { label: string; count: number; total_contract: number; total_headcount: number }[];
  by_corporation_division: { corporation: string; division: string; count: number; total_contract: number; total_headcount: number }[];
  by_region: { region: string; count: number; total_contract: number; total_headcount: number; avg_progress: number }[];
  pre_start_by_completion_year: { year: string; count: number }[];
  active_by_completion_year: { year: string; count: number }[];
  amount_heatmap: {
    by_contract: ({ corporation: string } & Record<string, string | number>)[];
    by_our_share: ({ corporation: string } & Record<string, string | number>)[];
    by_contract_division: ({ division: string } & Record<string, string | number>)[];
    by_our_share_division: ({ division: string } & Record<string, string | number>)[];
    labels: string[];
    no_contract_count?: number;
    no_share_count?: number;
  };
}

export async function fetchStatisticsSummary(qs = ""): Promise<StatisticsSummary | null> {
  const url = `${API_BASE}/api/statistics/summary${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
