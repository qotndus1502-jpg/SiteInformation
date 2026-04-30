import { StatisticsClient } from "@/components/statistics/statistics-client";
import { fetchSites, fetchFilterOptions, type FilterOptions } from "@/lib/api/sites";
import { fetchStatisticsSummary, type StatisticsSummary } from "@/lib/api/statistics";
import type { SiteDashboard } from "@/types/database";

export const dynamic = "force-dynamic";

const EMPTY_SUMMARY: StatisticsSummary = {
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

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  corporations: [],
  regions: [],
  facilityTypes: [],
  orderTypes: [],
  divisions: [],
  statuses: [],
  managingEntities: [],
};

export default async function StatisticsPage() {
  let summary: StatisticsSummary = EMPTY_SUMMARY;
  let filterOptions: FilterOptions = EMPTY_FILTER_OPTIONS;
  let sites: SiteDashboard[] = [];

  try {
    const [summaryData, filterData, sitesData] = await Promise.all([
      fetchStatisticsSummary(),
      fetchFilterOptions(),
      fetchSites(),
    ]);
    if (summaryData) summary = { ...EMPTY_SUMMARY, ...summaryData };
    if (filterData) filterOptions = filterData;
    if (sitesData) sites = sitesData;
  } catch {}

  return <StatisticsClient summary={summary} filterOptions={filterOptions} initialSites={sites} />;
}
