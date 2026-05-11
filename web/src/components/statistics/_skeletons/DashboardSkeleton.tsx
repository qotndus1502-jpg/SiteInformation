import { Skeleton } from "@/components/ui/skeleton";
import { DashboardScaler } from "../_internal/DashboardScaler";
import { HeroKpiSkeleton } from "./HeroKpiSkeleton";
import { BreakdownTabsSkeleton } from "./BreakdownTabsSkeleton";
import { SiteListSkeleton } from "./SiteListSkeleton";

/** Full-dashboard skeleton for `/statistics/loading.tsx`.
 *  Composed at intrinsic (non-scaled) size for the sticky header (the
 *  loaded page's `transform: scale` is JS-driven, so leaving the skeleton
 *  un-scaled is a small acceptable shift during the brief SSR-fetch
 *  window). Body is wrapped in `DashboardScaler` for matching zoom. */
export function DashboardSkeleton() {
  return (
    <>
      {/* Sticky header — FilterBar pills + 4-col KPI grid */}
      <div className="sticky top-11 z-30 bg-background border-b border-border -mx-4 sm:-mx-6 px-6 py-2 flex flex-col gap-1">
        {/* FilterBar skeleton — pill placeholders for 9 dropdowns + search + reset/export */}
        <div className="flex items-center flex-wrap gap-1.5 px-3 py-2 bg-card rounded-[6px] border border-border">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 flex-1 min-w-[140px] rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        {/* KPI grid */}
        <div className="grid grid-cols-4 gap-2">
          <HeroKpiSkeleton />
          <HeroKpiSkeleton />
          <HeroKpiSkeleton />
          <HeroKpiSkeleton />
        </div>
      </div>

      {/* Body — same DashboardScaler wrapper as the loaded page */}
      <DashboardScaler>
        <div className="flex-1 min-h-0">
          <BreakdownTabsSkeleton />
        </div>
        <SiteListSkeleton />
      </DashboardScaler>
    </>
  );
}
