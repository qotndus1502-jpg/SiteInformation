"use client";

import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RangeFilter } from "./range-filter";
import type { SiteFilter, FilterOptions } from "@/lib/queries/sites";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "진행중" },
  { value: "PRE_START", label: "착공전" },
  { value: "COMPLETED", label: "준공" },
];

function strToSet(v: string | undefined): Set<string> {
  if (!v || v === "all") return new Set();
  return new Set(v.split(",").filter((p) => p && p !== "all"));
}

function setToStr(s: Set<string>): string {
  return s.size === 0 ? "all" : Array.from(s).join(",");
}

const AMOUNT_OPTIONS = [
  { value: "0-500",    label: "≤ 500억" },
  { value: "500-1000", label: "≤ 1,000억" },
  { value: "1000-2000", label: "≤ 2,000억" },
  { value: "2000-3000", label: "≤ 3,000억" },
  { value: "3000-",    label: "> 3,000억" },
];

const PROGRESS_OPTIONS = [
  { value: "0-10", label: "10% 미만" },
  { value: "10-30", label: "10~30%" },
  { value: "30-50", label: "30~50%" },
  { value: "50-70", label: "50~70%" },
  { value: "70-90", label: "70~90%" },
  { value: "90-101", label: "90% 이상" },
];

export const GRID_COLS = "grid-cols-[minmax(80px,0.8fr)_minmax(70px,0.7fr)_minmax(70px,0.7fr)_minmax(80px,0.8fr)_minmax(80px,0.8fr)_minmax(80px,0.8fr)_minmax(140px,2.5fr)_minmax(75px,0.9fr)_minmax(70px,0.9fr)]";

const TC = "!text-[11px] !font-normal !text-muted-foreground w-full !h-7 !py-0 !rounded-md";

export interface FilterBarProps {
  filterOptions: FilterOptions;
  filters: SiteFilter;
  onFilterChange: (key: keyof SiteFilter, value: string) => void;
  amountRanges: Set<string>;
  progressRanges: Set<string>;
  onAmountRangesChange: (v: Set<string>) => void;
  onProgressRangesChange: (v: Set<string>) => void;
  onReset?: () => void;
}

export function FilterBar({
  filterOptions, filters, onFilterChange,
  amountRanges, progressRanges, onAmountRangesChange, onProgressRangesChange,
  onReset,
}: FilterBarProps) {
  return (
    <div className={`grid ${GRID_COLS} gap-1.5 px-4 py-1.5 items-center`}>
      <RangeFilter
        label="전체 법인"
        options={filterOptions.corporations.map((c) => ({ value: c, label: c }))}
        selected={strToSet(filters.corporation)}
        onChange={(s) => onFilterChange("corporation", setToStr(s))}
      />
      <RangeFilter
        label="전체 부문"
        options={filterOptions.divisions.map((d) => ({ value: d, label: d }))}
        selected={strToSet(filters.division)}
        onChange={(s) => onFilterChange("division", setToStr(s))}
      />
      <RangeFilter
        label="전체 지역"
        options={filterOptions.regions.map((r) => ({ value: r, label: r }))}
        selected={strToSet(filters.region)}
        onChange={(s) => onFilterChange("region", setToStr(s))}
      />
      <RangeFilter
        label="시설유형"
        options={filterOptions.facilityTypes.map((t) => ({ value: t, label: t }))}
        selected={strToSet(filters.facilityType)}
        onChange={(s) => onFilterChange("facilityType", setToStr(s))}
      />
      <RangeFilter
        label="발주유형"
        options={filterOptions.orderTypes.map((t) => ({ value: t, label: t }))}
        selected={strToSet(filters.orderType)}
        onChange={(s) => onFilterChange("orderType", setToStr(s))}
      />
      <RangeFilter
        label="전체 상태"
        options={STATUS_OPTIONS}
        selected={strToSet(filters.status)}
        onChange={(s) => onFilterChange("status", setToStr(s))}
      />

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="현장명 검색..."
          value={filters.search ?? ""}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="!h-7 pl-7 !text-[11px] !font-normal !text-muted-foreground w-full !py-0 !rounded-md"
          size="sm"
        />
      </div>

      <RangeFilter label="공사금액" options={AMOUNT_OPTIONS} selected={amountRanges} onChange={onAmountRangesChange} />
      <div className="flex items-center gap-1 min-w-0">
        <div className="flex-1 min-w-0">
          <RangeFilter label="공정률" options={PROGRESS_OPTIONS} selected={progressRanges} onChange={onProgressRangesChange} />
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title="필터 초기화"
            aria-label="필터 초기화"
            className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
