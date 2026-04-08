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
    pre_start_by_completion_year: [],
    active_by_completion_year: [],
    amount_heatmap: { by_contract: [], by_our_share: [], by_contract_division: [], by_our_share_division: [], labels: [] },
  };

  let filterOptions = {
    corporations: [],
    regions: [],
    facilityTypes: [],
    orderTypes: [],
    divisions: [],
    statuses: [],
  };

  let sites: any[] = [];

  try {
    const [summaryRes, filterRes, sitesRes] = await Promise.all([
      fetch(`${API_BASE}/api/statistics/summary`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/filter-options`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/sites`, { cache: "no-store" }),
    ]);
    if (summaryRes.ok) {
      const data = await summaryRes.json();
      summary = { ...summary, ...data };
    }
    if (filterRes.ok) {
      filterOptions = await filterRes.json();
    }
    if (sitesRes.ok) {
      sites = await sitesRes.json();
    }
  } catch {}

  return <StatisticsClient summary={summary} filterOptions={filterOptions} initialSites={sites} />;
}
