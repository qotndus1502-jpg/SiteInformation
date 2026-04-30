import type { ReactNode } from "react";

/** Shape of the props recharts passes to a `<Tooltip content={...} />` node.
 *  Generic over the row type bound to each Pie/Bar/Line entry's `payload`.
 *
 *  Use `RechartsTooltipProps<unknown>` if the chart's payload shape is mixed;
 *  otherwise, parameterize with the chart's input row type for full safety. */
export interface RechartsTooltipProps<TPayload = unknown> {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string | number;
    payload: TPayload;
  }>;
  label?: string | number;
}

/** Outer shell used by every recharts CustomTooltip in this app.
 *  Pass the recharts `active` flag through; renders nothing when inactive. */
export function ChartTooltipCard({
  active,
  title,
  children,
}: {
  active?: boolean;
  title?: ReactNode;
  children: ReactNode;
}) {
  if (active === false) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm">
      {title !== undefined && title !== null && (
        <p className="font-semibold text-foreground mb-1.5">{title}</p>
      )}
      {children}
    </div>
  );
}

/** A single row with colored dot + label + monospace value.
 *  Matches the multi-series tooltip pattern (BarChart / LineChart). */
export function ChartTooltipDotRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}
