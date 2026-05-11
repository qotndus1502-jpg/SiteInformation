import { KoreaMapSkeleton } from "./KoreaMapSkeleton";
import { CorpDivisionSkeleton } from "./CorpDivisionSkeleton";
import { StatusDonutSkeleton } from "./StatusDonutSkeleton";
import { CompletionYearSkeleton } from "./CompletionYearSkeleton";
import { AmountHeatmapSkeleton } from "./AmountHeatmapSkeleton";

/** Composes the chart skeletons in the same grid layout as
 *  [BreakdownTabs](web/src/components/statistics/breakdown-tabs.tsx).
 *  Card chrome (`glass-card-dark` / `glass-card`), legends positions,
 *  and inner widths mirror the loaded layout so the swap-in is seamless. */
export function BreakdownTabsSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] h-full gap-2">
        {/* Left column — Korea map */}
        <div className="rounded-[6px] glass-card-dark overflow-hidden">
          <KoreaMapSkeleton />
        </div>

        {/* Right column — three rows */}
        <div className="flex flex-col min-h-0 gap-2">
          {/* Row 1 — 법인별 (CorpDivision) */}
          <div className="relative rounded-[6px] glass-card py-4 px-3 flex justify-end">
            <CorpDivisionSkeleton />
          </div>

          {/* Row 2 — 상태별 (Status donut + completion year timeline) */}
          <div className="relative px-3 py-0 rounded-[6px] glass-card">
            <div className="flex justify-end">
              <div style={{ width: 956 }} className="flex items-start">
                <div style={{ width: 348, paddingLeft: 68 }} className="flex justify-center shrink-0">
                  <StatusDonutSkeleton />
                </div>
                <div className="flex-1 flex items-start pt-3">
                  <CompletionYearSkeleton />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 — 금액별 heatmap pyramid (mirror pair) */}
          <div className="relative p-3 rounded-[6px] glass-card">
            <div className="flex items-start justify-center gap-0 [&>*]:-mx-2 [&>*]:-my-2">
              <AmountHeatmapSkeleton mirror />
              <AmountHeatmapSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
