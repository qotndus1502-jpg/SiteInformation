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
          className={cn(
            "flex w-fit items-center justify-between gap-2 rounded-lg border border-input bg-card px-3.5 py-2.5 !font-normal whitespace-nowrap cursor-pointer shadow-xs transition-[color,box-shadow] outline-none",
            "!text-xs",
            "h-9 w-full",
            "focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15",
            count === 0
              ? "!text-muted-foreground"
              : "border-primary/50 bg-primary/5 !text-primary",
          )}
        >
          <span className="truncate">
            {count === 0 ? label : `${label} (${count})`}
          </span>
          <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="start">
        <label
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
          onClick={(e) => { e.preventDefault(); onChange(new Set()); }}
        >
          <Checkbox checked={count === 0} />
          전체
        </label>

        <div className="my-1 h-px bg-border" />

        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
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
