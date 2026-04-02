import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default async function DashboardPage() {
  const [sitesRes, filterRes] = await Promise.all([
    fetch(`${API_BASE}/api/sites`, { cache: "no-store" }),
    fetch(`${API_BASE}/api/filter-options`, { cache: "no-store" }),
  ]);

  const [sites, filterOptions] = await Promise.all([
    sitesRes.json(),
    filterRes.json(),
  ]);

  return (
    <DashboardClient
      initialSites={sites}
      filterOptions={filterOptions}
    />
  );
}
