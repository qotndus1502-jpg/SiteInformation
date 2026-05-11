import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

/** Skeleton for [SiteDetail](web/src/components/dashboard/site-detail.tsx).
 *  Mirrors structure: image area (300px) + header section (badges/name/
 *  address/date) + progress bars + main info area (rows + JV donut) +
 *  manager rows. Memo section is omitted (often absent in real cards). */
export function SiteDetailSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border/40 shadow-sm w-full pointer-events-none">
      {/* 조감도 (이미지 영역) */}
      <Skeleton className="h-[300px] w-full rounded-none" />

      {/* 헤더 — 라운드 코너로 이미지 위에 겹침 */}
      <div className="relative -mt-5 bg-card rounded-t-xl p-4 pb-3">
        {/* Badges row */}
        <div className="flex items-center gap-1 flex-wrap mb-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        {/* Site name */}
        <Skeleton className="h-4 w-48 rounded-md" />
        {/* Address */}
        <Skeleton className="h-3 w-64 mt-1.5 rounded-md" />
        {/* Date */}
        <Skeleton className="h-3 w-40 mt-1 rounded-md" />
      </div>

      <Separator />

      {/* 공정률 / 실행률 (grid 2-col) */}
      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-9 rounded-md" />
            <Skeleton className="h-1.5 flex-1 rounded-full" />
            <Skeleton className="h-3 w-10 rounded-md" />
          </div>
        ))}
      </div>

      <Separator />

      {/* 주요 정보 (좌 60% rows + 우 40% chart) */}
      <div className="px-4 py-3 flex gap-3">
        <div className="min-w-0" style={{ flex: "1 1 60%" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr] items-baseline gap-3 py-0.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-3 rounded-md" style={{ width: `${50 + ((i * 13) % 35)}%` }} />
            </div>
          ))}
        </div>
        <div className="border-l border-border" />
        <div className="flex flex-col items-center justify-center" style={{ flex: "1 1 40%" }}>
          {/* JV 도넛 placeholder — 작은 ring */}
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
      </div>

      <Separator />

      {/* 현장 인력 — 현장소장 + PM */}
      <div className="px-4 py-3">
        {[0, 1].map((i) => (
          <div key={i} className="grid grid-cols-[80px_1fr] items-baseline gap-3 py-0.5">
            <Skeleton className="h-3 w-12 rounded-md" />
            <div className="flex items-center justify-end gap-1">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-3 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
