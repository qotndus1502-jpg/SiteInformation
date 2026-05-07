import { Skeleton } from "@/components/ui/skeleton";

export default function ManagingEntitiesLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-7 w-20" />
      </div>

      <div className="grid grid-cols-[minmax(320px,420px)_1fr] gap-4">
        {/* 좌측: 부서 목록 */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border">
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="px-3 py-2.5 border-b border-border/60 bg-muted/20 flex gap-2">
            <Skeleton className="h-7 flex-1" />
            <Skeleton className="h-7 flex-1" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div className="flex-1">
            {Array.from({ length: 3 }).map((_, gi) => (
              <div key={gi} className="border-b border-border/40">
                <div className="px-3 py-1.5 bg-muted/30">
                  <Skeleton className="h-3 w-16" />
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 담당 현장 */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-7 w-16" />
          </div>
          <div className="flex-1 divide-y divide-border/40">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-3.5 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
