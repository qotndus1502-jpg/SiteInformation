"use client";

import { useCountUp } from "@/hooks/use-count-up";

interface HeroKpiProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  isFirst?: boolean;
}

/** One of the four small KPI cards that sit above the chart grid. The number
 *  ticks up from 0 via `useCountUp` whenever `value` changes. */
export function HeroKpi({ label, value, unit, icon: Icon }: HeroKpiProps) {
  const animated = useCountUp(value);
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-2 bg-card rounded-[6px] border border-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground tracking-[0.02em] shrink-0">
        <Icon className="h-5 w-5 text-primary/70" />
        {label}
      </div>
      <div className="flex items-baseline gap-1 min-w-0">
        <div className="font-mono tabular-nums text-[20px] font-bold tracking-[-0.02em] text-foreground">
          {Math.round(animated).toLocaleString()}
        </div>
        <div className="text-[11px] text-muted-foreground">{unit}</div>
      </div>
    </div>
  );
}
