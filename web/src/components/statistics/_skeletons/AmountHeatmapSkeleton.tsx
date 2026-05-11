import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for [AmountHeatmapChart](web/src/components/statistics/amount-heatmap-chart.tsx).
 *  Pyramid layout with 5 amount-range rows, each row = left bar (건축) +
 *  center label + right bar (토목). When mirror=true, rows anchor right
 *  for two charts to butt together at the center. */
const ROW_H = 16;
const ROW_GAP = 4;
const ROW_COUNT = 5;
const LABEL_COL_W = 80;
const HALF_W = 200;

interface Props {
  mirror?: boolean;
  showTitle?: boolean;
}

export function AmountHeatmapSkeleton({ mirror = false, showTitle = true }: Props) {
  return (
    <div className="p-2 relative pointer-events-none">
      <div className="px-3 pt-0 pb-2 flex flex-col gap-4">
        <div className="flex-1 flex flex-col">
          {showTitle && (
            <div className="text-center mb-1">
              <Skeleton className="h-3 w-32 mx-auto rounded-md" />
            </div>
          )}
          <div
            className={`flex flex-col relative ${mirror ? "items-end" : "items-start"}`}
            style={{ gap: ROW_GAP }}
          >
            {Array.from({ length: ROW_COUNT }).map((_, i) => {
              // Bar widths taper from wide (top, ≤500억) to narrow (bottom, >3000억).
              // Diff between left/right bars varies for realism.
              const leftW = Math.max(20, HALF_W - i * 30 - ((i * 13) % 25));
              const rightW = Math.max(15, HALF_W - i * 35 + ((i * 17) % 30));

              return (
                <div
                  key={i}
                  className="flex items-center gap-0 relative"
                  style={{ height: ROW_H }}
                >
                  {/* Left bar (건축) — right-anchored */}
                  <div className="flex justify-end" style={{ width: HALF_W }}>
                    <Skeleton
                      className="rounded-l-md rounded-r-none"
                      style={{ height: ROW_H, width: leftW }}
                    />
                  </div>
                  {/* Center label */}
                  <div className="flex justify-center" style={{ width: LABEL_COL_W }}>
                    <Skeleton className="h-3 w-12 rounded-md" />
                  </div>
                  {/* Right bar (토목) — left-anchored */}
                  <div className="flex justify-start" style={{ width: HALF_W }}>
                    <Skeleton
                      className="rounded-r-md rounded-l-none"
                      style={{ height: ROW_H, width: rightW }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
