import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton matching one of the four sticky-header KPI cards.
 *  Mirrors [HeroKpi.tsx](web/src/components/statistics/_internal/HeroKpi.tsx)
 *  outer chrome (`bg-card rounded-[6px] border shadow`) so the swap-in is
 *  layout-stable. */
export function HeroKpiSkeleton() {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2 bg-card rounded-[6px] border border-border shadow-[0_1px_2px_rgba(15,23,42,0.04)] pointer-events-none">
      <div className="flex items-center gap-1.5 shrink-0">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-3 w-14 rounded-md" />
      </div>
      <div className="flex items-baseline gap-1 min-w-0">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-3 w-4 rounded-md" />
      </div>
    </div>
  );
}
