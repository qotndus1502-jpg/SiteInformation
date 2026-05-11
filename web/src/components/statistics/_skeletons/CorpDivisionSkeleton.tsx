import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for [CorpDivisionChart](web/src/components/statistics/corp-division-chart.tsx).
 *  Matches its `px-3 pt-1 pb-1 inline-flex flex-col` outer + 3 metric columns
 *  (현장 수 / 자사도급액 / 인원), each row a diverging-bar pair. */
const CORP_COUNT = 3; // 남광토건 + 극동건설 + 금광기업
const METRIC_COUNT = 3;
const CELL_WIDTH = 280; // matches barAreaW(250) + spacing(30) in chart
const ROW_H = 16;
const ROW_GAP = 10;

export function CorpDivisionSkeleton() {
  return (
    <div className="px-3 pt-1 pb-1 inline-flex flex-col relative pointer-events-none">
      {/* Header row: empty corp column + 3 metric titles */}
      <div className="flex items-center gap-0 mb-1 mt-0">
        <div className="w-14 shrink-0" />
        {Array.from({ length: METRIC_COUNT }).map((_, mi) => (
          <div
            key={mi}
            className={mi < METRIC_COUNT - 1 ? "shrink-0 text-center mr-2" : "shrink-0 text-center"}
            style={{ width: CELL_WIDTH }}
          >
            <Skeleton className="h-3 w-24 mx-auto rounded-md" />
          </div>
        ))}
      </div>

      {/* Data rows: corp label + 3 metric bar pairs */}
      <div className="flex flex-col" style={{ gap: ROW_GAP }}>
        {Array.from({ length: CORP_COUNT }).map((_, ci) => (
          <div key={ci} className="flex items-center gap-0">
            <Skeleton className="w-12 h-3 ml-1 rounded-md" />
            <div className="w-2 shrink-0" />
            {Array.from({ length: METRIC_COUNT }).map((_, mi) => (
              <div
                key={mi}
                className={mi < METRIC_COUNT - 1 ? "flex items-center justify-center mr-2" : "flex items-center justify-center"}
                style={{ width: CELL_WIDTH, height: ROW_H }}
              >
                {/* Diverging bar pair: left half (건축) + right half (토목) */}
                <div className="flex justify-end" style={{ width: CELL_WIDTH / 2 - 5 }}>
                  <Skeleton
                    className="rounded-l-md rounded-r-none"
                    style={{ height: ROW_H, width: 60 + ((ci * 17 + mi * 23) % 60) }}
                  />
                </div>
                <div className="w-px h-full" />
                <div className="flex justify-start" style={{ width: CELL_WIDTH / 2 - 5 }}>
                  <Skeleton
                    className="rounded-r-md rounded-l-none"
                    style={{ height: ROW_H, width: 50 + ((ci * 31 + mi * 19) % 70) }}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
