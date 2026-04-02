"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RangeFilter } from "./range-filter";
import type { SiteFilter, FilterOptions } from "@/lib/queries/sites";

const AMOUNT_OPTIONS = [
  { value: "0-100", label: "100억 미만" },
  { value: "100-500", label: "100~500억" },
  { value: "500-1000", label: "500~1,000억" },
  { value: "1000-2000", label: "1,000~2,000억" },
  { value: "2000-", label: "2,000억 이상" },
];

const PROGRESS_OPTIONS = [
  { value: "0-10", label: "10% 미만" },
  { value: "10-30", label: "10~30%" },
  { value: "30-50", label: "30~50%" },
  { value: "50-70", label: "50~70%" },
  { value: "70-90", label: "70~90%" },
  { value: "90-101", label: "90% 이상" },
];

export const GRID_COLS = "grid-cols-[minmax(50px,0.6fr)_minmax(40px,0.5fr)_minmax(40px,0.5fr)_minmax(50px,0.6fr)_minmax(50px,0.6fr)_minmax(50px,0.6fr)_minmax(160px,3.5fr)_minmax(50px,0.8fr)_minmax(50px,0.8fr)]";

const TC = "!text-xs !font-normal !text-muted-foreground w-full";

export interface FilterBarProps {
  filterOptions: FilterOptions;
  filters: SiteFilter;
  onFilterChange: (key: keyof SiteFilter, value: string) => void;
  amountRanges: Set<string>;
  progressRanges: Set<string>;
  onAmountRangesChange: (v: Set<string>) => void;
  onProgressRangesChange: (v: Set<string>) => void;
}

export function FilterBar({
  filterOptions, filters, onFilterChange,
  amountRanges, progressRanges, onAmountRangesChange, onProgressRangesChange,
}: FilterBarProps) {
  return (
    <div className={`grid ${GRID_COLS} gap-2 px-4 py-2 items-center`}>
      <Select value={filters.corporation ?? "all"} onValueChange={(v) => onFilterChange("corporation", v)}>
        <SelectTrigger size="sm" className={TC}><SelectValue placeholder="전체 법인" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 법인</SelectItem>
          {filterOptions.corporations.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.division ?? "all"} onValueChange={(v) => onFilterChange("division", v)}>
        <SelectTrigger size="sm" className={TC}><SelectValue placeholder="전체 부문" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 부문</SelectItem>
          {filterOptions.divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.region ?? "all"} onValueChange={(v) => onFilterChange("region", v)}>
        <SelectTrigger size="sm" className={TC}><SelectValue placeholder="전체 지역" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 지역</SelectItem>
          {filterOptions.regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.facilityType ?? "all"} onValueChange={(v) => onFilterChange("facilityType", v)}>
        <SelectTrigger size="sm" className={TC}><SelectValue placeholder="시설유형" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 시설유형</SelectItem>
          {filterOptions.facilityTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.orderType ?? "all"} onValueChange={(v) => onFilterChange("orderType", v)}>
        <SelectTrigger size="sm" className={TC}><SelectValue placeholder="발주유형" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 발주유형</SelectItem>
          {filterOptions.orderTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.status ?? "all"} onValueChange={(v) => onFilterChange("status", v)}>
        <SelectTrigger size="sm" className={TC}><SelectValue placeholder="전체 상태" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="ACTIVE">진행중</SelectItem>
          <SelectItem value="PRE_START">착공전</SelectItem>
          <SelectItem value="COMPLETED">준공</SelectItem>
          <SelectItem value="SUSPENDED">중지</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="현장명 검색..."
          value={filters.search ?? ""}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="!h-9 pl-8 !text-xs !font-normal !text-muted-foreground w-full"
          size="sm"
        />
      </div>

      <RangeFilter label="공사금액" options={AMOUNT_OPTIONS} selected={amountRanges} onChange={onAmountRangesChange} />
      <RangeFilter label="공정률" options={PROGRESS_OPTIONS} selected={progressRanges} onChange={onProgressRangesChange} />
    </div>
  );
}
