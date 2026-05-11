import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for [CompletionYearChart](web/src/components/statistics/completion-year-chart.tsx).
 *  Two stacked horizontal timelines (착공예정 / 준공예정), each 50px tall
 *  with bubbles at ~60px slot width and year labels below. */
const SLOT_W = 60;
const LABEL_W = 64;
const TOTAL_H = 50;
const BUBBLE_CY = 16;
const NODE_COUNT = 5;

function TimelineSkeleton() {
  const totalW = LABEL_W + NODE_COUNT * SLOT_W;
  const firstBubbleCx = totalW - SLOT_W / 2 - (NODE_COUNT - 1) * SLOT_W;

  return (
    <div className="flex items-center pointer-events-none">
      <div className="relative" style={{ width: totalW, height: TOTAL_H }}>
        {/* Title placeholder — left edge */}
        <div className="absolute" style={{ left: 0, top: BUBBLE_CY, transform: "translate(-28px, -50%)" }}>
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>

        {/* Background horizontal line */}
        <div
          className="absolute h-px bg-muted/60"
          style={{
            left: firstBubbleCx,
            width: (NODE_COUNT - 1) * SLOT_W,
            top: BUBBLE_CY,
          }}
        />

        {/* Bubbles + year labels */}
        {Array.from({ length: NODE_COUNT }).map((_, i) => {
          const cx = firstBubbleCx + i * SLOT_W;
          // Vary bubble size deterministically (10–18 like the real chart)
          const r = 10 + ((i * 13) % 9);
          return (
            <div key={i}>
              <Skeleton
                className="absolute rounded-full"
                style={{
                  left: cx,
                  top: BUBBLE_CY,
                  transform: "translate(-50%, -50%)",
                  width: r * 2,
                  height: r * 2,
                }}
              />
              <div className="absolute" style={{ left: cx, top: 36, transform: "translateX(-50%)" }}>
                <Skeleton className="h-2 w-8 rounded-md" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CompletionYearSkeleton() {
  return (
    <div className="px-2 py-0">
      <div className="flex flex-col items-end gap-0">
        <TimelineSkeleton />
        <TimelineSkeleton />
      </div>
    </div>
  );
}
