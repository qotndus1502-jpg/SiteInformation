import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for [AlertSitesTable](web/src/components/statistics/alert-sites-table.tsx).
 *  6-column risk table; ~6 row placeholders. Header keeps the column-label
 *  text since the layout depends on it; body cells use Skeleton blocks. */
const ROW_COUNT = 6;

export function AlertSitesTableSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 pointer-events-none">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-4 rounded-md" />
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-3 w-8 rounded-md" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3"><Skeleton className="h-3 w-12 rounded-md" /></th>
              <th className="text-left py-2 px-3"><Skeleton className="h-3 w-8 rounded-md" /></th>
              <th className="text-right py-2 px-3"><Skeleton className="h-3 w-10 ml-auto rounded-md" /></th>
              <th className="text-right py-2 px-3"><Skeleton className="h-3 w-12 ml-auto rounded-md" /></th>
              <th className="text-center py-2 px-3"><Skeleton className="h-3 w-10 mx-auto rounded-md" /></th>
              <th className="text-right py-2 px-3"><Skeleton className="h-3 w-10 ml-auto rounded-md" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROW_COUNT }).map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2.5 px-3">
                  <Skeleton className="h-3 rounded-md" style={{ width: `${50 + ((i * 19) % 35)}%` }} />
                </td>
                <td className="py-2.5 px-3"><Skeleton className="h-3 w-16 rounded-md" /></td>
                <td className="py-2.5 px-3"><Skeleton className="h-3 w-10 ml-auto rounded-md" /></td>
                <td className="py-2.5 px-3"><Skeleton className="h-3 w-8 ml-auto rounded-md" /></td>
                <td className="py-2.5 px-3"><Skeleton className="h-5 w-6 mx-auto rounded-md" /></td>
                <td className="py-2.5 px-3"><Skeleton className="h-3 w-14 ml-auto rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
