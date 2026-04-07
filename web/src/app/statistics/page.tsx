import { StatisticsClient } from "@/components/statistics/statistics-client";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

export default async function StatisticsPage() {
  let summary = {
    progress: { average: 0, on_track: 0, delayed: 0, total: 0 },
    safety: { grade_a: 0, grade_b: 0, grade_c: 0, grade_d: 0 },
    headcount: { total: 0, by_division: {} },
    budget: { total_contract: 0, total_our_share: 0, average_execution_rate: 0 },
    by_status: [],
    by_division: [],
    total_sites: 0,
    by_corporation: [],
    by_region_group: [],
    progress_distribution: [],
    alert_sites: [],
    by_division_detail: [],
    by_amount_range: [],
    by_corporation_division: [],
    by_region: [],
  };

  try {
    const res = await fetch(`${API_BASE}/api/statistics/summary`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      summary = { ...summary, ...data };
    }
  } catch {}

  return <StatisticsClient summary={summary} />;
}
