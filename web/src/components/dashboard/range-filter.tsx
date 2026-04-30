"use client";

import { ChevronDownIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface RangeOption {
  value: string;
  label: string;
}

interface RangeFilterProps {
  label: string;
  options: RangeOption[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function RangeFilter({ label, options, selected, onChange }: RangeFilterProps) {
  const count = selected.size;

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* SelectTrigger 와 동일한 스타일 */}
        <button
          data-active={count > 0}
          className={cn(
            "flex items-center justify-between gap-1.5 rounded-full border px-2.5 !font-normal whitespace-nowrap cursor-pointer outline-none",
            "!text-[11px]",
            "h-6 shrink-0",
            "transition-colors duration-150",
            "focus-visible:ring-[4px] focus-visible:ring-ring/15 focus-visible:border-ring",
            count === 0
              ? "border-border bg-card !text-foreground hover:bg-muted/60"
              : "bg-primary/10 !text-primary border-primary/20 hover:bg-primary/15",
          )}
        >
          <span className="truncate">
            {count === 0 ? label : `${label} (${count})`}
          </span>
          <ChevronDownIcon className={cn("size-3 shrink-0", count === 0 ? "text-muted-foreground" : "text-white/85")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="start">
        <label
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-[11px]"
          onClick={(e) => { e.preventDefault(); onChange(new Set()); }}
        >
          <Checkbox checked={count === 0} />
          전체
        </label>

        <div className="my-1 h-px bg-border" />

        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-[11px]"
            onClick={(e) => { e.preventDefault(); toggle(opt.value); }}
          >
            <Checkbox checked={selected.has(opt.value)} />
            {opt.label}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
