import { Skeleton } from "@/components/ui/skeleton";

export default function PendingLoading() {
  return (
    <div className="min-h-[calc(100vh-44px)] flex items-center justify-center px-4">
      <div className="w-full max-w-[440px] bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4 items-center">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32 self-center" />
        </div>
      </div>
    </div>
  );
}
