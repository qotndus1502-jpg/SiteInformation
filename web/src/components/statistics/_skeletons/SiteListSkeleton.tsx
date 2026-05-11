import { Skeleton } from "@/components/ui/skeleton";
import { TABLE_COLS } from "@/components/dashboard/site-list";
import { cn } from "@/lib/utils";

/** Skeleton for [SiteList](web/src/components/dashboard/site-list.tsx).
 *  Reuses the exported `TABLE_COLS` grid string so the column proportions
 *  match the loaded table exactly. Header row + 8 data rows. */
const ROW_COUNT = 8;

export function SiteListSkeleton() {
  return (
    <div className="bg-white border border-border rounded-[6px] overflow-hidden pointer-events-none">
      {/* Column headers */}
      <div
        className={cn(
          "grid gap-2 px-4 py-2 bg-slate-50 border-b border-border/60",
          TABLE_COLS,
        )}
      >
        <Skeleton className="h-3 w-6 mx-auto rounded-md" />
        <Skeleton className="h-3 w-8 rounded-md" />
        <Skeleton className="h-3 w-8 rounded-md" />
        <Skeleton className="h-3 w-10 rounded-md" />
        <Skeleton className="h-3 w-14 rounded-md" />
        <Skeleton className="h-3 w-14 rounded-md" />
        <Skeleton className="h-3 w-10 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
        <Skeleton className="h-3 w-16 ml-auto rounded-md" />
        <span />
        <Skeleton className="h-3 w-12 ml-auto rounded-md" />
      </div>

      {/* Data rows */}
      <div className="divide-y divide-border/40">
        {Array.from({ length: ROW_COUNT }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "grid gap-2 px-4 py-0.5 items-center border-l-[3px] border-l-transparent",
              TABLE_COLS,
            )}
            style={{ minHeight: 36 }}
          >
            {/* No. */}
            <Skeleton className="h-3 w-4 mx-auto rounded-md" />
            {/* 법인 (badge) */}
            <Skeleton className="h-5 w-12 rounded-full" />
            {/* 부문 */}
            <Skeleton className="h-3 w-8 rounded-md" />
            {/* 지역 */}
            <Skeleton className="h-3 w-10 rounded-md" />
            {/* 시설유형 */}
            <Skeleton className="h-3 w-12 rounded-md" />
            {/* 발주유형 */}
            <Skeleton className="h-3 w-10 rounded-md" />
            {/* 상태 (badge) */}
            <Skeleton className="h-5 w-10 rounded-full" />
            {/* 현장명 (변동 너비로 자연스럽게) */}
            <Skeleton
              className="h-3 rounded-md"
              style={{ width: `${50 + ((idx * 17) % 40)}%` }}
            />
            {/* 공사금액 */}
            <Skeleton className="h-3 w-16 ml-auto rounded-md" />
            <span />
            {/* 공정률 + bar */}
            <div className="text-right">
              <Skeleton className="h-3 w-8 ml-auto rounded-md" />
              <Skeleton className="h-1 w-full mt-0.5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
