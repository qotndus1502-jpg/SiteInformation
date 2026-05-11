import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for [StatusDonutChart](web/src/components/statistics/status-donut-chart.tsx).
 *  140×140 SVG donut (cx 70, r 55, innerR 30) with 3 segments + center
 *  total/TOTAL label. Wrapped in `flex items-center gap-3` to match the
 *  loaded chart's container. */
export function StatusDonutSkeleton() {
  const cx = 70, cy = 70, r = 55, innerR = 30;

  // Three segments: ~40%, ~30%, ~30% to feel like real distribution
  const segments = [
    { start: -90, end: 54, opacity: 0.55 },
    { start: 54, end: 162, opacity: 0.40 },
    { start: 162, end: 270, opacity: 0.30 },
  ];

  function arcPath(startDeg: number, endDeg: number) {
    const sR = (startDeg * Math.PI) / 180;
    const eR = (endDeg * Math.PI) / 180;
    const startOuter = { x: cx + r * Math.cos(sR), y: cy + r * Math.sin(sR) };
    const endOuter = { x: cx + r * Math.cos(eR), y: cy + r * Math.sin(eR) };
    const startInner = { x: cx + innerR * Math.cos(eR), y: cy + innerR * Math.sin(eR) };
    const endInner = { x: cx + innerR * Math.cos(sR), y: cy + innerR * Math.sin(sR) };
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${startOuter.x} ${startOuter.y} A ${r} ${r} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
  }

  return (
    <div className="pointer-events-none">
      <div className="relative flex items-center gap-3">
        <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="w-31 h-31 shrink-0 animate-pulse">
          {segments.map((seg, i) => (
            <path
              key={i}
              d={arcPath(seg.start, seg.end)}
              className="fill-muted"
              style={{ opacity: seg.opacity }}
              stroke="white"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {/* Center total label placeholder — overlay matching the loaded chart's text position */}
        <div className="absolute left-0 top-0 w-31 h-31 flex flex-col items-center justify-center pointer-events-none">
          <Skeleton className="h-3 w-6 rounded-md" />
          <Skeleton className="h-2 w-8 mt-1 rounded-md" />
        </div>
      </div>
    </div>
  );
}
