import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1.7fr_1.3fr_1fr_1fr_1.1fr_1.5fr] gap-2 px-4 py-2 bg-muted/40 border-b border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.7fr_1.3fr_1fr_1fr_1.1fr_1.5fr] gap-2 px-4 py-2 items-center border-b border-border/40"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
